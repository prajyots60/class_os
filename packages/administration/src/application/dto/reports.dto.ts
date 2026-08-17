export interface AttendanceReportSummaryDTO {
  totalSessions: number;
  completedSessions: number;
  pendingSessions: number;
  eligibleRecords: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
}

export interface AttendanceReportRowDTO {
  id: string;
  dateIso: string;
  batchId: string;
  batchName: string;
  batchCode: string;
  subjectName: string;
  teacherName: string;
  eligibleCount: number;
  presentCount: number;
  absentCount: number;
  attendancePercentage: number;
  status: string;
}

export interface AttendanceReportResponseDTO {
  summary: AttendanceReportSummaryDTO;
  data: AttendanceReportRowDTO[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}

export interface PaymentMethodBreakdownDTO {
  cash: number;
  upi: number;
  bank_transfer: number;
}

export interface FeeCollectionReportSummaryDTO {
  totalCollectedAmount: number;
  transactionCount: number;
  pendingInvoiceAmount: number;
  paymentMethodBreakdown: PaymentMethodBreakdownDTO;
}

export interface FeeCollectionReportRowDTO {
  id: string;
  receivedOnIso: string;
  studentId: string;
  studentName: string;
  admissionNumber: string;
  invoiceId: string;
  invoiceNumber: string;
  amount: number;
  paymentMode: string;
  receiptNumber: string | null;
}

export interface FeeCollectionReportResponseDTO {
  summary: FeeCollectionReportSummaryDTO;
  data: FeeCollectionReportRowDTO[];
  meta: {
    total: number;
    page: number;
    pageSize: number;
    totalPages: number;
  };
}
