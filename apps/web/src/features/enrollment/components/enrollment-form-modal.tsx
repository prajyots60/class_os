'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, UserPlus } from 'lucide-react';
import type { StudentSummary, BatchSummary, CreateEnrollmentFormValues } from '../types/enrollment-ui.types';

export interface EnrollmentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateEnrollmentFormValues) => Promise<{ success: boolean; error?: string }>;
  students: StudentSummary[];
  batches: BatchSummary[];
  isLoadingStudentsAndBatches?: boolean;
}

export function EnrollmentFormModal({
  isOpen,
  onClose,
  onSubmit,
  students,
  batches,
  isLoadingStudentsAndBatches = false,
}: EnrollmentFormModalProps) {
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [selectedBatchId, setSelectedBatchId] = useState<string>('');
  const [status, setStatus] = useState<'pending' | 'active'>('active');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setSelectedStudentId('');
      setSelectedBatchId('');
      setStatus('active');
      setErrorMsg(null);
    }
  }

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStudentId || !selectedBatchId) {
      setErrorMsg('Please select both a student and a batch.');
      return;
    }

    setIsSubmitting(true);
    setErrorMsg(null);

    const result = await onSubmit({
      studentId: selectedStudentId,
      batchId: selectedBatchId,
      status,
    });

    setIsSubmitting(false);

    if (result.success) {
      onClose();
    } else if (result.error) {
      setErrorMsg(result.error);
    }
  };

  const selectedStudent = students.find((s) => s.id === selectedStudentId);
  const selectedBatch = batches.find((b) => b.id === selectedBatchId);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="enrollment-form-title"
      data-testid="enrollment-form-modal"
    >
      <div className="relative w-full max-w-md bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 id="enrollment-form-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
              Add Student Enrollment
            </h2>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-sm" data-testid="create-enrollment-form">
          {errorMsg && (
            <div
              id="enrollment-form-error"
              className="p-3 text-xs rounded-md bg-rose-50 border border-rose-200 text-rose-700 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-300"
              role="alert"
              aria-live="polite"
              data-testid="enrollment-form-error"
            >
              {errorMsg}
            </div>
          )}

          {/* Student Selector */}
          <div className="space-y-1.5">
            <label htmlFor="student-select" className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Select Admitted Student <span className="text-rose-500">*</span>
            </label>
            <select
              id="student-select"
              value={selectedStudentId}
              onChange={(e) => setSelectedStudentId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              required
              aria-required="true"
              aria-invalid={!selectedStudentId && !!errorMsg}
              aria-describedby={errorMsg ? 'enrollment-form-error' : undefined}
              data-testid="student-select-dropdown"
              disabled={isLoadingStudentsAndBatches || isSubmitting}
            >
              <option value="">-- Choose Admitted Student --</option>
              {students.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.displayName} ({student.admissionNumber})
                </option>
              ))}
            </select>
            {selectedStudent && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Selected: {selectedStudent.displayName} | Status: {selectedStudent.admissionStatus}
              </p>
            )}
          </div>

          {/* Batch Selector */}
          <div className="space-y-1.5">
            <label htmlFor="batch-select" className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Select Target Batch <span className="text-rose-500">*</span>
            </label>
            <select
              id="batch-select"
              value={selectedBatchId}
              onChange={(e) => setSelectedBatchId(e.target.value)}
              className="w-full h-10 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              required
              aria-required="true"
              aria-invalid={!selectedBatchId && !!errorMsg}
              aria-describedby={errorMsg ? 'enrollment-form-error' : undefined}
              data-testid="batch-select-dropdown"
              disabled={isLoadingStudentsAndBatches || isSubmitting}
            >
              <option value="">-- Choose Target Batch --</option>
              {batches.map((batch) => (
                <option key={batch.id} value={batch.id}>
                  {batch.name} {batch.code ? `(${batch.code})` : ''} — Cap: {batch.capacity}
                </option>
              ))}
            </select>
            {selectedBatch && (
              <p className="text-[11px] text-[hsl(var(--muted-foreground))]">
                Selected: {selectedBatch.name} | Capacity: {selectedBatch.capacity} | Status: {selectedBatch.status}
              </p>
            )}
          </div>

          {/* Initial Status */}
          <div className="space-y-1.5">
            <label htmlFor="status-select" className="text-xs font-semibold text-[hsl(var(--foreground))]">
              Initial Enrollment Status
            </label>
            <select
              id="status-select"
              value={status}
              onChange={(e) => setStatus(e.target.value as 'pending' | 'active')}
              className="w-full h-10 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))] focus:outline-none focus:ring-2 focus:ring-[hsl(var(--ring))]"
              data-testid="initial-status-dropdown"
              disabled={isSubmitting}
            >
              <option value="active">Active</option>
              <option value="pending">Pending</option>
            </select>
          </div>

          {/* Footer */}
          <div className="flex justify-end gap-2 pt-4 border-t border-[hsl(var(--border))]">
            <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting || !selectedStudentId || !selectedBatchId} data-testid="submit-enrollment-button">
              {isSubmitting ? 'Enrolling...' : 'Submit Enrollment'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
