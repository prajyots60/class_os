import type {
  ParentHubDTO,
  ParentHubIdentityDTO,
  ParentHubProfileSummaryDTO,
  ParentHubStudentSummaryDTO,
  ParentHubInstituteSummaryDTO,
  ParentHubMetaDTO,
} from '@coaching-os/identity';

export type {
  ParentHubDTO,
  ParentHubIdentityDTO,
  ParentHubProfileSummaryDTO,
  ParentHubStudentSummaryDTO,
  ParentHubInstituteSummaryDTO,
  ParentHubMetaDTO,
};

export interface ParentDashboardState {
  selectedProfileId: string | null;
  activeTab?: 'overview' | 'attendance' | 'homework' | 'assessments' | 'fees';
}

export interface ParentApiErrorResponse {
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  requestId?: string;
}

export interface ParentAttendanceSummaryDTO {
  totalSessions: number;
  presentCount: number;
  absentCount: number;
  excusedCount: number;
  percentage: number;
}

export interface ParentAttendanceRecordDTO {
  id: string;
  sessionId: string;
  sessionDate: string;
  batchName: string;
  subject: string | null;
  status: 'present' | 'absent' | 'excused' | 'late';
  recordedAt: string;
}

export interface ParentStudentAttendanceDTO {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    instituteId: string;
    instituteName: string;
  };
  summary: ParentAttendanceSummaryDTO;
  records: ParentAttendanceRecordDTO[];
}

export interface ParentHomeworkItemDTO {
  id: string;
  batchId: string;
  batchName: string;
  subject: string | null;
  title: string;
  description: string | null;
  attachmentUrl: string | null;
  publishedAt: string;
  createdAt: string;
}

export interface ParentStudentHomeworkDTO {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    instituteId: string;
    instituteName: string;
  };
  homework: ParentHomeworkItemDTO[];
}

export interface ParentAssessmentSummaryDTO {
  totalAssessments: number;
  averagePercentage: number | null;
  highestPercentage: number | null;
}

export interface ParentAssessmentItemDTO {
  id: string;
  batchId: string;
  batchName: string;
  subject: string | null;
  title: string;
  maximumMarks: number;
  marksObtained: number | null;
  percentage: number | null;
  scheduledDate: string | null;
  status: string;
  createdAt: string;
}

export interface ParentStudentAssessmentDTO {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    instituteId: string;
    instituteName: string;
  };
  summary: ParentAssessmentSummaryDTO;
  assessments: ParentAssessmentItemDTO[];
}

export interface ParentInvoiceItemDTO {
  id: string;
  enrollmentId: string;
  batchName: string;
  amount: number;
  paidAmount: number;
  outstandingAmount: number;
  dueDate: string;
  status: string;
  createdAt: string;
}

export interface ParentPaymentItemDTO {
  id: string;
  invoiceId: string;
  batchName: string;
  amount: number;
  paymentMode: string;
  receivedOn: string;
  remarks: string | null;
  receiptId: string | null;
  receiptNumber: string | null;
}

export interface ParentReceiptItemDTO {
  id: string;
  receiptNumber: string;
  paymentId: string;
  amount: number;
  paymentMode: string;
  generatedAt: string;
  batchName: string;
}

export interface ParentBillingSummaryDTO {
  totalOutstandingAmount: number;
  pendingInvoiceCount: number;
  paidInvoiceCount: number;
  lastPayment: {
    amount: number;
    paymentMode: string;
    receivedOn: string;
    receiptNumber: string | null;
  } | null;
}

export interface ParentStudentBillingDTO {
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
    instituteId: string;
    instituteName: string;
  };
  summary: ParentBillingSummaryDTO;
  invoices: ParentInvoiceItemDTO[];
  payments: ParentPaymentItemDTO[];
  receipts: ParentReceiptItemDTO[];
}

export interface ParentReceiptDetailDTO {
  id: string;
  receiptNumber: string;
  generatedAt: string;
  institute: {
    id: string;
    name: string;
  };
  student: {
    id: string;
    fullName: string;
    admissionNumber: string;
  };
  batchName: string;
  payment: {
    id: string;
    amount: number;
    paymentMode: string;
    receivedOn: string;
    remarks: string | null;
  };
  invoice: {
    id: string;
    amount: number;
    dueDate: string;
    status: string;
  };
}

