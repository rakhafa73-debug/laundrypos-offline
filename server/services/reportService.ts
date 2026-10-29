import { db } from '../db/database.ts';

export function getDashboardMetrics() {
  const today = new Date().toISOString().slice(0, 10);

  // Today's total order value
  const todayOrders = db.prepare(`
    SELECT 
      COALESCE(COUNT(*), 0) as count,
      COALESCE(SUM(total_amount), 0) as total_order_value,
      COALESCE(SUM(weight_grams), 0) as total_weight_grams
    FROM orders
    WHERE created_at LIKE ? AND status != 'cancelled'
  `).get(`${today}%`) as any;

  // Today's payments actually received
  const todayPayments = db.prepare(`
    SELECT 
      COALESCE(SUM(amount), 0) as total_collected,
      COALESCE(COUNT(*), 0) as payment_count
    FROM payments
    WHERE created_at LIKE ? AND amount > 0
  `).get(`${today}%`) as any;

  // Active orders (not finished / not cancelled)
  const activeOrders = db.prepare(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE status NOT IN ('picked_up', 'cancelled')
  `).get() as { count: number };

  // Ready for pickup
  const readyOrders = db.prepare(`
    SELECT COUNT(*) as count
    FROM orders
    WHERE status = 'ready'
  `).get() as { count: number };

  // Total unpaid receivables (piutang usaha berjalan)
  const totalReceivables = db.prepare(`
    SELECT COALESCE(SUM(remaining_balance), 0) as total_piutang
    FROM orders
    WHERE status != 'cancelled' AND remaining_balance > 0
  `).get() as { total_piutang: number };

  // Today's operational expenses
  const todayExpenses = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total_expenses
    FROM expenses
    WHERE created_at LIKE ?
  `).get(`${today}%`) as { total_expenses: number };

  // Status distribution
  const statusDistribution = db.prepare(`
    SELECT status, COUNT(*) as count
    FROM orders
    WHERE status != 'cancelled'
    GROUP BY status
  `).all();

  // Recent 10 orders
  const recentOrders = db.prepare(`
    SELECT o.id, o.receipt_number, c.name as customer_name, o.service_name_snapshot,
           o.weight_grams, o.total_amount, o.paid_amount, o.remaining_balance,
           o.status, o.payment_status, o.created_at
    FROM orders o
    JOIN customers c ON o.customer_id = c.id
    ORDER BY o.created_at DESC LIMIT 8
  `).all();

  // Recent audit logs
  const recentAudit = db.prepare(`
    SELECT id, username, action, entity_type, details, created_at
    FROM audit_logs
    ORDER BY created_at DESC LIMIT 6
  `).all();

  return {
    today: {
      orderCount: todayOrders.count,
      totalOrderValue: todayOrders.total_order_value,
      totalWeightGrams: todayOrders.total_weight_grams,
      paymentsCollected: todayPayments.total_collected,
      expenses: todayExpenses.total_expenses,
      netCashToday: todayPayments.total_collected - todayExpenses.total_expenses
    },
    activeOrdersCount: activeOrders.count,
    readyCount: readyOrders.count,
    totalReceivables: totalReceivables.total_piutang,
    statusDistribution,
    recentOrders,
    recentAudit
  };
}

export function getDetailedReport(startDate?: string, endDate?: string) {
  const start = startDate ? `${startDate}T00:00:00.000Z` : '1970-01-01T00:00:00.000Z';
  const end = endDate ? `${endDate}T23:59:59.999Z` : '2099-12-31T23:59:59.999Z';

  // Orders summary
  const orderStats = db.prepare(`
    SELECT 
      COUNT(*) as total_orders,
      COALESCE(SUM(total_amount), 0) as gross_revenue,
      COALESCE(SUM(discount_amount), 0) as total_discounts,
      COALESCE(SUM(paid_amount), 0) as total_paid,
      COALESCE(SUM(remaining_balance), 0) as total_unpaid,
      COALESCE(SUM(weight_grams), 0) as total_grams
    FROM orders
    WHERE created_at BETWEEN ? AND ? AND status != 'cancelled'
  `).get(start, end) as any;

  // Payments by method
  const paymentsByMethod = db.prepare(`
    SELECT payment_method, COUNT(*) as count, SUM(amount) as total
    FROM payments
    WHERE created_at BETWEEN ? AND ? AND amount > 0
    GROUP BY payment_method
  `).all(start, end);

  // Expenses summary
  const expenses = db.prepare(`
    SELECT category, COUNT(*) as count, SUM(amount) as total
    FROM expenses
    WHERE created_at BETWEEN ? AND ?
    GROUP BY category
  `).all(start, end);

  const totalExpenses = expenses.reduce((sum: number, e: any) => sum + (e.total || 0), 0);

  // Top services
  const topServices = db.prepare(`
    SELECT service_name_snapshot as service_name, 
           COUNT(*) as order_count,
           SUM(weight_grams) as total_grams,
           SUM(total_amount) as total_revenue
    FROM orders
    WHERE created_at BETWEEN ? AND ? AND status != 'cancelled'
    GROUP BY service_name_snapshot
    ORDER BY total_revenue DESC
  `).all(start, end);

  // Cashier performance
  const cashierStats = db.prepare(`
    SELECT u.full_name as cashier_name,
           COUNT(o.id) as total_orders_handled,
           COALESCE(SUM(o.total_amount), 0) as total_generated
    FROM users u
    LEFT JOIN orders o ON o.cashier_id = u.id AND o.created_at BETWEEN ? AND ? AND o.status != 'cancelled'
    WHERE u.role IN ('admin', 'cashier')
    GROUP BY u.id
    ORDER BY total_generated DESC
  `).all(start, end);

  return {
    summary: {
      ...orderStats,
      totalExpenses,
      netProfit: (orderStats?.gross_revenue || 0) - totalExpenses
    },
    paymentsByMethod,
    expenses,
    topServices,
    cashierStats
  };
}
