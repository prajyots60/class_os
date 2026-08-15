// CoachingOS Database Schema (Prisma ORM 7 Baseline)

generator client {
  provider = "prisma-client"
  output   = "../src/generated/client"
}

datasource db {
  provider = "postgresql"
}

// ==========================================
// ENUMS
// ==========================================

enum UserStatus {
  active
  invited
  suspended
}

enum ParentIdentityStatus {
  active
  suspended
  deactivated
}

enum InstituteParentStatus {
  active
  inactive
}

enum InstituteStatus {
  active
  suspended
  archived
}

enum StudentStatus {
  active
  inactive
  archived
}

enum StudentAdmissionStatus {
  pending
  admitted
  rejected
  cancelled
}

enum StudentGender {
  male
  female
  other
  prefer_not_to_say
}

enum ProgramStatus {
  draft
  active
  archived
}

enum SubjectStatus {
  draft
  active
  archived
}

enum BatchStatus {
  draft
  open
  running
  completed
  archived
}

enum EnrollmentStatus {
  pending
  active
  completed
  withdrawn
  transferred
  cancelled
}

enum DiscountType {
  none
  percentage
  fixed
}

enum SessionStatus {
  scheduled
  completed
  cancelled
}

enum AttendanceStatus {
  present
  absent
  late
}

enum AttendanceSource {
  manual
  rfid
}

enum TestStatus {
  draft
  scheduled
  marks_entered
  published
}

enum BillingType {
  monthly
  one_time
  installment
}

enum InvoiceStatus {
  pending
  partial
  paid
}

enum PaymentMode {
  cash
  upi
  bank_transfer
}

enum GuardianRelationshipType {
  father
  mother
  guardian
  stepfather
  stepmother
  grandparent
  sibling
  other
}

enum GuardianRelationshipStatus {
  active
  archived
}

// ==========================================
// PLATFORM LAYER (Global — owned by CoachingOS)
// ==========================================

model ParentIdentity {
  id        String               @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  phone     String               @unique @db.VarChar(20)
  name      String?              @db.VarChar(255)
  avatar    String?              @db.Text
  status    ParentIdentityStatus @default(active)
  createdAt DateTime             @default(now()) @map("created_at")
  updatedAt DateTime             @updatedAt @map("updated_at")

  memberships      InstituteMembership[]
  childProfiles    ChildProfile[]
  users            User[]
  instituteParents InstituteParent[]

  @@index([status])
  @@map("parent_identities")
}

model InstituteMembership {
  id                String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parentIdentityId  String @map("parent_identity_id") @db.Uuid
  instituteId       String @map("institute_id") @db.Uuid
  instituteParentId String @map("institute_parent_id") @db.Uuid

  parentIdentity  ParentIdentity  @relation(fields: [parentIdentityId], references: [id], onDelete: Cascade)
  institute       Institute       @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  instituteParent InstituteParent @relation(fields: [instituteParentId], references: [id], onDelete: Cascade)
  assignedBatches Batch[]

  @@unique([parentIdentityId, instituteId])
  @@map("institute_memberships")
}

model ChildProfile {
  id               String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  parentIdentityId String   @map("parent_identity_id") @db.Uuid
  name             String   @db.VarChar(100)
  avatar           String?  @db.VarChar(255)
  createdAt        DateTime @default(now()) @map("created_at")
  updatedAt        DateTime @updatedAt @map("updated_at")

  parentIdentity ParentIdentity @relation(fields: [parentIdentityId], references: [id], onDelete: Cascade)
  studentLinks   StudentLink[]

  @@map("child_profiles")
}

model StudentLink {
  id             String @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  childProfileId String @map("child_profile_id") @db.Uuid
  studentId      String @map("student_id") @db.Uuid
  instituteId    String @map("institute_id") @db.Uuid

  childProfile ChildProfile @relation(fields: [childProfileId], references: [id], onDelete: Cascade)
  student      Student      @relation(fields: [studentId], references: [id], onDelete: Cascade)
  institute    Institute    @relation(fields: [instituteId], references: [id], onDelete: Cascade)

  @@unique([childProfileId, studentId])
  @@index([instituteId])
  @@map("student_links")
}

// ==========================================
// INSTITUTE TENANT LAYER
// ==========================================

model Institute {
  id           String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  name         String          @db.VarChar(255)
  slug         String          @unique @db.VarChar(100)
  phone        String          @db.VarChar(20)
  email        String          @db.VarChar(255)
  logoUrl      String?         @map("logo_url") @db.Text
  primaryColor String?         @map("primary_color") @db.VarChar(50)
  timezone     String          @default("Asia/Kolkata") @db.VarChar(50)
  status       InstituteStatus @default(active)
  createdAt    DateTime        @default(now()) @map("created_at")
  updatedAt    DateTime        @updatedAt @map("updated_at")

  users                   User[]
  instituteParents        InstituteParent[]
  students                Student[]
  programs                Program[]
  subjects                Subject[]
  programSubjects         ProgramSubject[]
  batches                 Batch[]
  batchSessions           BatchSession[]
  enrollments             Enrollment[]
  attendance              Attendance[]
  homework                Homework[]
  tests                   Test[]
  marks                   Marks[]
  receipts                Receipt[]
  announcements           Announcement[]
  notifications           Notification[]
  activities              Activity[]
  outboundMessages        OutboundMessageQueue[]
  settings                Settings?
  branding                Branding?
  auditLogs               AuditLog[]
  memberships             InstituteMembership[]
  studentLinks            StudentLink[]
  instituteParentStudents InstituteParentStudent[]

  @@map("institutes")
}

model User {
  id               String          @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId      String?         @map("institute_id") @db.Uuid
  parentIdentityId String?         @map("parent_identity_id") @db.Uuid
  name             String          @db.VarChar(255)
  phone            String?         @db.VarChar(20)
  email            String          @unique @db.VarChar(255)
  emailVerified    Boolean         @default(false) @map("email_verified")
  image            String?         @db.Text
  status           UserStatus      @default(active)
  createdAt        DateTime        @default(now()) @map("created_at")
  updatedAt        DateTime        @updatedAt @map("updated_at")
  deletedAt        DateTime?       @map("deleted_at")

  institute          Institute?             @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  parentIdentity     ParentIdentity?        @relation(fields: [parentIdentityId], references: [id], onDelete: SetNull)
  assignedSchedules  Schedule[]             @relation("TeacherSchedules")
  substituteSessions BatchSession[]         @relation("SubstituteTeacherSessions")
  collectedPayments  Payment[]              @relation("CollectedByPayments")
  notifications      Notification[]
  outboundMessages   OutboundMessageQueue[]
  auditLogs          AuditLog[]
  sessions           Session[]
  accounts           Account[]

  @@index([instituteId, status])
  @@index([parentIdentityId])
  @@map("users")
}

model Session {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  expiresAt DateTime @map("expires_at")
  token     String   @unique
  createdAt DateTime @default(now()) @map("created_at")
  updatedAt DateTime @updatedAt @map("updated_at")
  ipAddress String?  @map("ip_address") @db.VarChar(255)
  userAgent String?  @map("user_agent") @db.Text
  userId    String   @map("user_id") @db.Uuid

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("sessions")
}

model Account {
  id                    String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  accountId             String    @map("account_id")
  providerId            String    @map("provider_id")
  userId                String    @map("user_id") @db.Uuid
  accessToken           String?   @map("access_token") @db.Text
  refreshToken          String?   @map("refresh_token") @db.Text
  idToken               String?   @map("id_token") @db.Text
  accessTokenExpiresAt  DateTime? @map("access_token_expires_at")
  refreshTokenExpiresAt DateTime? @map("refresh_token_expires_at")
  scope                 String?   @db.Text
  password              String?   @db.Text
  createdAt             DateTime  @default(now()) @map("created_at")
  updatedAt             DateTime  @updatedAt @map("updated_at")

  user User @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@map("accounts")
}

model Verification {
  id         String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  identifier String
  value      String
  expiresAt  DateTime @map("expires_at")
  createdAt  DateTime @default(now()) @map("created_at")
  updatedAt  DateTime @updatedAt @map("updated_at")

  @@map("verifications")
}

model InstituteParent {
  id               String                @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId      String                @map("institute_id") @db.Uuid
  parentIdentityId String                @map("parent_identity_id") @db.Uuid
  notes            String?               @db.Text
  status           InstituteParentStatus @default(active)
  createdAt        DateTime              @default(now()) @map("created_at")
  updatedAt        DateTime              @updatedAt @map("updated_at")

  institute      Institute              @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  parentIdentity ParentIdentity         @relation(fields: [parentIdentityId], references: [id], onDelete: Restrict)
  students       InstituteParentStudent[]
  memberships    InstituteMembership[]

  @@unique([instituteId, parentIdentityId], name: "institute_parent_unique")
  @@index([instituteId])
  @@index([parentIdentityId])
  @@index([instituteId, status])
  @@map("institute_parents")
}

model InstituteParentStudent {
  id                String                     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId       String                     @map("institute_id") @db.Uuid
  instituteParentId String                     @map("institute_parent_id") @db.Uuid
  studentId         String                     @map("student_id") @db.Uuid
  relationshipType  GuardianRelationshipType   @default(father) @map("relationship_type")
  isPrimary         Boolean                    @default(false) @map("is_primary")
  status            GuardianRelationshipStatus @default(active)
  createdAt         DateTime                   @default(now()) @map("created_at")
  updatedAt         DateTime                   @updatedAt @map("updated_at")
  deletedAt         DateTime?                  @map("deleted_at")

  institute       Institute       @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  instituteParent InstituteParent @relation(fields: [instituteParentId], references: [id], onDelete: Cascade)
  student         Student         @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([instituteId, instituteParentId, studentId], name: "institute_parent_student_unique", map: "institute_parent_student_unique")
  @@index([instituteId, studentId])
  @@index([instituteId, instituteParentId])
  @@index([instituteId, status])
  @@map("institute_parent_students")
}

model Student {
  id              String                 @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId     String                 @map("institute_id") @db.Uuid
  admissionNumber String                 @map("admission_number") @db.VarChar(50)
  firstName       String                 @map("first_name") @db.VarChar(100)
  middleName      String?                @map("middle_name") @db.VarChar(100)
  lastName        String                 @map("last_name") @db.VarChar(100)
  dateOfBirth     DateTime?              @map("date_of_birth") @db.Date
  gender          StudentGender?         @map("gender")
  phone           String?                @db.VarChar(20)
  email           String?                @db.VarChar(255)
  address         String?                @db.Text
  city            String?                @db.VarChar(100)
  state           String?                @db.VarChar(100)
  postalCode      String?                @map("postal_code") @db.VarChar(20)
  admissionDate   DateTime?              @map("admission_date") @db.Date
  admissionStatus StudentAdmissionStatus @default(admitted) @map("admission_status")
  status          StudentStatus          @default(active)
  createdAt       DateTime               @default(now()) @map("created_at")
  updatedAt       DateTime               @updatedAt @map("updated_at")
  deletedAt       DateTime?              @map("deleted_at")

  institute    Institute                @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  parents      InstituteParentStudent[]
  enrollments  Enrollment[]
  studentLinks StudentLink[]
  activities   Activity[]

  @@unique([instituteId, admissionNumber], name: "student_admission_number_unique")
  @@index([instituteId, status])
  @@index([instituteId, admissionStatus])
  @@index([firstName, lastName])
  @@map("students")
}

model Program {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId String        @map("institute_id") @db.Uuid
  name        String        @db.VarChar(100)
  code        String        @db.VarChar(50)
  description String?       @db.VarChar(500)
  status      ProgramStatus @default(draft)
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @default(now()) @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at")

  institute       Institute        @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  programSubjects ProgramSubject[]
  batches         Batch[]

  @@unique([instituteId, code], name: "program_code_unique", map: "program_code_unique")
  @@unique([instituteId, name], name: "program_name_unique", map: "program_name_unique")
  @@index([instituteId])
  @@index([instituteId, status])
  @@map("programs")
}

model Subject {
  id          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId String        @map("institute_id") @db.Uuid
  name        String        @db.VarChar(100)
  code        String        @db.VarChar(50)
  description String?       @db.VarChar(500)
  status      SubjectStatus @default(draft)
  createdAt   DateTime      @default(now()) @map("created_at")
  updatedAt   DateTime      @updatedAt @map("updated_at")
  deletedAt   DateTime?     @map("deleted_at")

  institute       Institute        @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  programSubjects ProgramSubject[]
  batches         Batch[]

  @@unique([instituteId, code], name: "subject_code_unique", map: "subject_code_unique")
  @@unique([instituteId, name], name: "subject_name_unique", map: "subject_name_unique")
  @@index([instituteId, status])
  @@map("subjects")
}

model ProgramSubject {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId String   @map("institute_id") @db.Uuid
  programId   String   @map("program_id") @db.Uuid
  subjectId   String   @map("subject_id") @db.Uuid
  createdAt   DateTime @default(now()) @map("created_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  program   Program   @relation(fields: [programId], references: [id], onDelete: Cascade)
  subject   Subject   @relation(fields: [subjectId], references: [id], onDelete: Cascade)

  @@unique([instituteId, programId, subjectId], name: "program_subject_unique", map: "program_subject_unique")
  @@index([instituteId, programId])
  @@index([instituteId, subjectId])
  @@map("program_subjects")
}

model Batch {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId String      @map("institute_id") @db.Uuid
  subjectId   String      @map("subject_id") @db.Uuid
  programId   String?     @map("program_id") @db.Uuid
  teacherId   String?     @map("teacher_id") @db.Uuid
  name        String      @db.VarChar(100)
  code        String      @db.VarChar(50)
  capacity    Int?
  status      BatchStatus @default(draft)
  startDate   DateTime?   @map("start_date") @db.Date
  endDate     DateTime?   @map("end_date") @db.Date
  createdAt   DateTime    @default(now()) @map("created_at")
  updatedAt   DateTime    @updatedAt @map("updated_at")
  deletedAt   DateTime?   @map("deleted_at")

  institute              Institute            @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  subject                Subject              @relation(fields: [subjectId], references: [id], onDelete: Cascade)
  program                Program?             @relation(fields: [programId], references: [id], onDelete: SetNull)
  teacher                InstituteMembership? @relation(fields: [teacherId], references: [id], onDelete: SetNull)
  schedules              Schedule[]
  batchSessions          BatchSession[]
  enrollments            Enrollment[]
  transferredEnrollments Enrollment[]         @relation("TransferredToBatch")
  homework               Homework[]
  tests                  Test[]
  announcements          Announcement[]

  @@unique([instituteId, code], name: "batch_code_unique", map: "batch_code_unique")
  @@unique([instituteId, subjectId, name], name: "batch_subject_name_unique", map: "batch_subject_name_unique")
  @@index([instituteId, status])
  @@index([instituteId, subjectId])
  @@index([instituteId, programId])
  @@index([instituteId, teacherId])
  @@map("batches")
}

model Enrollment {
  id                        String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId               String           @map("institute_id") @db.Uuid
  studentId                 String           @map("student_id") @db.Uuid
  batchId                   String           @map("batch_id") @db.Uuid
  status                    EnrollmentStatus @default(pending)
  enrolledAt                DateTime         @default(now()) @map("enrolled_at")
  completedAt               DateTime?        @map("completed_at")
  withdrawnAt               DateTime?        @map("withdrawn_at")
  transferredAt             DateTime?        @map("transferred_at")
  transferredToBatchId      String?          @map("transferred_to_batch_id") @db.Uuid
  transferredToEnrollmentId String?          @map("transferred_to_enrollment_id") @db.Uuid
  createdAt                 DateTime         @default(now()) @map("created_at")
  updatedAt                 DateTime         @updatedAt @map("updated_at")
  deletedAt                 DateTime?        @map("deleted_at")

  institute               Institute    @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  student                 Student      @relation(fields: [studentId], references: [id], onDelete: Restrict)
  batch                   Batch        @relation(fields: [batchId], references: [id], onDelete: Restrict)
  transferredToBatch      Batch?       @relation("TransferredToBatch", fields: [transferredToBatchId], references: [id], onDelete: SetNull)
  transferredToEnrollment Enrollment?  @relation("TransferredToEnrollment", fields: [transferredToEnrollmentId], references: [id], onDelete: SetNull)
  previousEnrollments     Enrollment[] @relation("TransferredToEnrollment")
  attendance              Attendance[]
  marks                   Marks[]
  billingPlans            BillingPlan[]

  @@unique([instituteId, studentId, batchId], name: "enrollment_student_batch_unique", map: "enrollment_student_batch_unique")
  @@index([instituteId, status])
  @@index([instituteId, studentId])
  @@index([instituteId, batchId])
  @@map("enrollments")
}

// ==========================================
// ACADEMICS LAYER
// ==========================================

model Schedule {
  id        String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  batchId   String   @map("batch_id") @db.Uuid
  dayOfWeek String   @map("day_of_week") @db.VarChar(20)
  startTime String   @map("start_time") @db.VarChar(10)
  endTime   String   @map("end_time") @db.VarChar(10)
  teacherId String?  @map("teacher_id") @db.Uuid
  createdAt DateTime @default(now()) @map("created_at")

  batch   Batch @relation(fields: [batchId], references: [id], onDelete: Cascade)
  teacher User? @relation("TeacherSchedules", fields: [teacherId], references: [id], onDelete: SetNull)

  @@index([batchId])
  @@map("schedules")
}

model BatchSession {
  id                  String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId         String            @map("institute_id") @db.Uuid
  batchId             String            @map("batch_id") @db.Uuid
  date                DateTime          @db.Date
  startTime           String?           @map("start_time") @db.VarChar(10)
  endTime             String?           @map("end_time") @db.VarChar(10)
  status              SessionStatus     @default(scheduled)
  attendanceTaken     Boolean           @default(false) @map("attendance_taken")
  source              AttendanceSource?
  substituteTeacherId String?           @map("substitute_teacher_id") @db.Uuid
  createdAt           DateTime          @default(now()) @map("created_at")
  updatedAt           DateTime          @updatedAt @map("updated_at")

  institute         Institute    @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  batch             Batch        @relation(fields: [batchId], references: [id], onDelete: Cascade)
  substituteTeacher User?        @relation("SubstituteTeacherSessions", fields: [substituteTeacherId], references: [id], onDelete: SetNull)
  attendance        Attendance[]

  @@index([batchId, date])
  @@index([instituteId])
  @@map("batch_sessions")
}

model Attendance {
  id           String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId  String           @map("institute_id") @db.Uuid
  sessionId    String           @map("session_id") @db.Uuid
  enrollmentId String           @map("enrollment_id") @db.Uuid
  status       AttendanceStatus
  createdAt    DateTime         @default(now()) @map("created_at")
  updatedAt    DateTime         @updatedAt @map("updated_at")

  institute  Institute    @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  session    BatchSession @relation(fields: [sessionId], references: [id], onDelete: Cascade)
  enrollment Enrollment   @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  @@unique([sessionId, enrollmentId])
  @@index([enrollmentId])
  @@index([instituteId])
  @@map("attendance")
}

model Homework {
  id            String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId   String    @map("institute_id") @db.Uuid
  batchId       String    @map("batch_id") @db.Uuid
  title         String    @db.VarChar(255)
  description   String?   @db.Text
  attachmentUrl String?   @map("attachment_url") @db.Text
  publishedAt   DateTime? @map("published_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  batch     Batch     @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@index([batchId])
  @@index([instituteId])
  @@map("homework")
}

model Test {
  id            String     @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId   String     @map("institute_id") @db.Uuid
  batchId       String     @map("batch_id") @db.Uuid
  title         String     @db.VarChar(255)
  maximumMarks  Int        @map("maximum_marks")
  scheduledDate DateTime?  @map("scheduled_date") @db.Date
  status        TestStatus @default(draft)
  createdAt     DateTime   @default(now()) @map("created_at")
  updatedAt     DateTime   @updatedAt @map("updated_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  batch     Batch     @relation(fields: [batchId], references: [id], onDelete: Cascade)
  marks     Marks[]

  @@index([batchId])
  @@index([instituteId])
  @@map("tests")
}

model Marks {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId   String   @map("institute_id") @db.Uuid
  testId        String   @map("test_id") @db.Uuid
  enrollmentId  String   @map("enrollment_id") @db.Uuid
  marksObtained Decimal  @map("marks_obtained") @db.Decimal(6, 2)
  createdAt     DateTime @default(now()) @map("created_at")
  updatedAt     DateTime @updatedAt @map("updated_at")

  institute  Institute  @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  test       Test       @relation(fields: [testId], references: [id], onDelete: Cascade)
  enrollment Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)

  @@unique([testId, enrollmentId])
  @@index([enrollmentId])
  @@index([instituteId])
  @@map("marks")
}

// ==========================================
// BILLING LAYER
// ==========================================

model BillingPlan {
  id                          String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  enrollmentId                String        @map("enrollment_id") @db.Uuid
  type                        BillingType
  amount                      Decimal       @db.Decimal(10, 2)
  discountType                DiscountType? @map("discount_type")
  discountValue               Decimal?      @map("discount_value") @db.Decimal(10, 2)
  billingStartDate            DateTime      @map("billing_start_date") @db.Date
  firstInvoiceAmountOverride Decimal?      @map("first_invoice_amount_override") @db.Decimal(10, 2)
  createdAt                   DateTime      @default(now()) @map("created_at")
  updatedAt                   DateTime      @updatedAt @map("updated_at")

  enrollment Enrollment @relation(fields: [enrollmentId], references: [id], onDelete: Cascade)
  invoices   Invoice[]

  @@index([enrollmentId])
  @@map("billing_plans")
}

model Invoice {
  id            String        @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  billingPlanId String        @map("billing_plan_id") @db.Uuid
  amount        Decimal       @db.Decimal(10, 2)
  dueDate       DateTime      @map("due_date") @db.Date
  status        InvoiceStatus @default(pending)
  createdAt     DateTime      @default(now()) @map("created_at")
  updatedAt     DateTime      @updatedAt @map("updated_at")

  billingPlan BillingPlan @relation(fields: [billingPlanId], references: [id], onDelete: Cascade)
  payments    Payment[]

  @@index([billingPlanId])
  @@index([dueDate])
  @@index([status])
  @@map("invoices")
}

model Payment {
  id          String      @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  invoiceId   String      @map("invoice_id") @db.Uuid
  amount      Decimal     @db.Decimal(10, 2)
  paymentMode PaymentMode @map("payment_mode")
  receivedOn  DateTime    @map("received_on") @db.Date
  collectedBy String?     @map("collected_by") @db.Uuid
  remarks     String?     @db.Text
  createdAt   DateTime    @default(now()) @map("created_at")

  invoice   Invoice  @relation(fields: [invoiceId], references: [id], onDelete: Cascade)
  collector User?    @relation("CollectedByPayments", fields: [collectedBy], references: [id], onDelete: SetNull)
  receipt   Receipt?

  @@index([invoiceId])
  @@map("payments")
}

model Receipt {
  id            String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId   String   @map("institute_id") @db.Uuid
  paymentId     String   @unique @map("payment_id") @db.Uuid
  receiptNumber String   @map("receipt_number") @db.VarChar(100)
  generatedAt   DateTime @default(now()) @map("generated_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  payment   Payment   @relation(fields: [paymentId], references: [id], onDelete: Cascade)

  @@index([instituteId])
  @@map("receipts")
}

// ==========================================
// COMMUNICATION & ADMINISTRATION LAYER
// ==========================================

model Announcement {
  id          String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId String    @map("institute_id") @db.Uuid
  batchId     String?   @map("batch_id") @db.Uuid
  title       String    @db.VarChar(255)
  body        String    @db.Text
  publishedAt DateTime? @map("published_at")
  createdAt   DateTime  @default(now()) @map("created_at")
  updatedAt   DateTime  @updatedAt @map("updated_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  batch     Batch?    @relation(fields: [batchId], references: [id], onDelete: Cascade)

  @@index([instituteId])
  @@index([batchId])
  @@map("announcements")
}

model Notification {
  id              String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId     String    @map("institute_id") @db.Uuid
  recipientUserId String    @map("recipient_user_id") @db.Uuid
  recipientType   String    @map("recipient_type") @db.VarChar(50)
  priority        String    @default("informational") @db.VarChar(50)
  category        String    @default("general") @db.VarChar(50)
  title           String    @db.VarChar(255)
  message         String    @db.Text
  actionUrl       String?   @map("action_url") @db.Text
  isRead          Boolean   @default(false) @map("is_read")
  readAt          DateTime? @map("read_at")
  metadata        Json?
  createdAt       DateTime  @default(now()) @map("created_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  recipient User      @relation(fields: [recipientUserId], references: [id], onDelete: Cascade)

  outboundMessages OutboundMessageQueue[]

  @@index([instituteId, recipientUserId, isRead])
  @@index([instituteId, recipientUserId, createdAt])
  @@map("notifications")
}

model Activity {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId    String   @map("institute_id") @db.Uuid
  studentId      String   @map("student_id") @db.Uuid
  eventType      String   @map("event_type") @db.VarChar(50)
  title          String   @db.VarChar(255)
  description    String   @db.Text
  occurredAt     DateTime @map("occurred_at")
  actorName      String?  @map("actor_name") @db.VarChar(255)
  metadata       Json?
  idempotencyKey String?  @map("idempotency_key") @db.VarChar(255)
  createdAt      DateTime @default(now()) @map("created_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  student   Student   @relation(fields: [studentId], references: [id], onDelete: Cascade)

  @@unique([instituteId, studentId, idempotencyKey])
  @@index([instituteId, studentId, occurredAt(sort: Desc), id(sort: Desc)])
  @@map("activities")
}

model OutboundMessageQueue {
  id                String    @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId       String    @map("institute_id") @db.Uuid
  notificationId    String?   @map("notification_id") @db.Uuid
  recipientUserId   String    @map("recipient_user_id") @db.Uuid
  recipientPhone    String    @map("recipient_phone") @db.VarChar(50)
  channel           String    @default("whatsapp") @db.VarChar(50)
  templateName      String    @map("template_name") @db.VarChar(100)
  templateVariables Json?     @map("template_variables")
  status            String    @default("pending") @db.VarChar(50)
  attempts          Int       @default(0)
  maxAttempts       Int       @default(3) @map("max_attempts")
  lastError         String?   @map("last_error") @db.Text
  idempotencyKey    String?   @map("idempotency_key") @db.VarChar(255)
  availableAt       DateTime  @default(now()) @map("available_at")
  sentAt            DateTime? @map("sent_at")
  createdAt         DateTime  @default(now()) @map("created_at")
  updatedAt         DateTime  @updatedAt @map("updated_at")

  institute    Institute     @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  notification Notification? @relation(fields: [notificationId], references: [id], onDelete: SetNull)
  recipient    User          @relation(fields: [recipientUserId], references: [id], onDelete: Cascade)

  @@unique([instituteId, notificationId, channel, recipientUserId])
  @@index([status, availableAt, createdAt])
  @@index([instituteId, status])
  @@map("outbound_message_queue")
}

model Settings {
  id             String           @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId    String           @unique @map("institute_id") @db.Uuid
  attendanceMode AttendanceSource @default(manual) @map("attendance_mode")
  academicYear   String           @default("2025-26") @map("academic_year") @db.VarChar(20)
  notifyAbsent   Boolean          @default(true) @map("notify_absent")
  notifyFeeDue   Boolean          @default(true) @map("notify_fee_due")
  updatedAt      DateTime         @updatedAt @map("updated_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)

  @@map("settings")
}

model Branding {
  id             String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId    String   @unique @map("institute_id") @db.Uuid
  logoUrl        String?  @map("logo_url") @db.Text
  primaryColor   String?  @map("primary_color") @db.VarChar(50)
  secondaryColor String?  @map("secondary_color") @db.VarChar(50)
  accentColor    String?  @map("accent_color") @db.VarChar(50)
  fontFamily     String?  @map("font_family") @db.VarChar(50)
  radiusStyle    String?  @map("radius_style") @db.VarChar(50)
  updatedAt      DateTime @updatedAt @map("updated_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)

  @@map("branding")
}

model AuditLog {
  id          String   @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  instituteId String   @map("institute_id") @db.Uuid
  userId      String?  @map("user_id") @db.Uuid
  action      String   @db.VarChar(100)
  entityType  String   @map("entity_type") @db.VarChar(100)
  entityId    String?  @map("entity_id") @db.Uuid
  details     Json?
  createdAt   DateTime @default(now()) @map("created_at")

  institute Institute @relation(fields: [instituteId], references: [id], onDelete: Cascade)
  user      User?     @relation(fields: [userId], references: [id], onDelete: SetNull)

  @@index([instituteId, createdAt])
  @@map("audit_logs")
}
