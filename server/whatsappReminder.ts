import { db } from './db.js';
import { sendInAppNotification } from './auth.js';

export async function checkAndSend30DayReminders(forceSimulation: boolean = false) {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
    
    // Find undelivered services received 30 or more days ago
    const overdueServices = db.prepare(`
      SELECT s.*, c.name as customer_name_full, c.phone as cust_phone, c.whatsapp as cust_whatsapp
      FROM services s
      LEFT JOIN customers c ON s.customer_id = c.id
      WHERE s.status NOT IN ('Delivered', 'Cancelled', 'Returned / Not Repaired')
      AND s.received_at <= ?
    `).all(thirtyDaysAgo) as any[];

    if (!overdueServices || overdueServices.length === 0) {
      return { count: 0, messages: [] };
    }

    const phoneIdSetting = db.prepare(`SELECT value FROM system_settings WHERE key = 'whatsapp_phone_number_id'`).get() as any;
    const accessTokenSetting = db.prepare(`SELECT value FROM system_settings WHERE key = 'whatsapp_access_token'`).get() as any;
    const whatsappEnabledSetting = db.prepare(`SELECT value FROM system_settings WHERE key = 'whatsapp_enabled'`).get() as any;

    const phoneId = process.env.WHATSAPP_PHONE_NUMBER_ID || phoneIdSetting?.value || '';
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN || accessTokenSetting?.value || '';
    const isEnabled = whatsappEnabledSetting?.value === '1' || forceSimulation;

    const results: any[] = [];

    for (const service of overdueServices) {
      // Check duplicate reminder rule: do not resend within last 7 days
      if (service.last_reminder_sent_at) {
        const lastSent = new Date(service.last_reminder_sent_at).getTime();
        const daysSinceLastReminder = (Date.now() - lastSent) / (1000 * 60 * 60 * 24);
        if (daysSinceLastReminder < 7 && !forceSimulation) {
          continue;
        }
      }

      const targetPhone = service.whatsapp || service.phone || service.cust_whatsapp || service.cust_phone;
      if (!targetPhone) continue;

      const customerName = service.customer_name || service.customer_name_full || 'Valued Customer';
      const cleanPhone = targetPhone.replace(/[^0-9]/g, '');

      const reminderMessage = `Dear ${customerName},\n\nYour service item (${service.product_category} ${service.brand} ${service.model}, Service ID: ${service.id}) has been at our workshop for over 30 days since ${service.received_at.split('T')[0]}.\n\nCurrent Status: ${service.status}\nOutstanding Balance: BDT ${service.outstanding_balance.toLocaleString()}\n\nPlease collect your product from IT Lab Solutions Limited at your earliest convenience. For queries, call +880 1711 000001.`;

      const logId = `WA-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      const now = new Date().toISOString();

      if (phoneId && accessToken && isEnabled) {
        // Real Meta WhatsApp Business Cloud API Call
        try {
          const response = await fetch(`https://graph.facebook.com/v21.0/${phoneId}/messages`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${accessToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              messaging_product: 'whatsapp',
              to: cleanPhone.startsWith('880') ? cleanPhone : `880${cleanPhone.replace(/^0+/, '')}`,
              type: 'text',
              text: { body: reminderMessage },
            }),
          });

          const resData = await response.json();
          if (response.ok) {
            db.prepare(`
              INSERT INTO whatsapp_logs (id, service_id, phone, customer_name, message, status, sent_at, created_at)
              VALUES (?, ?, ?, ?, ?, 'sent', ?, ?)
            `).run(logId, service.id, targetPhone, customerName, reminderMessage, now, now);

            db.prepare(`
              UPDATE services 
              SET last_reminder_sent_at = ?, reminder_count = reminder_count + 1
              WHERE id = ?
            `).run(now, service.id);

            results.push({ id: service.id, status: 'sent', phone: targetPhone });
          } else {
            db.prepare(`
              INSERT INTO whatsapp_logs (id, service_id, phone, customer_name, message, status, error_message, created_at)
              VALUES (?, ?, ?, ?, ?, 'failed', ?, ?)
            `).run(logId, service.id, targetPhone, customerName, reminderMessage, JSON.stringify(resData), now);

            results.push({ id: service.id, status: 'failed', error: resData });
          }
        } catch (apiErr: any) {
          db.prepare(`
            INSERT INTO whatsapp_logs (id, service_id, phone, customer_name, message, status, error_message, created_at)
            VALUES (?, ?, ?, ?, ?, 'failed', ?, ?)
          `).run(logId, service.id, targetPhone, customerName, reminderMessage, apiErr.message, now);
        }
      } else {
        // Simulated / Stored in Admin Follow-up Queue with Test Dispatch indicator
        const simStatus = forceSimulation ? 'simulated_sent' : 'queued_unconfigured';
        db.prepare(`
          INSERT INTO whatsapp_logs (id, service_id, phone, customer_name, message, status, error_message, sent_at, created_at)
          VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          logId,
          service.id,
          targetPhone,
          customerName,
          reminderMessage,
          simStatus,
          phoneId ? null : 'WhatsApp Cloud API credentials not configured. Queued for manual staff follow-up or test simulation.',
          forceSimulation ? now : null,
          now
        );

        if (forceSimulation) {
          db.prepare(`
            UPDATE services 
            SET last_reminder_sent_at = ?, reminder_count = reminder_count + 1
            WHERE id = ?
          `).run(now, service.id);
        }

        results.push({
          id: service.id,
          status: simStatus,
          phone: targetPhone,
          note: phoneId ? 'Triggered' : 'Meta API keys not configured. Saved in follow-up queue.',
        });
      }

      // Notify Admin
      sendInAppNotification(
        'ALL_ADMIN',
        '30-Day Product Storage Reminder',
        `Automated reminder queued/processed for ${customerName} (${service.id}) - 30+ days in workshop.`,
        'reminder',
        `/services?search=${service.id}`
      );
    }

    return { count: results.length, details: results };
  } catch (error) {
    console.error('Error running 30-day reminder job:', error);
    return { count: 0, error: String(error) };
  }
}

export function startWhatsAppReminderScheduler() {
  // Run on startup after 10 seconds
  setTimeout(() => {
    checkAndSend30DayReminders().catch(console.error);
  }, 10000);

  // Run every 2 hours
  setInterval(() => {
    checkAndSend30DayReminders().catch(console.error);
  }, 2 * 60 * 60 * 1000);
}
