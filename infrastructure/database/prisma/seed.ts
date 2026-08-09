import { db } from '../src/index';

export async function main() {
  console.log('🌱 Seeding CoachingOS development database...');

  // 1. Create Demo Institute
  const institute = await db.institute.upsert({
    where: { slug: 'sharma-physics-classes' },
    update: {},
    create: {
      id: '11111111-1111-4111-a111-111111111111',
      name: 'Sharma Physics Classes',
      slug: 'sharma-physics-classes',
      phone: '+919876543210',
      email: 'contact@sharmaclasses.com',
      timezone: 'Asia/Kolkata',
      status: 'active',
    },
  });

  // 2. Create Institute Users (Founder, Teacher, Assistant)
  const founder = await db.user.upsert({
    where: { id: '22222222-2222-4222-a222-222222222221' },
    update: {},
    create: {
      id: '22222222-2222-4222-a222-222222222221',
      instituteId: institute.id,
      name: 'Rakesh Sharma',
      phone: '+919876543210',
      email: 'rakesh@sharmaclasses.com',
      status: 'active',
    },
  });

  const teacher = await db.user.upsert({
    where: { id: '22222222-2222-4222-a222-222222222222' },
    update: {},
    create: {
      id: '22222222-2222-4222-a222-222222222222',
      instituteId: institute.id,
      name: 'Vikram Mehta',
      phone: '+919876543211',
      email: 'vikram@sharmaclasses.com',
      status: 'active',
    },
  });

  await db.user.upsert({
    where: { id: '22222222-2222-4222-a222-222222222223' },
    update: {},
    create: {
      id: '22222222-2222-4222-a222-222222222223',
      instituteId: institute.id,
      name: 'Anjali Verma',
      phone: '+919876543212',
      email: 'anjali@sharmaclasses.com',
      status: 'active',
    },
  });

  // 3. Create Settings & Branding
  await db.settings.upsert({
    where: { instituteId: institute.id },
    update: {},
    create: {
      instituteId: institute.id,
      attendanceMode: 'manual',
      academicYear: '2025-26',
      notifyAbsent: true,
      notifyFeeDue: true,
    },
  });

  await db.branding.upsert({
    where: { instituteId: institute.id },
    update: {},
    create: {
      instituteId: institute.id,
      primaryColor: '#2563eb',
      secondaryColor: '#f1f5f9',
      accentColor: '#0284c7',
      fontFamily: 'poppins',
      radiusStyle: '1rem',
    },
  });

  // 4. Create Subjects & Batches
  const physics = await db.subject.upsert({
    where: { instituteId_name: { instituteId: institute.id, name: 'Physics' } },
    update: {},
    create: {
      instituteId: institute.id,
      name: 'Physics',
    },
  });

  const maths = await db.subject.upsert({
    where: { instituteId_name: { instituteId: institute.id, name: 'Mathematics' } },
    update: {},
    create: {
      instituteId: institute.id,
      name: 'Mathematics',
    },
  });

  const batchA = await db.batch.upsert({
    where: {
      instituteId_subjectId_name: {
        instituteId: institute.id,
        subjectId: physics.id,
        name: 'Morning Batch (11th NEET)',
      },
    },
    update: {},
    create: {
      id: '33333333-3333-4333-a333-333333333331',
      instituteId: institute.id,
      subjectId: physics.id,
      teacherId: teacher.id,
      name: 'Morning Batch (11th NEET)',
      capacity: 30,
      status: 'running',
    },
  });

  const batchB = await db.batch.upsert({
    where: {
      instituteId_subjectId_name: {
        instituteId: institute.id,
        subjectId: maths.id,
        name: 'Evening Batch (11th JEE)',
      },
    },
    update: {},
    create: {
      id: '33333333-3333-4333-a333-333333333332',
      instituteId: institute.id,
      subjectId: maths.id,
      teacherId: founder.id,
      name: 'Evening Batch (11th JEE)',
      capacity: 25,
      status: 'running',
    },
  });

  // 5. Two-Layer Parent Architecture Baseline
  // Global Parent Identity 1
  const parentId1 = await db.parentIdentity.upsert({
    where: { phone: '+919999911111' },
    update: {},
    create: {
      id: '44444444-4444-4444-a444-444444444441',
      phone: '+919999911111',
    },
  });

  // Global Child Profile 1
  const child1 = await db.childProfile.create({
    data: {
      id: '55555555-5555-4555-a555-555555555551',
      parentIdentityId: parentId1.id,
      name: 'Aarav Gupta',
    },
  });

  // Tenant-Scoped Parent 1
  const instituteParent1 = await db.instituteParent.upsert({
    where: {
      primaryPhone_instituteId: {
        primaryPhone: '+919999911111',
        instituteId: institute.id,
      },
    },
    update: {},
    create: {
      id: '66666666-6666-4666-a666-666666666661',
      instituteId: institute.id,
      name: 'Suresh Gupta',
      primaryPhone: '+919999911111',
    },
  });

  // Membership linking Global ParentIdentity to Tenant InstituteParent
  await db.instituteMembership.upsert({
    where: {
      parentIdentityId_instituteId: {
        parentIdentityId: parentId1.id,
        instituteId: institute.id,
      },
    },
    update: {},
    create: {
      parentIdentityId: parentId1.id,
      instituteId: institute.id,
      instituteParentId: instituteParent1.id,
    },
  });

  // Tenant Student 1
  const student1 = await db.student.create({
    data: {
      id: '77777777-7777-4777-a777-777777777771',
      instituteId: institute.id,
      admissionNumber: 'ADM-2025-001',
      firstName: 'Aarav',
      lastName: 'Gupta',
      status: 'active',
      parents: {
        create: {
          instituteParentId: instituteParent1.id,
          relation: 'father',
        },
      },
    },
  });

  // Cross-layer link
  await db.studentLink.create({
    data: {
      childProfileId: child1.id,
      studentId: student1.id,
      instituteId: institute.id,
    },
  });

  // Student 2 (Enrolled in Physics)
  const student2 = await db.student.create({
    data: {
      id: '77777777-7777-4777-a777-777777777772',
      instituteId: institute.id,
      admissionNumber: 'ADM-2025-002',
      firstName: 'Priya',
      lastName: 'Singh',
      status: 'active',
    },
  });

  // 6. Enrollments (Student 1 enrolled in Physics & Maths; Student 2 in Physics)
  const enroll1A = await db.enrollment.create({
    data: {
      id: '88888888-8888-4888-a888-888888888881',
      instituteId: institute.id,
      studentId: student1.id,
      batchId: batchA.id,
      joinedOn: new Date('2025-04-01'),
      status: 'active',
    },
  });

  const enroll1B = await db.enrollment.create({
    data: {
      id: '88888888-8888-4888-a888-888888888882',
      instituteId: institute.id,
      studentId: student1.id,
      batchId: batchB.id,
      joinedOn: new Date('2025-04-01'),
      status: 'active',
    },
  });

  const enroll2A = await db.enrollment.create({
    data: {
      id: '88888888-8888-4888-a888-888888888883',
      instituteId: institute.id,
      studentId: student2.id,
      batchId: batchA.id,
      joinedOn: new Date('2025-04-01'),
      status: 'active',
    },
  });

  // 7. Schedule & Batch Session
  await db.schedule.create({
    data: {
      batchId: batchA.id,
      dayOfWeek: 'Monday',
      startTime: '08:00',
      endTime: '09:30',
      teacherId: teacher.id,
    },
  });

  const session = await db.batchSession.create({
    data: {
      id: '99999999-9999-4999-a999-999999999991',
      instituteId: institute.id,
      batchId: batchA.id,
      date: new Date('2025-05-05'),
      startTime: '08:00',
      endTime: '09:30',
      status: 'completed',
      attendanceTaken: true,
      source: 'manual',
    },
  });

  // 8. Attendance
  await db.attendance.createMany({
    data: [
      {
        instituteId: institute.id,
        sessionId: session.id,
        enrollmentId: enroll1A.id,
        status: 'present',
      },
      {
        instituteId: institute.id,
        sessionId: session.id,
        enrollmentId: enroll2A.id,
        status: 'absent',
      },
    ],
  });

  // 9. Homework, Tests & Marks
  await db.homework.create({
    data: {
      instituteId: institute.id,
      batchId: batchA.id,
      title: 'Newton Laws Problem Set 1',
      description: 'Solve questions 1 to 15 from Chapter 3',
      publishedAt: new Date(),
    },
  });

  const test = await db.test.create({
    data: {
      instituteId: institute.id,
      batchId: batchA.id,
      title: 'Kinematics Unit Test 1',
      maximumMarks: 100,
      scheduledDate: new Date('2025-05-10'),
      status: 'published',
    },
  });

  await db.marks.create({
    data: {
      instituteId: institute.id,
      testId: test.id,
      enrollmentId: enroll1A.id,
      marksObtained: 88.5,
    },
  });

  // 10. Billing Plan, Invoices, Payments, Receipts
  const plan = await db.billingPlan.create({
    data: {
      enrollmentId: enroll1A.id,
      type: 'monthly',
      amount: 3500.0,
      billingStartDate: new Date('2025-04-01'),
    },
  });

  const invoice = await db.invoice.create({
    data: {
      billingPlanId: plan.id,
      amount: 3500.0,
      dueDate: new Date('2025-04-10'),
      status: 'paid',
    },
  });

  const payment = await db.payment.create({
    data: {
      invoiceId: invoice.id,
      amount: 3500.0,
      paymentMode: 'upi',
      receivedOn: new Date('2025-04-05'),
      collectedBy: founder.id,
      remarks: 'Paid via PhonePe',
    },
  });

  await db.receipt.create({
    data: {
      instituteId: institute.id,
      paymentId: payment.id,
      receiptNumber: 'RCP-2025-0001',
    },
  });

  // 11. Announcements
  await db.announcement.create({
    data: {
      instituteId: institute.id,
      batchId: batchA.id,
      title: 'Extra Physics Problem Solving Session on Sunday',
      body: 'All students must attend the special session scheduled for 10 AM on Sunday.',
      publishedAt: new Date(),
    },
  });

  console.log('✅ Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Seeding failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
