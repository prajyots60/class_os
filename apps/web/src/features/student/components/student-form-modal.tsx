'use client';

import React, { useState, useEffect } from 'react';
import { Button, Input } from '@coaching-os/ui';
import { X, Loader2, AlertCircle } from 'lucide-react';
import type { StudentDTO, CreateStudentFormValues, EditStudentFormValues } from '../types/student-ui.types';

export interface StudentFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: CreateStudentFormValues | EditStudentFormValues) => Promise<void>;
  student?: StudentDTO | null; // Null for Create mode, StudentDTO for Edit mode
  isSubmitting: boolean;
  serverError?: string | null;
}

export function StudentFormModal({
  isOpen,
  onClose,
  onSubmit,
  student,
  isSubmitting,
  serverError,
}: StudentFormModalProps) {
  const isEditMode = !!student;

  // Form State
  const [admissionNumber, setAdmissionNumber] = useState('');
  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<'male' | 'female' | 'other' | 'prefer_not_to_say' | ''>('');
  const [dateOfBirth, setDateOfBirth] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [state, setState] = useState('');
  const [postalCode, setPostalCode] = useState('');

  // Validation Errors State
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const [prevStudent, setPrevStudent] = useState<StudentDTO | null | undefined>(undefined);
  const [prevIsOpen, setPrevIsOpen] = useState<boolean>(false);

  if (student !== prevStudent || isOpen !== prevIsOpen) {
    setPrevStudent(student);
    setPrevIsOpen(isOpen);
    if (student) {
      setAdmissionNumber(student.admissionNumber);
      setFirstName(student.firstName || '');
      setMiddleName(student.middleName || '');
      setLastName(student.lastName || '');
      setGender(student.gender || '');
      setDateOfBirth(student.dateOfBirth ? student.dateOfBirth.split('T')[0] : '');
      setPhone(student.phone || '');
      setEmail(student.email || '');
      setAddress(student.address || '');
      setCity(student.city || '');
      setState(student.state || '');
      setPostalCode(student.postalCode || '');
    } else {
      setAdmissionNumber('');
      setFirstName('');
      setMiddleName('');
      setLastName('');
      setGender('');
      setDateOfBirth('');
      setPhone('');
      setEmail('');
      setAddress('');
      setCity('');
      setState('');
      setPostalCode('');
    }
    setFieldErrors({});
  }

  // Keyboard accessibility: Escape key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, isSubmitting, onClose]);

  if (!isOpen) return null;

  const validateForm = (): boolean => {
    const errors: Record<string, string> = {};

    if (!isEditMode && !admissionNumber.trim()) {
      errors.admissionNumber = 'Admission number is required.';
    }

    if (!firstName.trim()) {
      errors.firstName = 'First name is required.';
    }

    if (!lastName.trim()) {
      errors.lastName = 'Last name is required.';
    }

    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (phone.trim() && !/^\+?[1-9]\d{1,14}$/.test(phone.trim().replace(/[\s-]/g, ''))) {
      errors.phone = 'Please enter a valid phone number (e.g. +919876543210).';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;

    if (!validateForm()) return;

    const values: CreateStudentFormValues | EditStudentFormValues = isEditMode
      ? {
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim(),
          gender: gender || undefined,
          dateOfBirth: dateOfBirth || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        }
      : {
          admissionNumber: admissionNumber.trim(),
          firstName: firstName.trim(),
          middleName: middleName.trim() || undefined,
          lastName: lastName.trim(),
          gender: gender || undefined,
          dateOfBirth: dateOfBirth || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          postalCode: postalCode.trim() || undefined,
        };

    await onSubmit(values);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-modal-title"
    >
      <div className="relative w-full max-w-2xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <h2 id="student-modal-title" className="text-lg font-semibold text-[hsl(var(--foreground))]">
            {isEditMode ? 'Edit Student Profile' : 'Add New Student'}
          </h2>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            disabled={isSubmitting}
            aria-label="Close modal"
            className="h-8 w-8 p-0"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Server Error Alert */}
        {serverError && (
          <div className="p-4 mx-6 mt-4 rounded-lg bg-destructive/10 border border-destructive/20 flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-destructive shrink-0 mt-0.5" />
            <div className="text-xs text-destructive font-medium">{serverError}</div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Section: Identity & Admission */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
              Identity & Admission
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Admission Number */}
              <div className="md:col-span-3">
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                  Admission Number <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={admissionNumber}
                  onChange={(e) => setAdmissionNumber(e.target.value)}
                  disabled={isEditMode || isSubmitting}
                  placeholder="e.g. ADM-2026-001"
                  aria-invalid={!!fieldErrors.admissionNumber}
                  aria-describedby={fieldErrors.admissionNumber ? 'adm-error' : undefined}
                  className={fieldErrors.admissionNumber ? 'border-destructive' : ''}
                />
                {isEditMode && (
                  <p className="mt-1 text-[11px] text-[hsl(var(--muted-foreground))]">
                    Admission number is immutable by domain policy.
                  </p>
                )}
                {fieldErrors.admissionNumber && (
                  <p id="adm-error" className="mt-1 text-xs text-destructive">
                    {fieldErrors.admissionNumber}
                  </p>
                )}
              </div>

              {/* First Name */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                  First Name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="First name"
                  aria-invalid={!!fieldErrors.firstName}
                  className={fieldErrors.firstName ? 'border-destructive' : ''}
                />
                {fieldErrors.firstName && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.firstName}</p>
                )}
              </div>

              {/* Middle Name */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Middle Name</label>
                <Input
                  type="text"
                  value={middleName}
                  onChange={(e) => setMiddleName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Middle name"
                />
              </div>

              {/* Last Name */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">
                  Last Name <span className="text-destructive">*</span>
                </label>
                <Input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Last name"
                  aria-invalid={!!fieldErrors.lastName}
                  className={fieldErrors.lastName ? 'border-destructive' : ''}
                />
                {fieldErrors.lastName && (
                  <p className="mt-1 text-xs text-destructive">{fieldErrors.lastName}</p>
                )}
              </div>

              {/* Gender */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as 'male' | 'female' | 'other' | 'prefer_not_to_say' | '')}
                  disabled={isSubmitting}
                  className="w-full h-9 px-3 text-xs rounded-md border border-[hsl(var(--input))] bg-[hsl(var(--background))] text-[hsl(var(--foreground))]"
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="prefer_not_to_say">Prefer Not to Say</option>
                </select>
              </div>

              {/* Date of Birth */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Date of Birth</label>
                <Input
                  type="date"
                  value={dateOfBirth}
                  onChange={(e) => setDateOfBirth(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>
            </div>
          </div>

          {/* Section: Contact Details */}
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3">
              Contact & Address
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Phone */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Phone Number</label>
                <Input
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="+91 98765 43210"
                  aria-invalid={!!fieldErrors.phone}
                  className={fieldErrors.phone ? 'border-destructive' : ''}
                />
                {fieldErrors.phone && <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>}
              </div>

              {/* Email */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Email Address</label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="student@example.com"
                  aria-invalid={!!fieldErrors.email}
                  className={fieldErrors.email ? 'border-destructive' : ''}
                />
                {fieldErrors.email && <p className="mt-1 text-xs text-destructive">{fieldErrors.email}</p>}
              </div>

              {/* Address */}
              <div className="md:col-span-2">
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Street Address</label>
                <Input
                  type="text"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Flat, House no., Building, Street"
                />
              </div>

              {/* City */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">City</label>
                <Input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="City"
                />
              </div>

              {/* State */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">State</label>
                <Input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="State"
                />
              </div>

              {/* Postal Code */}
              <div>
                <label className="block text-xs font-medium text-[hsl(var(--foreground))] mb-1">Postal Code</label>
                <Input
                  type="text"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  disabled={isSubmitting}
                  placeholder="Postal Code"
                />
              </div>
            </div>
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-[hsl(var(--border))]">
            <Button variant="outline" type="button" onClick={onClose} disabled={isSubmitting}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} data-testid="student-form-submit-button" className="gap-2">
              {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {isEditMode ? 'Save Changes' : 'Add Student'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
}
