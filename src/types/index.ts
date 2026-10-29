export type UserRole = 'admin' | 'cashier' | 'operator';

export interface User {
  id: string;
  username: string;
  fullName: string;
  role: UserRole;
  isActive?: number;
  lastLoginAt?: string;
  createdAt?: string;
}

export interface Customer {
  id: string;
  name: string;
  phone: string;
  address?: string | null;
  notes?: string | null;
  total_orders?: number;
  total_debt?: number;
  created_at: string;
  updated_at?: string;
}

export interface ServiceItem {
  id: string;
  name: string;
  unit: string;
  price_per_unit: number;
  min_units: number;
  estimated_duration_hours: number;
  description?: string | null;
  is_active: number;
}

export type OrderStatus =
  | 'received'
  | 'washing'
  | 'drying'
  | 'ironing'
  | 'packing'
  | 'ready'
  | 'picked_up'
  | 'cancelled';

export type PaymentStatus = 'unpaid' | 'down_payment' | 'paid' | 'refunded';
export type PaymentMethod = 'cash' | 'transfer' | 'qris';

export interface Order {
  id: string;
  receipt_number: string;
  customer_id: string;
  customer_name?: string;
  customer_phone?: string;
  customer_address?: string;
  cashier_id: string;
  cashier_name?: string;
  service_id: string;
  session_id?: string;
  weight_grams: number;
  service_name_snapshot: string;
  price_per_kg_snapshot: number;
  min_units_snapshot: number;
  subtotal: number;
  discount_amount: number;
  additional_fee: number;
  total_amount: number;
  paid_amount: number;
  remaining_balance: number;
  payment_status: PaymentStatus;
  status: OrderStatus;
  fragrance?: string;
  notes?: string;
  estimated_completion_at: string;
  ready_at?: string | null;
  picked_up_at?: string | null;
  picked_up_by?: string | null;
  created_at: string;
  updated_at: string;
  history?: OrderStatusHistory[];
  payments?: Payment[];
}

export interface OrderStatusHistory {
  id: string;
  order_id: string;
  user_id: string;
  user_name_snapshot: string;
  previous_status?: string | null;
  new_status: OrderStatus;
  notes?: string | null;
  created_at: string;
}

export interface Payment {
  id: string;
  order_id: string;
  cashier_id: string;
  cashier_name?: string;
  receipt_number?: string;
  customer_name?: string;
  session_id?: string | null;
  amount: number;
  payment_type: 'down_payment' | 'full_payment' | 'settlement' | 'refund';
  payment_method: PaymentMethod;
  idempotency_key?: string | null;
  reference_note?: string | null;
  created_at: string;
}

export interface CashSession {
  id: string;
  cashier_id: string;
  cashier_name?: string;
  opened_at: string;
  closed_at?: string | null;
  opening_cash: number;
  expected_cash?: number | null;
  actual_cash?: number | null;
  difference?: number | null;
  notes?: string | null;
  status: 'open' | 'closed';
  cash_in?: number;
  cash_out?: number;
}

export interface Expense {
  id: string;
  user_id: string;
  user_name?: string;
  session_id?: string | null;
  category: string;
  amount: number;
  description: string;
  created_at: string;
}

export interface AuditLog {
  id: string;
  user_id?: string | null;
  username: string;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details: Record<string, any>;
  ip_address?: string;
  created_at: string;
}

export interface BackupItem {
  id: string;
  filename: string;
  size_bytes: number;
  created_by: string;
  created_at: string;
  checksum: string;
  status: string;
}

export interface StoreSettings {
  store_name?: string;
  store_address?: string;
  store_phone?: string;
  thermal_printer_width?: '58' | '80' | string;
  receipt_prefix?: string;
  receipt_footer?: string;
  receipt_terms?: string;
  require_full_payment_on_pickup?: string;
  currency_symbol?: string;
}
