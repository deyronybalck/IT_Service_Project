import React, { useState, useEffect } from 'react';
import { 
  Settings as SettingsIcon, 
  Send, 
  CheckCircle, 
  AlertTriangle, 
  RefreshCw, 
  Key, 
  Building, 
  Mail, 
  MessageSquare,
  ShieldCheck,
  Save,
  HelpCircle
} from 'lucide-react';
import { api } from '../../services/api.ts';
import { useAuth } from '../../context/AuthContext.tsx';

export const SettingsView: React.FC = () => {
  const { user } = useAuth();
  const [settings, setSettings] = useState<any>({});
  const [whatsappLogs, setWhatsappLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Manual Trigger Simulation
  const [runningSweep, setRunningSweep] = useState(false);
  const [sweepResult, setSweepResult] = useState<any>(null);

  const loadSettingsAndLogs = async () => {
    setLoading(true);
    try {
      const [sData, wLogs] = await Promise.all([
        api.getSettings(),
        api.getWhatsAppLogs(),
      ]);
      setSettings(sData);
      setWhatsappLogs(wLogs);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettingsAndLogs();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await api.updateSettings(settings);
      setSaveMessage('System settings updated successfully.');
      setTimeout(() => setSaveMessage(null), 3000);
      loadSettingsAndLogs();
    } catch (err: any) {
      alert(`Error saving settings: ${err.message}`);
    } finally {
      setSaving(false);
    }
  };

  const handleTriggerSweep = async (forceSimulate: boolean) => {
    setRunningSweep(true);
    setSweepResult(null);
    try {
      const res = await api.triggerWhatsAppReminders(forceSimulate);
      setSweepResult(res);
      loadSettingsAndLogs();
    } catch (err: any) {
      alert(`Error running sweep: ${err.message}`);
    } finally {
      setRunningSweep(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-xl font-bold text-slate-900">System Settings & WhatsApp Automation</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Company identity, VAT baseline, Meta WhatsApp Business Cloud API integration, and 30-Day Reminder automated sweep.
        </p>
      </div>

      {saveMessage && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs font-semibold flex items-center space-x-2">
          <CheckCircle className="w-4 h-4 text-emerald-600" />
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Form */}
      <form onSubmit={handleSave} className="space-y-6 text-xs">
        {/* Company Profile Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Building className="w-4 h-4 text-blue-600" />
            <h3 className="font-bold text-sm text-slate-900">Company Legal Profile & Receipt Header</h3>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium text-slate-600">Company Official Name</label>
              <input
                type="text"
                value={settings.company_name || ''}
                onChange={(e) => setSettings({ ...settings, company_name: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-semibold"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600">Contact Hotline Numbers</label>
              <input
                type="text"
                value={settings.company_phone || ''}
                onChange={(e) => setSettings({ ...settings, company_phone: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-600">Office Registered Address</label>
            <input
              type="text"
              value={settings.company_address || ''}
              onChange={(e) => setSettings({ ...settings, company_address: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium text-slate-600">Support Email</label>
              <input
                type="email"
                value={settings.company_email || ''}
                onChange={(e) => setSettings({ ...settings, company_email: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600">Default Baseline VAT (%)</label>
              <input
                type="number"
                value={settings.default_vat_percent || '5'}
                onChange={(e) => setSettings({ ...settings, default_vat_percent: e.target.value })}
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg"
              />
            </div>
          </div>

          <div>
            <label className="text-[11px] font-medium text-slate-600">Default Terms & Conditions (Shown on receipts & quotations)</label>
            <textarea
              rows={3}
              value={settings.terms_conditions || ''}
              onChange={(e) => setSettings({ ...settings, terms_conditions: e.target.value })}
              className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg leading-relaxed"
            />
          </div>
        </div>

        {/* WhatsApp Business API Integration Section */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center space-x-2">
              <MessageSquare className="w-4 h-4 text-emerald-600" />
              <h3 className="font-bold text-sm text-slate-900">Meta WhatsApp Business Cloud API (30-Day Reminder)</h3>
            </div>
            <div className="flex items-center space-x-2">
              <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                settings.whatsapp_phone_number_id ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
              }`}>
                {settings.whatsapp_phone_number_id ? 'API Keys Provided' : 'Test Mode / Unconfigured'}
              </span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 text-slate-700 text-xs leading-relaxed space-y-1">
            <div className="font-bold text-slate-900">Meta WhatsApp Cloud API Instructions:</div>
            <p>
              1. To send real WhatsApp messages to customers, configure your Meta Developer App and WhatsApp Business Phone Number ID.
            </p>
            <p>
              2. If credentials are not provided, all 30-day automated reminders will be queued safely in the follow-up log below for manual staff outreach.
            </p>
            <p>
              3. You can click <strong>"Execute 30-Day Sweep (Test Simulator)"</strong> at any time to test the automated reminder engine.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-[11px] font-medium text-slate-600">WhatsApp Phone Number ID</label>
              <input
                type="text"
                value={settings.whatsapp_phone_number_id || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_phone_number_id: e.target.value })}
                placeholder="e.g. 102938475610293"
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
            <div>
              <label className="text-[11px] font-medium text-slate-600">Meta Permanent Access Token</label>
              <input
                type="password"
                value={settings.whatsapp_access_token || ''}
                onChange={(e) => setSettings({ ...settings, whatsapp_access_token: e.target.value })}
                placeholder="EAA..."
                className="w-full mt-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg font-mono"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={settings.whatsapp_enabled === '1'}
                onChange={(e) => setSettings({ ...settings, whatsapp_enabled: e.target.checked ? '1' : '0' })}
                className="rounded text-blue-600"
              />
              <span className="font-semibold text-slate-800">
                Enable Automated Background Scheduler (Runs every 2 hours)
              </span>
            </label>

            <button
              type="button"
              onClick={() => handleTriggerSweep(true)}
              disabled={runningSweep}
              className="flex items-center space-x-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-semibold text-xs transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{runningSweep ? 'Processing Sweep...' : 'Execute 30-Day Sweep (Test Simulator)'}</span>
            </button>
          </div>

          {sweepResult && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl text-blue-900 text-xs">
              <div className="font-bold">{sweepResult.message}</div>
              <div className="text-[11px] text-blue-800 mt-1">
                Processed Items: {JSON.stringify(sweepResult.result?.details || [])}
              </div>
            </div>
          )}
        </div>

        {/* Transactional Email (SMTP) Setup Guide */}
        <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-3">
          <div className="flex items-center space-x-2 border-b border-slate-100 pb-3">
            <Mail className="w-4 h-4 text-purple-600" />
            <h3 className="font-bold text-sm text-slate-900">Email Verification & Password Reset Setup Guide</h3>
          </div>

          <p className="text-slate-600 text-xs leading-relaxed">
            For production email dispatch, configure standard transactional SMTP credentials in your hosting environment variables:
          </p>

          <div className="bg-slate-900 text-slate-100 p-3 rounded-xl font-mono text-[11px] space-y-1">
            <div>SMTP_HOST="smtp.mailgun.org" (or smtp.sendgrid.net / Amazon SES)</div>
            <div>SMTP_PORT="587"</div>
            <div>SMTP_USER="postmaster@yourdomain.com"</div>
            <div>SMTP_PASS="your_smtp_password"</div>
            <div>SMTP_FROM="IT Lab Solutions &lt;support@itlabsolutions.com&gt;"</div>
          </div>

          <p className="text-[11px] text-slate-500">
            Note: In this development environment, expiring verification tokens and password reset links are automatically captured in the <strong>"Transactional Email & Token Dispatcher"</strong> modal accessible from the top navbar.
          </p>
        </div>

        <div className="flex justify-end">
          <button
            type="submit"
            disabled={saving}
            className="flex items-center space-x-1.5 px-6 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl font-bold shadow-md transition disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>{saving ? 'Saving...' : 'Save All System Settings'}</span>
          </button>
        </div>
      </form>

      {/* WhatsApp Delivery Queue & Logs */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-sm text-slate-900">WhatsApp Notification Dispatch Queue & Audit Log</h3>
          <button onClick={loadSettingsAndLogs} className="text-xs text-blue-600 hover:underline">
            Refresh Queue
          </button>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 uppercase text-[9px] border-b border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Log ID</th>
                <th className="py-2.5 px-4">Recipient</th>
                <th className="py-2.5 px-4">Service ID</th>
                <th className="py-2.5 px-4">Message Preview</th>
                <th className="py-2.5 px-4">Delivery Status</th>
                <th className="py-2.5 px-4 text-right">Timestamp</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-sans text-xs">
              {whatsappLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-4 text-center text-slate-400">No WhatsApp messages dispatched yet.</td>
                </tr>
              ) : (
                whatsappLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2.5 px-4 font-mono text-slate-500 text-[10px]">{log.id}</td>
                    <td className="py-2.5 px-4">
                      <div className="font-semibold text-slate-900">{log.customer_name}</div>
                      <div className="text-[10px] text-slate-500 font-mono">{log.phone}</div>
                    </td>
                    <td className="py-2.5 px-4 font-mono font-bold text-blue-700">{log.service_id || '—'}</td>
                    <td className="py-2.5 px-4 max-w-sm truncate text-slate-600 text-[11px]" title={log.message}>
                      {log.message}
                    </td>
                    <td className="py-2.5 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.status === 'sent'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.status === 'simulated_sent'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {log.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 text-right text-slate-400 font-mono text-[10px]">
                      {new Date(log.created_at).toLocaleTimeString()}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
