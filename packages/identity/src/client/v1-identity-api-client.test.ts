import { describe, it, expect, vi } from 'vitest';
import { V1IdentityApiClient } from './v1-identity-api-client';
import { V1ApiError } from '../application/dto/api-v1-response.dto';

describe('V1IdentityApiClient Client SDK', () => {
  const mockSuccessMeta = {
    requestId: 'req-1234-uuid',
    timestamp: '2026-08-12T12:00:00Z',
  };

  const mockPagination = {
    cursor: null,
    nextCursor: 'next-cursor-val',
    hasMore: true,
    pageSize: 20,
    total: 100,
  };

  it('1. fetches student collection with query parameters correctly formatted', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: [{ id: 'stu-1', firstName: 'Aarav', lastName: 'Sharma' }],
        pagination: mockPagination,
        meta: mockSuccessMeta,
      }),
    });

    const client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });

    const result = await client.students.list({
      search: 'Aarav',
      limit: 10,
      status: 'active',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/students?search=Aarav&limit=10&status=active',
      expect.objectContaining({
        method: 'GET',
        headers: expect.objectContaining({
          'Content-Type': 'application/json',
        }),
      }),
    );

    expect(result.data).toHaveLength(1);
    expect(result.data[0].id).toBe('stu-1');
    expect(result.pagination.hasMore).toBe(true);
    expect(result.meta.requestId).toBe('req-1234-uuid');
  });

  it('2. fetches single student by ID and unwraps data payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'stu-99', firstName: 'Priya', lastName: 'Verma' },
        meta: mockSuccessMeta,
      }),
    });

    const client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });

    const student = await client.students.getById('stu-99');

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/students/stu-99',
      expect.objectContaining({ method: 'GET' }),
    );
    expect(student.firstName).toBe('Priya');
  });

  it('3. sends PATCH mutation for student update with JSON payload', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        data: { id: 'stu-99', firstName: 'UpdatedName', lastName: 'Verma' },
        meta: mockSuccessMeta,
      }),
    });

    const client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });

    const updated = await client.students.update('stu-99', {
      firstName: 'UpdatedName',
    });

    expect(mockFetch).toHaveBeenCalledWith(
      'http://localhost:3000/api/v1/students/stu-99',
      expect.objectContaining({
        method: 'PATCH',
        body: JSON.stringify({ firstName: 'UpdatedName' }),
      }),
    );
    expect(updated.firstName).toBe('UpdatedName');
  });

  it('4. throws V1ApiError when response is HTTP 404', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 404,
      json: async () => ({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: 'Student not found.',
        },
        meta: mockSuccessMeta,
      }),
    });

    const client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });

    await expect(client.students.getById('ghost-id')).rejects.toThrow(V1ApiError);

    try {
      await client.students.getById('ghost-id');
    } catch (err: any) {
      expect(err).toBeInstanceOf(V1ApiError);
      expect(err.statusCode).toBe(404);
      expect(err.code).toBe('NOT_FOUND');
      expect(err.message).toBe('Student not found.');
      expect(err.requestId).toBe('req-1234-uuid');
    }
  });

  it('5. throws V1ApiError with validation details on 400 Bad Request', async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      json: async () => ({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid pagination limit.',
          details: [{ field: 'limit', issue: 'Must be <= 100' }],
        },
        meta: mockSuccessMeta,
      }),
    });

    const client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });

    try {
      await client.students.list({ limit: 1000 });
    } catch (err: any) {
      expect(err).toBeInstanceOf(V1ApiError);
      expect(err.statusCode).toBe(400);
      expect(err.code).toBe('VALIDATION_ERROR');
      expect(err.details).toEqual([{ field: 'limit', issue: 'Must be <= 100' }]);
    }
  });

  it('6. correctly handles guardians, staff, and enrollments namespaces', async () => {
    const mockFetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes('/api/v1/guardians/g-1/students')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: 'rel-1', studentId: 's-1', relationshipType: 'father' }],
            meta: mockSuccessMeta,
          }),
        });
      }
      if (url.includes('/api/v1/staff')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: 'mem-1', role: 'teacher' }],
            pagination: mockPagination,
            meta: mockSuccessMeta,
          }),
        });
      }
      if (url.includes('/api/v1/enrollments')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            success: true,
            data: [{ id: 'enr-1', status: 'enrolled' }],
            pagination: mockPagination,
            meta: mockSuccessMeta,
          }),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    const client = new V1IdentityApiClient({
      baseUrl: 'http://localhost:3000',
      fetchFn: mockFetch as any,
    });

    const guardianStudents = await client.guardians.getStudents('g-1');
    expect(guardianStudents[0].relationshipType).toBe('father');

    const staffList = await client.staff.list({ role: 'teacher' });
    expect(staffList.data[0].role).toBe('teacher');

    const enrollments = await client.enrollments.list({ status: 'enrolled' });
    expect(enrollments.data[0].status).toBe('enrolled');
  });
});
