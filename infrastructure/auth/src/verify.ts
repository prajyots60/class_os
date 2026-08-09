import { auth } from './auth';
import { db } from '@coaching-os/database';
import { requireInstituteMembership } from './session';

export async function verifyAuthFoundation() {
  console.log('🔍 Executing CoachingOS Better Auth 1.6.26 End-to-End Verification...');

  try {
    // 1. Verify Demo User in Database
    const demoUser = await db.user.findFirst({
      where: { email: 'rakesh@sharmaclasses.com' },
      include: { institute: true },
    });

    if (!demoUser || !demoUser.instituteId || !demoUser.institute) {
      throw new Error(
        'Verification failed: Demo user rakesh@sharmaclasses.com not found or missing institute. Run db:seed first.',
      );
    }

    const demoInstituteId = demoUser.instituteId;

    console.log(`✅ Demo User Verified: ${demoUser.name} (${demoUser.email})`);
    console.log(`   Institute: ${demoUser.institute.name} (ID: ${demoInstituteId})`);

    // 2. Verify Better Auth Instance & Handlers
    if (!auth || typeof auth.handler !== 'function') {
      throw new Error('Verification failed: Better Auth server handler is invalid.');
    }
    console.log('✅ Better Auth 1.6.26 Server Instance initialized successfully.');

    // 3. Test Credential Account Registration & Authentication via Better Auth API
    const testEmail = `auth_test_${Date.now()}@sharmaclasses.com`;
    const testPassword = 'SecureTestPassword123!';

    // Sign up a test user using Better Auth API
    const signUpResult = await auth.api.signUpEmail({
      body: {
        email: testEmail,
        password: testPassword,
        name: 'Auth Verification Tester',
      },
    });

    if (!signUpResult || !signUpResult.user) {
      throw new Error('Verification failed: Better Auth signUpEmail did not return a valid user.');
    }

    console.log(`✅ Better Auth Sign-Up Succeeded: User ID ${signUpResult.user.id}`);

    // Update created test user's instituteId so tenant membership check passes
    await db.user.update({
      where: { id: signUpResult.user.id },
      data: { instituteId: demoInstituteId },
    });

    // 4. Test Sign-In and Session Creation
    const signInResult = await auth.api.signInEmail({
      body: {
        email: testEmail,
        password: testPassword,
      },
      asResponse: true,
    });

    const setCookieHeader = signInResult.headers.get('set-cookie');
    if (!setCookieHeader) {
      throw new Error(
        'Verification failed: Better Auth signInEmail did not issue a set-cookie header.',
      );
    }

    console.log('✅ Better Auth Sign-In Succeeded: Session cookie issued safely.');

    // Extract session token from cookie
    const tokenMatch = setCookieHeader.match(/better-auth\.session_token=([^;]+)/);
    const sessionToken = tokenMatch ? tokenMatch[1] : null;

    if (!sessionToken) {
      throw new Error(
        'Verification failed: Session token could not be extracted from auth cookie.',
      );
    }

    // 5. Test Server-Side Session Retrieval
    const mockAuthHeaders = new Headers();
    mockAuthHeaders.set('cookie', `better-auth.session_token=${sessionToken}`);

    const retrievedSession = await auth.api.getSession({
      headers: mockAuthHeaders,
    });

    if (!retrievedSession || retrievedSession.user.id !== signUpResult.user.id) {
      throw new Error(
        'Verification failed: Server-side getSession failed to return matching authenticated user.',
      );
    }

    console.log(
      `✅ Server-Side Session Retrieval Succeeded: Active session for user ${retrievedSession.user.email}`,
    );

    // 6. Test Authorized Tenant Context Resolution
    const tenantContext = await requireInstituteMembership(mockAuthHeaders, demoInstituteId);
    if (tenantContext.instituteId !== demoInstituteId || tenantContext.role !== 'owner') {
      throw new Error(
        'Verification failed: Tenant context resolution returned invalid institute or role.',
      );
    }

    console.log(
      `✅ Tenant Context Verification Succeeded: Institute ${tenantContext.instituteId}, Role: ${tenantContext.role}`,
    );

    // 7. Test Unauthorized Institute Access Rejection
    const fakeInstituteId = '00000000-0000-4000-a000-000000000000';
    let unauthorizedRejected = false;
    try {
      await requireInstituteMembership(mockAuthHeaders, fakeInstituteId);
    } catch {
      unauthorizedRejected = true;
    }

    if (!unauthorizedRejected) {
      throw new Error('Verification failed: Access to unauthorized institute was not rejected.');
    }
    console.log('✅ Unauthorized Institute Access correctly rejected.');

    // 8. Test Session Revocation / Sign Out
    await auth.api.signOut({
      headers: mockAuthHeaders,
    });

    const sessionAfterRevoke = await auth.api.getSession({
      headers: mockAuthHeaders,
    });

    if (sessionAfterRevoke) {
      throw new Error('Verification failed: Session was not revoked.');
    }

    console.log('✅ Session Revocation / Sign-Out Succeeded: Revoked session returns null.');

    // Clean up created test user
    await db.user.delete({ where: { id: signUpResult.user.id } });

    console.log('\n🎉 ALL BETTER AUTH 1.6.26 END-TO-END VERIFICATION CHECKS PASSED!\n');
    return true;
  } catch (error) {
    console.error('❌ Auth Verification Failed:', error);
    return false;
  } finally {
    await db.$disconnect();
  }
}

verifyAuthFoundation()
  .then((success) => process.exit(success ? 0 : 1))
  .catch(() => process.exit(1));
