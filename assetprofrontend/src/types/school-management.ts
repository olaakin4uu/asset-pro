// ============================================================================
// ENUMS
// ============================================================================

export type SessionStatus = 'UPCOMING' | 'CURRENT' | 'COMPLETED';
export type TermStatus = 'UPCOMING' | 'CURRENT' | 'COMPLETED';
export type ClassCategory = 'NURSERY' | 'PRIMARY' | 'JUNIOR_SECONDARY' | 'SENIOR_SECONDARY';
export type SubjectType = 'CORE' | 'ELECTIVE' | 'VOCATIONAL';
export type Gender = 'MALE' | 'FEMALE';
export type BloodGroup = 'A_POS' | 'A_NEG' | 'B_POS' | 'B_NEG' | 'AB_POS' | 'AB_NEG' | 'O_POS' | 'O_NEG';
export type Genotype = 'AA' | 'AS' | 'SS' | 'AC' | 'SC';
export type StudentCategory = 'DAY' | 'BOARDER';
export type SpecialCategory = 'SCHOLARSHIP' | 'STAFF_WARD' | 'SPECIAL_NEEDS';
export type StudentStatus = 'APPLICANT' | 'ADMITTED' | 'ACTIVE' | 'SUSPENDED' | 'WITHDRAWN' | 'GRADUATED' | 'EXPELLED';
export type GuardianRelationship = 'FATHER' | 'MOTHER' | 'GUARDIAN' | 'SPONSOR' | 'UNCLE' | 'AUNT' | 'SIBLING' | 'OTHER';
export type EnrolmentStatus = 'ACTIVE' | 'PROMOTED' | 'REPEATED' | 'TRANSFERRED' | 'WITHDRAWN';
export type DocumentType = 'BIRTH_CERTIFICATE' | 'IMMUNIZATION' | 'PREVIOUS_RESULT' | 'PASSPORT_PHOTO' | 'TRANSFER_CERT' | 'ID_CARD' | 'OTHER';
export type StaffType = 'TEACHING' | 'NON_TEACHING' | 'ADMIN';

// ============================================================================
// INTERFACES
// ============================================================================

export interface AcademicSession {
  id: number;
  name: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
  status: SessionStatus;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  terms?: Term[];
}

export interface Term {
  id: number;
  sessionId: number;
  name: string;
  termNumber: number;
  startDate: string;
  endDate: string;
  midTermBreakStart: string | null;
  midTermBreakEnd: string | null;
  nextTermResumptionDate: string | null;
  isCurrent: boolean;
  status: TermStatus;
  schoolDays: number | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClassLevel {
  id: number;
  name: string;
  code: string;
  category: ClassCategory;
  sortOrder: number;
  classTeacherId: number | null;
  companyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  sections?: ClassSection[];
}

export interface ClassSection {
  id: number;
  classLevelId: number;
  name: string;
  capacity: number;
  classTeacherId: number | null;
  roomNumber: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Subject {
  id: number;
  name: string;
  code: string;
  subjectType: SubjectType;
  department: string | null;
  creditHours: number | null;
  description: string | null;
  companyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ClassSubject {
  id: number;
  classLevelId: number;
  subjectId: number;
  teacherId: number | null;
  isCompulsory: boolean;
  createdAt: string;
  subjectName?: string;
  subjectCode?: string;
  subjectType?: SubjectType;
  department?: string;
}

export interface GradingScale {
  id: number;
  name: string;
  description: string | null;
  isDefault: boolean;
  companyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  items: GradingScaleItem[];
}

export interface GradingScaleItem {
  id: number;
  gradingScaleId: number;
  grade: string;
  minScore: number;
  maxScore: number;
  gradePoint: number | null;
  remark: string;
  sortOrder: number;
  createdAt: string;
}

export interface Student {
  id: number;
  admissionNumber: string;
  firstName: string;
  middleName: string | null;
  lastName: string;
  dateOfBirth: string;
  gender: Gender;
  stateOfOrigin: string | null;
  lga: string | null;
  nationality: string | null;
  religion: string | null;
  bloodGroup: BloodGroup | null;
  genotype: Genotype | null;
  photo: string | null;
  address: string | null;
  studentCategory: StudentCategory;
  specialCategory: SpecialCategory | null;
  previousSchool: string | null;
  transferCertificateUrl: string | null;
  admissionDate: string;
  graduationDate: string | null;
  status: StudentStatus;
  statusChangeReason: string | null;
  siblingGroupId: string | null;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
  guardians?: GuardianWithPrimary[];
  medicalRecord?: MedicalRecord | null;
  currentEnrolment?: EnrolmentWithDetails | null;
}

export interface Guardian {
  id: number;
  firstName: string;
  lastName: string;
  phone: string;
  phoneAlt: string | null;
  email: string | null;
  occupation: string | null;
  employer: string | null;
  address: string | null;
  relationship: GuardianRelationship;
  isEmergencyContact: boolean;
  portalUserId: number | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  wards_count?: number;
}

export interface GuardianWithPrimary extends Guardian {
  isPrimary: boolean;
}

export interface MedicalRecord {
  id: number;
  studentId: number;
  allergies: string | null;
  medicalConditions: string | null;
  medications: string | null;
  disabilities: string | null;
  immunizationStatus: string | null;
  lastCheckupDate: string | null;
  healthInsuranceProvider: string | null;
  healthInsuranceNumber: string | null;
  doctorName: string | null;
  doctorPhone: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Enrolment {
  id: number;
  studentId: number;
  sessionId: number;
  classLevelId: number;
  classSectionId: number;
  rollNumber: number | null;
  enrolmentDate: string;
  status: EnrolmentStatus;
  promotedToId: number | null;
  remarks: string | null;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
}

export interface EnrolmentWithDetails extends Enrolment {
  firstName?: string;
  lastName?: string;
  admissionNumber?: string;
  gender?: Gender;
  className?: string;
  classCode?: string;
  sectionName?: string;
  sessionName?: string;
}

export interface StudentDocument {
  id: number;
  studentId: number;
  documentType: DocumentType;
  title: string;
  fileUrl: string;
  fileSize: number | null;
  mimeType: string | null;
  uploadedBy: number | null;
  createdAt: string;
}

export interface SmStaff {
  id: number;
  employeeId: number | null;
  firstName: string;
  lastName: string;
  email: string | null;
  phone: string | null;
  staffType: StaffType;
  designation: string | null;
  subjectsQualified: string | null;
  trcnNumber: string | null;
  qualification: string | null;
  yearsOfExperience: number | null;
  companyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SectionOccupancy {
  id: number;
  name: string;
  capacity: number;
  enrolled: number;
  available: number;
}

export interface StudentStats {
  total: number;
  active: number;
  male: number;
  female: number;
}

export interface CurrentContext {
  session: AcademicSession | null;
  term: Term | null;
}

// ============================================================================
// FEE MANAGEMENT ENUMS
// ============================================================================

export type FeeInvoiceStatus = 'DRAFT' | 'ISSUED' | 'PARTIAL' | 'PAID' | 'OVERDUE' | 'CANCELLED' | 'REFUNDED';
export type FeePaymentMethod = 'CASH' | 'BANK_TRANSFER' | 'POS' | 'ONLINE' | 'CHECK';
export type FeeDiscountType = 'STAFF_WARD' | 'SIBLING' | 'SCHOLARSHIP' | 'FINANCIAL_AID' | 'CUSTOM';
export type FeeValueType = 'PERCENTAGE' | 'FIXED_AMOUNT';
export type FeeAppliesTo = 'ALL_FEES' | 'TUITION_ONLY' | 'SPECIFIC_CATEGORIES';
export type FeeStudentCategory = 'DAY' | 'BOARDER' | 'ALL';

// ============================================================================
// FEE MANAGEMENT INTERFACES
// ============================================================================

export interface FeeCategory {
  id: number;
  name: string;
  code: string;
  glAccountId: number | null;
  glAccountCode?: string;
  glAccountName?: string;
  description: string | null;
  isSystemDefined: boolean;
  companyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeStructure {
  id: number;
  sessionId: number;
  termId: number;
  classLevelId: number;
  studentCategory: FeeStudentCategory;
  feeCategoryId: number;
  amount: number;
  isOptional: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  feeCategoryName?: string;
  feeCategoryCode?: string;
  className?: string;
  classCode?: string;
  sessionName?: string;
  termName?: string;
}

export interface FeeInvoice {
  id: number;
  invoiceNumber: string;
  studentId: number;
  sessionId: number;
  termId: number;
  enrolmentId: number | null;
  subtotal: number;
  discountAmount: number;
  discountType: FeeDiscountType | null;
  discountPercent: number | null;
  totalAmount: number;
  amountPaid: number;
  balance: number;
  dueDate: string;
  status: FeeInvoiceStatus;
  journalEntryId: number | null;
  companyId: number;
  createdBy: number | null;
  createdAt: string;
  updatedAt: string;
  studentFirstName?: string;
  studentLastName?: string;
  admissionNumber?: string;
  className?: string;
  classCode?: string;
  sessionName?: string;
  termName?: string;
  items?: FeeInvoiceItem[];
  payments?: FeePayment[];
}

export interface FeeInvoiceItem {
  id: number;
  invoiceId: number;
  feeCategoryId: number;
  description: string;
  amount: number;
  glAccountId: number | null;
  feeCategoryName?: string;
  feeCategoryCode?: string;
}

export interface FeePayment {
  id: number;
  receiptNumber: string;
  invoiceId: number;
  studentId: number;
  amount: number;
  paymentMethod: FeePaymentMethod;
  paymentDate: string;
  bankAccountId: number | null;
  referenceNumber: string | null;
  journalEntryId: number | null;
  receivedBy: number | null;
  isRefund: boolean;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  studentFirstName?: string;
  studentLastName?: string;
  admissionNumber?: string;
  invoiceNumber?: string;
  invoiceTotalAmount?: number;
  invoiceBalance?: number;
}

export interface FeeDiscount {
  id: number;
  name: string;
  discountType: FeeDiscountType;
  valueType: FeeValueType;
  value: number;
  appliesTo: FeeAppliesTo;
  specificCategoryIds: number[] | null;
  glAccountId: number | null;
  glAccountCode?: string;
  glAccountName?: string;
  requiresApproval: boolean;
  companyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface FeeCollectionSummary {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  collectionRate: number;
}

export interface StudentFeeStatus {
  invoices: FeeInvoice[];
  summary: FeeCollectionSummary;
}

// ============================================================================
// D. EXAMINATIONS & RESULTS
// ============================================================================

export type ResultStatus = 'PENDING' | 'COMPUTED' | 'APPROVED' | 'PUBLISHED';
export type PsychomotorCategory = 'AFFECTIVE' | 'PSYCHOMOTOR';
export type PromotionDecision = 'PROMOTED' | 'REPEATED' | 'WITHDRAWN';

export interface Assessment {
  id: number;
  name: string;
  code: string;
  sessionId: number;
  termId: number;
  classLevelId: number;
  subjectId: number;
  maxScore: number;
  weight: number;
  date: string | null;
  companyId: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  subjectName?: string;
  subjectCode?: string;
  className?: string;
  classCode?: string;
}

export interface Score {
  id: number;
  assessmentId: number;
  studentId: number;
  enrolmentId: number;
  score: number | null;
  remarks: string | null;
  enteredBy: number | null;
  enteredAt: string;
  companyId: number;
}

export interface ScoreGridRow {
  studentId: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  enrolmentId: number;
  scores: Record<number, { score: number | null; remarks?: string }>;
}

export interface ScoreGrid {
  assessments: Assessment[];
  students: ScoreGridRow[];
}

export interface Result {
  id: number;
  studentId: number;
  enrolmentId: number;
  sessionId: number;
  termId: number;
  classLevelId: number;
  subjectId: number;
  caTotal: number;
  examScore: number;
  totalScore: number;
  grade: string;
  gradePoint: number;
  remarks: string | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  subjectName?: string;
  subjectCode?: string;
}

export interface ResultSummary {
  id: number;
  studentId: number;
  enrolmentId: number;
  sessionId: number;
  termId: number;
  classLevelId: number;
  totalScore: number;
  averageScore: number;
  subjectCount: number;
  gpa: number;
  classPosition: number | null;
  classSize: number | null;
  status: ResultStatus;
  principalComment: string | null;
  teacherComment: string | null;
  promotionDecision: PromotionDecision | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
  admissionNumber?: string;
  firstName?: string;
  lastName?: string;
  className?: string;
}

export interface ClassResultOverview {
  stats: {
    total: number;
    computed: number;
    approved: number;
    published: number;
    pending: number;
    classAverage: number;
    highest: number;
    lowest: number;
  };
  summaries: ResultSummary[];
}

export interface BroadsheetSubject {
  id: number;
  name: string;
  code: string;
}

export interface BroadsheetRow {
  studentId: number;
  admissionNumber: string;
  studentName: string;
  subjects: Record<number, { total: number; grade: string }>;
  totalScore: number;
  average: number;
  position: number;
}

export interface BroadsheetData {
  classLevel: string;
  session: string;
  term: string;
  subjects: BroadsheetSubject[];
  rows: BroadsheetRow[];
}

export interface ReportCardData {
  student: {
    id: number;
    admissionNumber: string;
    firstName: string;
    middleName: string | null;
    lastName: string;
    gender: string;
    photo: string | null;
  };
  classLevel: string;
  classCode: string;
  session: string;
  term: string;
  nextTermResumptionDate: string | null;
  results: Result[];
  summary: ResultSummary | null;
  psychomotor: PsychomotorRating[];
  gradingScale: GradingScaleItem[];
}

export interface PsychomotorRating {
  id: number;
  studentId: number;
  enrolmentId: number;
  sessionId: number;
  termId: number;
  category: PsychomotorCategory;
  trait: string;
  rating: number;
  ratedBy: number | null;
  companyId: number;
  createdAt: string;
  updatedAt: string;
}

export interface PsychomotorClassData {
  students: Array<{
    studentId: number;
    admissionNumber: string;
    firstName: string;
    lastName: string;
  }>;
  ratings: PsychomotorRating[];
}

export interface PsychomotorTraits {
  AFFECTIVE: string[];
  PSYCHOMOTOR: string[];
}

export interface PromotionPreviewRow {
  studentId: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  currentClass: string;
  averageScore: number;
  classPosition: number | null;
  classSize: number | null;
  resultStatus: ResultStatus | null;
  suggestedDecision: string;
  alreadyPromoted: boolean;
}

export interface PromotionHistoryRow {
  studentId: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  fromClassId: number;
  fromClass: string;
  toClassId: number | null;
  toClass: string | null;
  decision: string;
  fromSession: string;
  toSession: string | null;
}

// ============================================================================
// E. ATTENDANCE
// ============================================================================

export type AttendanceStatus = 'PRESENT' | 'ABSENT' | 'LATE' | 'EXCUSED';

export interface AttendanceRecord {
  id: number;
  studentId: number;
  enrolmentId: number;
  sessionId: number;
  termId: number;
  classLevelId: number;
  date: string;
  status: AttendanceStatus;
  remarks: string | null;
  takenBy: number | null;
  companyId: number;
  firstName?: string;
  lastName?: string;
  admissionNumber?: string;
}

export interface AttendanceSummaryRow {
  studentId: number;
  admissionNumber: string;
  firstName: string;
  lastName: string;
  present: number;
  absent: number;
  late: number;
  excused: number;
  total: number;
  attendancePercent: number;
}

// ============================================================================
// PAGINATED RESPONSE
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
}
