# Phase 2.6 — Staff Academic Workspace UI Specification

## 1. Executive Summary & Objective

Phase 2.6 establishes the **Staff Academic Workspace UI** for CoachingOS. The primary goal is to provide a teacher-first, highly operational workspace centered around daily coaching workflows:

```text
Teacher opens Academic Workspace
       ↓
Sees Today's Sessions (Overview)
       ↓
Opens Session → Takes Attendance (BatchSession + Enrollment)
       ↓
Manages Homework (Draft ──► Edit ──► Publish)
       ↓
Manages Assessments (Draft ──► Schedule ──► Bulk Marks Entry ──► Publish Results)
       ↓
Completes Session
```

---

## 2. Architectural Principles & Boundaries

1. **Framework-Independent Backend Authority**: All business logic, capability assertions, tenant isolation, and state machine validations remain strictly in `@coaching-os/academics` and `/api/v1/academics/...`. The UI component layer only renders state returned by the API and dispatches API calls.
2. **Protected API Boundary**: The UI communicates exclusively via HTTP with `/api/v1/academics/...` endpoints (`schedules`, `sessions`, `attendance`, `homework`, `tests`, `marks`). Zero direct database access, zero Prisma imports, and zero custom repository instantiations in frontend code.
3. **Server-Authoritative Tenant Identity**: `TenantContext` is resolved server-side via authenticated Better Auth session cookies. Client-supplied `instituteId`, `x-institute-id`, or `x-role` fields are never sent or trusted.
4. **Fail-Closed Cross-Tenant Isolation**: Cross-tenant requests resulting in HTTP `404 NOT_FOUND` are handled gracefully by masking resource existence.
5. **Publication Immutability**: UI visually enforces immutable states for published homework (`isPublished: true`) and published test results (`status: 'published'`). Edit/delete controls are disabled/hidden for published items.

---

## 3. Conceptual Information Architecture & Navigation

The workspace integrates directly into the existing authenticated staff layout under `/academics`.

```text
Staff Workspace
    ├── Dashboard (/dashboard)
    └── Academics (/academics)
          ├── 1. Today's Work (Teacher Daily Overview)
          ├── 2. Sessions & Schedules (BatchSession & Schedule management)
          ├── 3. Attendance (BatchSession + Enrollment bulk marking)
          ├── 4. Homework (Batch-targeted draft/published workflow)
          ├── 5. Assessments & Marks (Test lifecycle & spreadsheet mark entry)
          └── 6. Programs & Batches (Academic Hierarchy)
```

---

## 4. Workspaces & Detailed View Specifications

### 4.1 Today's Work (Teacher Overview Dashboard)
- **Primary Question**: *"What classes do I need to handle today?"*
- **UI Elements**:
  - Greeting header with operational date badge (`Operational Local Time`).
  - Active session cards for Today displaying Batch, Subject, Time Range (e.g. `5:00 PM – 6:30 PM`), Attendance Status (`Taken` / `Not Taken`), Homework status, and Assessment status.
  - Action buttons: `[Take Attendance]`, `[Open Session]`, `[Manage Homework]`, `[View Test]`.

### 4.2 Sessions & Schedules Workspace
- **Session List**: Filterable by Batch and Date Range (`startDate`, `endDate`). Displays Status (`scheduled`, `completed`, `cancelled`).
- **Schedule Generator Modal**: Allows generating candidate sessions for a batch over a date range using `POST /api/v1/academics/sessions/generate`.
- **Session Lifecycle Actions**:
  - `[Complete Session]`: Triggers `POST /api/v1/academics/sessions/[id]/complete`.
  - `[Cancel Session]`: Confirmation modal triggering `POST /api/v1/academics/sessions/[id]/cancel`. Disabled if session is already completed/cancelled.

### 4.3 Session Attendance Workspace
- **Model Anchor**: Bound strictly to `(batchSessionId, enrollmentId)` pair.
- **Student Roster**: Displays student name, roll number/code, enrollment context, and 1-click status toggles:
  - `[Present]` (Green)
  - `[Absent]` (Red)
  - `[Late]` (Amber)
- **Bulk Controls**: `[Mark All Present]` quick action.
- **Validation**: Rejects attendance entry for cancelled sessions or invalid enrollments. Pre-populates existing attendance records if previously recorded.
- **Submission**: Sends bulk payload to `POST /api/v1/academics/attendance`.

### 4.4 Homework Workspace
- **List & Cards**: Displays homework items grouped or filtered by Batch. Visual status badge: `Draft` (Amber) vs `Published` (Green).
- **Actions by Status**:
  - **Draft**: `[Edit]`, `[Publish]`, `[Delete]`.
  - **Published**: `[View Details]`. Edit and Delete buttons hidden/disabled.
- **Modal Dialogs**:
  - **Create / Edit Homework Modal**: Title, Description, Attachment URL.
  - **Publish Confirmation Modal**: Warning dialog stating *"After publishing, homework content cannot be modified. Continue?"* calling `POST /api/v1/academics/homework/[id]/publish`.

### 4.5 Assessments & Bulk Marks Workspace
- **Test List & Status Machine**:
  - `draft` ──► `scheduled` ──► `marks_entered` ──► `published`
- **Actions by Status**:
  - **Draft**: `[Edit]`, `[Schedule Date]`, `[Delete]`.
  - **Scheduled**: `[Enter Marks]`.
  - **Marks Entered**: `[Review & Edit Marks]`, `[Publish Results]`.
  - **Published**: Read-only display.
- **Spreadsheet Bulk Marks Entry Modal**:
  - Table listing enrolled students in batch with numeric input field `[ Marks ]`.
  - Real-time client-side validation (`0 <= marksObtained <= maxMarks`, max 2 decimal places).
  - Highlights invalid input rows in red before submit.
  - `[Save Marks]` dispatches `POST /api/v1/academics/tests/[id]/marks`.
  - `[Publish Results]` displays modal dialog warning *"Once published, test configuration and student marks are permanently frozen."* calling `POST /api/v1/academics/tests/[id]/publish`.

---

## 5. API Client Mapping

All API calls route through `v1AcademicsClient` in `apps/web/src/features/academic/api/v1-academics-client.ts`:

| UI Action | HTTP Endpoint | Guard Capability |
| :--- | :--- | :--- |
| Fetch Schedules | `GET /api/v1/academics/schedules?batchId=...` | `ACADEMIC_READ` |
| Create Schedule | `POST /api/v1/academics/schedules` | `ACADEMIC_WRITE` |
| Delete Schedule | `DELETE /api/v1/academics/schedules/[id]?batchId=...` | `ACADEMIC_WRITE` |
| Fetch Sessions | `GET /api/v1/academics/sessions?batchId=...` | `ACADEMIC_READ` |
| Generate Sessions | `POST /api/v1/academics/sessions/generate` | `ACADEMIC_WRITE` |
| Complete Session | `POST /api/v1/academics/sessions/[id]/complete` | `ACADEMIC_WRITE` |
| Cancel Session | `POST /api/v1/academics/sessions/[id]/cancel` | `ACADEMIC_WRITE` |
| Get Attendance | `GET /api/v1/academics/attendance?sessionId=...` | `ACADEMIC_READ` |
| Record Attendance | `POST /api/v1/academics/attendance` | `ACADEMIC_WRITE` |
| Fetch Homework List | `GET /api/v1/academics/homework?batchId=...` | `ACADEMIC_READ` |
| Create Homework | `POST /api/v1/academics/homework` | `ACADEMIC_WRITE` |
| Update Homework | `PATCH /api/v1/academics/homework/[id]` | `ACADEMIC_WRITE` |
| Publish Homework | `POST /api/v1/academics/homework/[id]/publish` | `ACADEMIC_WRITE` |
| Delete Homework | `DELETE /api/v1/academics/homework/[id]` | `ACADEMIC_WRITE` |
| Fetch Tests List | `GET /api/v1/academics/tests?batchId=...` | `ACADEMIC_READ` |
| Create Test | `POST /api/v1/academics/tests` | `ACADEMIC_WRITE` |
| Schedule Test Date | `POST /api/v1/academics/tests/[id]/schedule` | `ACADEMIC_WRITE` |
| Fetch Test Marks | `GET /api/v1/academics/tests/[id]/marks` | `ACADEMIC_READ` |
| Enter Bulk Marks | `POST /api/v1/academics/tests/[id]/marks` | `ACADEMIC_WRITE` |
| Publish Test Results | `POST /api/v1/academics/tests/[id]/publish` | `ACADEMIC_WRITE` |

---

## 6. Verification & Quality Matrix

1. **Unit & Integration Suite**: Vitest suite `v1-academics-client.test.ts` and component test suite `academic-workspace-ui.test.tsx`.
2. **Security & E2E Matrix**: Playwright suite `academic-workspace-security.spec.ts` testing:
   - `E2E-ACADEMIC-01`: Teacher opens workspace and views today's classes.
   - `E2E-ACADEMIC-02`: Take attendance and submit bulk records.
   - `E2E-ACADEMIC-03`: Homework draft creation, editing, and publication.
   - `E2E-ACADEMIC-04`: Test creation, scheduling, bulk mark entry, and publication.
   - `E2E-ACADEMIC-05`: Cross-tenant protection and 404 masking.
   - `E2E-ACADEMIC-06`: Read-only staff capability assertion.
