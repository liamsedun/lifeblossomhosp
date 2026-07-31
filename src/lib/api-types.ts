// ============================================================================
// Database types — mirrors schema.sql exactly
// ============================================================================

export type UserRole = "patient" | "admin" | "doctor" | "nurse" | "accountant" | "super_admin";
export type AppointmentStatus = "scheduled" | "confirmed" | "in_progress" | "completed" | "cancelled" | "no_show";
export type AppointmentType = "in_person" | "video_call";
export type RecordType = "diagnosis" | "lab_result" | "prescription" | "surgery_report" | "vaccination" | "imaging";
export type PrescriptionStatus = "active" | "completed" | "cancelled";
export type MedicationRoute = "oral" | "iv" | "intramuscular" | "topical" | "sublingual" | "inhalation" | "rectal";
export type InvoiceStatus = "draft" | "pending" | "paid" | "partially_paid" | "cancelled" | "refunded";
export type PaymentMethod = "cash" | "card" | "transfer" | "insurance" | "mobile_money";
export type PaymentStatus = "pending" | "completed" | "failed" | "refunded";
export type NotificationType = "appointment_reminder" | "payment_due" | "lab_result" | "prescription_refill" | "general";
export type AuditAction = "create" | "update" | "delete" | "view" | "login" | "logout";

// --- Organization ---
export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url: string | null;
  settings: Record<string, unknown>;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

// --- User ---
export interface User {
  id: string;
  org_id: string;
  email: string;
  role: UserRole;
  first_name: string;
  last_name: string;
  phone: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_login_at: string | null;
  created_at: string;
  updated_at: string;
}

// --- Patient (extends User where role='patient') ---
export interface Patient {
  id: string;
  org_id: string;
  user_id: string;
  patient_number: string;
  date_of_birth: string | null;
  gender: string | null;
  blood_group: string | null;
  medical_plan?: string;
  address: string | null;
  city: string | null;
  state: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  insurance_provider: string | null;
  insurance_number: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

// --- Staff (extends User where role in doctor/nurse/admin/accountant) ---
export interface Staff {
  id: string;
  org_id: string;
  user_id: string;
  staff_number: string;
  specialization: string | null;
  license_number: string | null;
  department: string | null;
  is_available: boolean;
  available_from: string | null;
  available_until: string | null;
  created_at: string;
  updated_at: string;
  user?: User;
}

// --- Appointment ---
export interface Appointment {
  id: string;
  org_id: string;
  patient_id: string;
  staff_id: string;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: AppointmentStatus;
  type: AppointmentType;
  reason: string | null;
  notes: string | null;
  cancellation_reason: string | null;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  staff?: Staff;
}

// --- Medical Record ---
export interface MedicalRecord {
  id: string;
  org_id: string;
  patient_id: string;
  staff_id: string;
  appointment_id: string | null;
  record_type: RecordType;
  title: string;
  description: string | null;
  diagnosis: string | null;
  notes: string | null;
  attachments: Array<{ name: string; url: string; type: string }>;
  is_confidential: boolean;
  created_at: string;
  updated_at: string;
  patient?: Patient;
  staff?: Staff;
}

// --- Prescription ---
export interface Prescription {
  id: string;
  org_id: string;
  patient_id: string;
  doctor_id: string;
  appointment_id: string | null;
  diagnosis: string | null;
  notes: string | null;
  status: PrescriptionStatus;
  created_at: string;
  updated_at: string;
  items?: PrescriptionItem[];
  patient?: Patient;
  doctor?: Staff;
}

// --- Prescription Item ---
export interface PrescriptionItem {
  id: string;
  prescription_id: string;
  medication_name: string;
  dosage: string;
  frequency: string;
  duration: string | null;
  route: MedicationRoute;
  quantity: number | null;
  refills_remaining: number;
  instructions: string | null;
  created_at: string;
  updated_at: string;
}

// --- Invoice ---
export interface Invoice {
  id: string;
  org_id: string;
  patient_id: string;
  appointment_id: string | null;
  invoice_number: string;
  issue_date: string;
  subtotal: number;
  tax_amount: number;
  discount_amount: number;
  total_amount: number;
  paid_amount: number;
  status: InvoiceStatus;
  due_date: string | null;
  notes: string | null;
  attending_staff_id: string | null;
  attending_staff?: {
    id: string;
    first_name: string;
    last_name: string;
    role: string;
    avatar_url?: string | null;
  } | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  items?: InvoiceItem[];
  payments?: Payment[];
  patient?: Patient;
}

// --- Invoice Item ---
export interface InvoiceItem {
  id: string;
  invoice_id: string;
  description: string;
  quantity: number;
  unit_price: number;
  vat_percent: number;
  vat_amount: number;
  total_price: number;
  created_at: string;
}

// --- Payment ---
export interface Payment {
  id: string;
  org_id: string;
  invoice_id: string;
  patient_id: string;
  amount: number;
  payment_method: PaymentMethod;
  transaction_ref: string | null;
  status: PaymentStatus;
  payment_date: string;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  invoice?: Invoice;
}

// --- Notification ---
export interface Notification {
  id: string;
  org_id: string;
  user_id: string;
  type: NotificationType;
  title: string;
  message: string | null;
  is_read: boolean;
  link: string | null;
  sent_at: string;
  read_at: string | null;
}

// --- Internal Mail ---
export interface InternalMessage {
  id: string;
  org_id: string;
  sender_id: string;
  subject: string;
  body: string;
  is_broadcast: boolean;
  broadcast_scope: "staff" | "all" | null;
  created_at: string;
  sender?: User;
  recipients?: InternalMessageRecipient[];
}

export interface InternalMessageRecipient {
  id: string;
  message_id: string;
  recipient_id: string;
  is_read: boolean;
  read_at: string | null;
  created_at: string;
  recipient?: User;
}

// --- Doctor's Clinical Visit Notes ---
export interface DoctorNoteVitals {
  bp?: string;
  weight?: string;
  height?: string;
  temperature?: string;
  cholesterol?: string;
  heart_rate?: string;
  respiratory_rate?: string;
  allergies?: string;
}

export interface DoctorNoteTests {
  ecg?: string;
  xray?: string;
  blood_test?: string;
  urine_test?: string;
  saliva_test?: string;
  other_tests?: string;
}

export interface DoctorNoteDiagnosis {
  primary?: string;
  secondary?: string[];
  suspected?: string[];
}

export interface DoctorNoteMedication {
  drug_name: string;
  dosage: string;
  frequency: string;
  duration: string;
}

export interface DoctorNote {
  id: string;
  org_id: string;
  patient_id: string;
  doctor_id: string | null;
  appointment_id: string | null;
  visit_date: string;
  vitals: DoctorNoteVitals;
  tests_procedures: DoctorNoteTests;
  clinical_findings: string | null;
  diagnosis: DoctorNoteDiagnosis;
  medications: DoctorNoteMedication[];
  treatment_recommendations: string | null;
  next_visit_date: string | null;
  next_visit_reason: string | null;
  is_confidential: boolean;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  doctor?: Staff;
}

// --- Audit Log ---
export interface AuditLog {
  id: string;
  org_id: string;
  user_id: string | null;
  action: AuditAction;
  entity_type: string;
  entity_id: string | null;
  old_values: Record<string, unknown> | null;
  new_values: Record<string, unknown> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

// --- API Response envelopes ---
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  count?: number;
}

// --- Auth ---
export interface AuthResponse {
  user: User | null;
  session: unknown;
  organization?: Organization;
}
