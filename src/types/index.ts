export type UserRole = 'admin' | 'hr' | 'receptionist' | 'technician';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  phone?: string;
  is_active?: number;
  email_verified: number;
}

export interface Customer {
  id: string;
  name: string;
  type: 'individual' | 'institution' | 'corporate';
  contact_person?: string;
  phone: string;
  whatsapp?: string;
  email?: string;
  address: string;
  notes?: string;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
}

export interface Product {
  id: string;
  name: string;
  category: string;
  brand: string;
  model?: string;
  description?: string;
  unit: string;
  purchase_price?: number; // Only visible to admin
  selling_price: number;
  vat_percent: number;
  tax_percent: number;
  warranty_period: string;
  status: 'active' | 'discontinued';
  stock_quantity: number;
}

export type ServiceStatus =
  | 'Received'
  | 'Under Inspection'
  | 'Waiting for Customer Approval'
  | 'In Progress'
  | 'Waiting for Parts'
  | 'Pending'
  | 'Ready for Delivery'
  | 'Delivered'
  | 'Returned / Not Repaired'
  | 'Cancelled';

export interface ServicePart {
  id: string;
  service_id: string;
  product_id?: string;
  product_name: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  total_price: number;
}

export interface ServiceStatusHistory {
  id: string;
  service_id: string;
  status: ServiceStatus;
  notes?: string;
  updated_by: string;
  created_at: string;
}

export interface Service {
  id: string;
  customer_id: string;
  customer_name: string;
  phone: string;
  whatsapp?: string;
  address: string;
  product_category: string;
  brand: string;
  model: string;
  serial_number?: string;
  accessories?: string;
  reported_problems: string;
  physical_condition?: string;
  received_at: string;
  received_by: string;
  estimated_delivery_date?: string;
  estimated_cost: number;
  status: ServiceStatus;
  assigned_technician_id?: string;
  assigned_technician_name?: string;
  inspection_date?: string;
  problems_identified?: string;
  work_required?: string;
  work_completed?: string;
  parts_cost: number;
  labor_charge: number;
  discount: number;
  vat_amount: number;
  total_bill: number;
  amount_received: number;
  outstanding_balance: number;
  customer_approval_status?: 'Pending' | 'Approved' | 'Declined';
  customer_feedback?: string;
  actual_delivery_date?: string;
  delivered_by?: string;
  handover_person_name?: string;
  handover_person_phone?: string;
  return_reason?: string;
  additional_remarks?: string;
  last_reminder_sent_at?: string;
  reminder_count: number;
  created_at: string;
  updated_at: string;
  parts?: ServicePart[];
  history?: ServiceStatusHistory[];
}

export type ScheduleStatus =
  | 'New Request'
  | 'Awaiting Approval'
  | 'Approved'
  | 'Scheduled'
  | 'Assigned'
  | 'In Progress'
  | 'Completed'
  | 'Pending'
  | 'Rescheduled'
  | 'Cancelled';

export interface ServiceSchedule {
  id: string;
  customer_id?: string;
  customer_name: string;
  customer_type?: string;
  location_address: string;
  contact_person: string;
  contact_phone: string;
  service_category: string;
  problem_description: string;
  assigned_technician_id?: string;
  assigned_technician_name?: string;
  schedule_date: string;
  schedule_time?: string;
  priority: 'Low' | 'Normal' | 'High' | 'Urgent';
  admin_instructions?: string;
  expected_duration?: string;
  status: ScheduleStatus;
  created_by: string;
  created_at: string;
  reports?: TechnicianDailyReport[];
}

export interface TechnicianDailyReport {
  id: string;
  schedule_id: string;
  technician_id: string;
  technician_name: string;
  customer_name: string;
  service_location: string;
  arrival_time?: string;
  departure_time?: string;
  work_performed: string;
  problems_found?: string;
  work_completed: string;
  parts_used_json?: string;
  service_charge: number;
  amount_collected: number;
  outstanding_amount: number;
  handover_person_name?: string;
  handover_person_phone?: string;
  customer_feedback?: string;
  follow_up_required: number;
  recommended_next_visit?: string;
  remarks?: string;
  status: 'Draft' | 'Submitted';
  created_at: string;
}

export interface TechnicianServiceRequest {
  id: string;
  technician_id: string;
  technician_name: string;
  institution_name: string;
  contact_person: string;
  phone: string;
  address: string;
  problem_details: string;
  service_required: string;
  urgency: 'Low' | 'Normal' | 'High' | 'Urgent';
  technician_remarks?: string;
  admin_remarks?: string;
  status: 'Pending Approval' | 'Approved' | 'Rejected';
  scheduled_id?: string;
  created_at: string;
}

export interface FreeLabService {
  id: string;
  institution_name: string;
  customer_id?: string;
  visit_date: string;
  technician_id: string;
  technician_name: string;
  total_computers: number;
  working_computers: number;
  non_working_computers: number;
  problems_found?: string;
  work_completed: string;
  required_parts?: string;
  lab_condition?: string;
  next_visit_recommendation?: string;
  photo_notes?: string;
  remarks?: string;
  created_at: string;
}

export type QuotationStatus =
  | 'Draft'
  | 'Sent'
  | 'Follow-up Required'
  | 'Under Discussion'
  | 'Approved'
  | 'Rejected'
  | 'Expired'
  | 'Completed / Won'
  | 'Closed / Lost';

export interface QuotationItem {
  id?: string;
  quotation_id?: string;
  product_id?: string;
  product_name: string;
  description?: string;
  quantity: number;
  unit_price: number;
  discount: number;
  vat_percent: number;
  tax_percent: number;
  warranty_period: string;
  total_price: number;
}

export interface Quotation {
  id: string;
  customer_id?: string;
  customer_name: string;
  contact_person?: string;
  phone: string;
  address?: string;
  quotation_date: string;
  valid_until: string;
  prepared_by: string;
  subtotal: number;
  discount_type: 'fixed' | 'percent';
  discount_value: number;
  total_discount: number;
  vat_rate: number;
  vat_type: 'inclusive' | 'exclusive';
  vat_amount: number;
  tax_rate: number;
  tax_amount: number;
  grand_total: number;
  terms_and_conditions?: string;
  delivery_time?: string;
  payment_terms?: string;
  status: QuotationStatus;
  rejection_reason?: string;
  converted_to_order_id?: string;
  items?: QuotationItem[];
  created_at: string;
}

export interface CustomerLedgerEntry {
  id: string;
  customer_id: string;
  transaction_date: string;
  reference_type: string;
  reference_id?: string;
  description: string;
  debit: number;
  credit: number;
  running_balance: number;
  payment_method?: string;
  recorded_by: string;
  created_at: string;
}

export interface TADAClaim {
  id: string;
  employee_id: string;
  employee_name: string;
  schedule_id?: string;
  customer_or_institution: string;
  travel_date: string;
  from_location: string;
  to_location: string;
  transport_expense: number;
  food_allowance: number;
  daily_allowance: number;
  other_expense: number;
  total_amount: number;
  explanation?: string;
  attachment_name?: string;
  status: 'Draft' | 'Submitted' | 'Under Review' | 'Approved' | 'Rejected' | 'Paid';
  review_remarks?: string;
  reviewed_by?: string;
  paid_at?: string;
  paid_by?: string;
  created_at: string;
}

export interface CustomerFollowup {
  id: string;
  customer_id?: string;
  customer_name: string;
  related_type: string;
  related_id?: string;
  contact_method: string;
  follow_up_date: string;
  employee_id: string;
  employee_name: string;
  customer_response?: string;
  notes: string;
  next_follow_up_date?: string;
  status: 'Pending' | 'Completed' | 'Rescheduled' | 'Cancelled';
  created_at: string;
}

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: number;
  created_at: string;
}

export interface ActivityLogItem {
  id: string;
  user_id: string;
  user_name: string;
  user_role: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  ip_address: string;
  created_at: string;
}
