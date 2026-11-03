import { Router } from 'express';
import { db } from '../db.js';
import { authMiddleware, AuthenticatedRequest } from '../auth.js';

const router = Router();

// GET /api/reports/dashboard-stats (Role-specific live database queries)
router.get('/dashboard-stats', authMiddleware, (req: AuthenticatedRequest, res) => {
  const role = req.user?.role || 'admin';
  const today = new Date().toISOString().split('T')[0];
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  if (role === 'admin') {
    const totalServices = (db.prepare('SELECT COUNT(*) as count FROM services').get() as any).count;
    const activeServices = (db.prepare(`SELECT COUNT(*) as count FROM services WHERE status NOT IN ('Delivered', 'Cancelled', 'Returned / Not Repaired')`).get() as any).count;
    const pendingServices = (db.prepare(`SELECT COUNT(*) as count FROM services WHERE status IN ('Pending', 'Waiting for Parts', 'Waiting for Customer Approval')`).get() as any).count;
    const readyForDelivery = (db.prepare(`SELECT COUNT(*) as count FROM services WHERE status = 'Ready for Delivery'`).get() as any).count;
    const deliveredServices = (db.prepare(`SELECT COUNT(*) as count FROM services WHERE status = 'Delivered'`).get() as any).count;
    const overdueServices = (db.prepare(`SELECT COUNT(*) as count FROM services WHERE status NOT IN ('Delivered', 'Cancelled', 'Returned / Not Repaired') AND received_at <= ?`).get(thirtyDaysAgo) as any).count;
    
    const todaySchedules = (db.prepare(`SELECT COUNT(*) as count FROM service_schedules WHERE schedule_date = ? AND status != 'Cancelled'`).get(today) as any).count;
    const pendingRequests = (db.prepare(`SELECT COUNT(*) as count FROM technician_service_requests WHERE status = 'Pending Approval'`).get() as any).count;
    const pendingQuotations = (db.prepare(`SELECT COUNT(*) as count FROM quotations WHERE status IN ('Draft', 'Sent', 'Under Discussion', 'Follow-up Required')`).get() as any).count;
    const followupsDueToday = (db.prepare(`SELECT COUNT(*) as count FROM customer_followups WHERE next_follow_up_date = ? AND status != 'Completed'`).get(today) as any).count;

    // Financials
    const financialSummary = db.prepare(`
      SELECT 
        SUM(total_bill) as total_billed,
        SUM(amount_received) as total_received,
        SUM(outstanding_balance) as total_outstanding,
        SUM(parts_cost) as total_parts_cost
      FROM services
    `).get() as any;

    const tadaPending = (db.prepare(`SELECT COUNT(*) as count FROM ta_da_claims WHERE status IN ('Submitted', 'Under Review')`).get() as any).count;

    return res.json({
      role: 'admin',
      totalServices,
      activeServices,
      pendingServices,
      readyForDelivery,
      deliveredServices,
      overdueServices,
      todaySchedules,
      pendingRequests,
      pendingQuotations,
      followupsDueToday,
      totalBilled: financialSummary.total_billed || 0,
      totalReceived: financialSummary.total_received || 0,
      totalOutstanding: financialSummary.total_outstanding || 0,
      totalPartsCost: financialSummary.total_parts_cost || 0,
      tadaPending,
    });
  } else if (role === 'hr') {
    const totalStaff = (db.prepare('SELECT COUNT(*) as count FROM users WHERE is_active = 1').get() as any).count;
    const todaySchedules = db.prepare(`SELECT * FROM service_schedules WHERE schedule_date = ? ORDER BY schedule_time ASC`).all(today);
    const followupsDue = db.prepare(`SELECT * FROM customer_followups WHERE next_follow_up_date <= ? AND status != 'Completed' ORDER BY next_follow_up_date ASC`).all(today);
    const recentWorkReports = db.prepare(`SELECT * FROM technician_daily_reports ORDER BY created_at DESC LIMIT 5`).all();
    const tadaClaims = db.prepare(`SELECT * FROM ta_da_claims WHERE status = 'Approved' ORDER BY travel_date DESC LIMIT 5`).all();

    return res.json({
      role: 'hr',
      totalStaff,
      todaySchedulesCount: todaySchedules.length,
      todaySchedules,
      followupsDueCount: followupsDue.length,
      followupsDue,
      recentWorkReports,
      tadaClaims,
    });
  } else if (role === 'receptionist') {
    const recentServices = db.prepare(`SELECT * FROM services ORDER BY received_at DESC LIMIT 8`).all();
    const readyForDeliveryList = db.prepare(`SELECT * FROM services WHERE status = 'Ready for Delivery' ORDER BY updated_at DESC`).all();
    const todayVisits = db.prepare(`SELECT * FROM service_schedules WHERE schedule_date = ? ORDER BY schedule_time ASC`).all(today);
    const followupsDue = db.prepare(`SELECT * FROM customer_followups WHERE next_follow_up_date <= ? AND status != 'Completed'`).all(today);

    return res.json({
      role: 'receptionist',
      recentServices,
      readyForDeliveryList,
      todayVisits,
      followupsDue,
      pendingDeliveryCount: readyForDeliveryList.length,
    });
  } else {
    // Technician
    const myId = req.user?.id;
    const todayAssigned = db.prepare(`SELECT * FROM service_schedules WHERE assigned_technician_id = ? AND schedule_date = ? AND status != 'Cancelled'`).all(myId, today);
    const upcomingVisits = db.prepare(`SELECT * FROM service_schedules WHERE assigned_technician_id = ? AND schedule_date > ? AND status NOT IN ('Completed', 'Cancelled') ORDER BY schedule_date ASC LIMIT 5`).all(myId, today);
    const assignedServices = db.prepare(`SELECT * FROM services WHERE assigned_technician_id = ? AND status NOT IN ('Delivered', 'Cancelled', 'Returned / Not Repaired')`).all(myId);
    const myClaims = db.prepare(`SELECT * FROM ta_da_claims WHERE employee_id = ? ORDER BY travel_date DESC LIMIT 5`).all(myId);
    const myServiceRequests = db.prepare(`SELECT * FROM technician_service_requests WHERE technician_id = ? ORDER BY created_at DESC LIMIT 5`).all(myId);

    return res.json({
      role: 'technician',
      todayAssignedCount: todayAssigned.length,
      todayAssigned,
      upcomingVisits,
      assignedServicesCount: assignedServices.length,
      assignedServices,
      myClaims,
      myServiceRequests,
    });
  }
});

// GET /api/reports/financial (Full date-range filtered financial breakdown)
router.get('/financial', authMiddleware, (req: AuthenticatedRequest, res) => {
  if (req.user?.role !== 'admin' && req.user?.role !== 'hr') {
    return res.status(403).json({ error: 'Financial reports are restricted to authorized administrative personnel.' });
  }

  const { startDate, endDate } = req.query;

  let serviceFilter = '1=1';
  let tadaFilter = '1=1';
  let ledgerFilter = '1=1';
  const serviceParams: any[] = [];
  const tadaParams: any[] = [];
  const ledgerParams: any[] = [];

  if (startDate) {
    serviceFilter += ' AND date(received_at) >= date(?)';
    serviceParams.push(startDate);
    tadaFilter += ' AND date(travel_date) >= date(?)';
    tadaParams.push(startDate);
    ledgerFilter += ' AND date(transaction_date) >= date(?)';
    ledgerParams.push(startDate);
  }

  if (endDate) {
    serviceFilter += ' AND date(received_at) <= date(?)';
    serviceParams.push(endDate);
    tadaFilter += ' AND date(travel_date) <= date(?)';
    tadaParams.push(endDate);
    ledgerFilter += ' AND date(transaction_date) <= date(?)';
    ledgerParams.push(endDate);
  }

  // Billed service amount & parts costs
  const serviceTotals = db.prepare(`
    SELECT 
      COUNT(*) as total_count,
      SUM(total_bill) as billed_revenue,
      SUM(amount_received) as service_cash_received,
      SUM(outstanding_balance) as outstanding_receivables,
      SUM(parts_cost) as total_parts_cost,
      SUM(labor_charge) as total_labor_charge,
      SUM(discount) as total_discount,
      SUM(vat_amount) as total_vat
    FROM services 
    WHERE ${serviceFilter}
  `).get(...serviceParams) as any;

  // Actual ledger payments collected across all categories (Cash, Bank, bKash, etc.)
  const paymentBreakdown = db.prepare(`
    SELECT 
      COALESCE(payment_method, 'Cash') as method,
      SUM(credit) as collected_amount
    FROM customer_ledgers
    WHERE reference_type = 'PAYMENT' AND ${ledgerFilter}
    GROUP BY payment_method
  `).all(...ledgerParams) as any[];

  const totalCollectedCash = paymentBreakdown.reduce((acc, row) => acc + (row.collected_amount || 0), 0);

  // TA/DA expenses disbursed
  const tadaTotals = db.prepare(`
    SELECT 
      SUM(CASE WHEN status = 'Paid' THEN total_amount ELSE 0 END) as total_paid_tada,
      SUM(CASE WHEN status = 'Approved' THEN total_amount ELSE 0 END) as total_approved_tada,
      SUM(total_amount) as total_claimed_tada
    FROM ta_da_claims
    WHERE ${tadaFilter}
  `).get(...tadaParams) as any;

  const billedRevenue = serviceTotals.billed_revenue || 0;
  const partsCost = serviceTotals.total_parts_cost || 0;
  const tadaExpense = tadaTotals.total_paid_tada || 0;
  
  // Gross Profit = Billed Revenue - Parts Cost
  const grossProfit = Math.max(0, billedRevenue - partsCost);
  // Net Profit = Gross Profit - TA/DA - other expenses
  const netProfit = grossProfit - tadaExpense;

  return res.json({
    summary: {
      billedRevenue,
      actualPaymentsCollected: totalCollectedCash,
      outstandingReceivables: serviceTotals.outstanding_receivables || 0,
      partsCost,
      laborCharge: serviceTotals.total_labor_charge || 0,
      discountsGiven: serviceTotals.total_discount || 0,
      vatCollected: serviceTotals.total_vat || 0,
      tadaExpensePaid: tadaExpense,
      tadaApprovedPendingPayment: (tadaTotals.total_approved_tada || 0) - tadaExpense,
      grossProfit,
      netProfit,
    },
    paymentMethods: paymentBreakdown,
    dateRange: {
      startDate: startDate || 'All Time',
      endDate: endDate || 'Current Date',
    },
  });
});

// GET /api/reports/services-summary
router.get('/services-summary', authMiddleware, (req: AuthenticatedRequest, res) => {
  const { startDate, endDate } = req.query;

  let filter = '1=1';
  const params: any[] = [];

  if (startDate) {
    filter += ' AND date(received_at) >= date(?)';
    params.push(startDate);
  }
  if (endDate) {
    filter += ' AND date(received_at) <= date(?)';
    params.push(endDate);
  }

  const statusBreakdown = db.prepare(`
    SELECT status, COUNT(*) as count, SUM(total_bill) as total_bill, SUM(amount_received) as received
    FROM services
    WHERE ${filter}
    GROUP BY status
  `).all(...params);

  const categoryBreakdown = db.prepare(`
    SELECT product_category, COUNT(*) as count, SUM(total_bill) as total_bill
    FROM services
    WHERE ${filter}
    GROUP BY product_category
  `).all(...params);

  const technicianBreakdown = db.prepare(`
    SELECT assigned_technician_name, COUNT(*) as jobs_count, SUM(total_bill) as total_bill
    FROM services
    WHERE assigned_technician_name IS NOT NULL AND ${filter}
    GROUP BY assigned_technician_name
  `).all(...params);

  return res.json({
    byStatus: statusBreakdown,
    byCategory: categoryBreakdown,
    byTechnician: technicianBreakdown,
  });
});

export default router;
