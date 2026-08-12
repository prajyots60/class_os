'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@coaching-os/ui';
import { X, User, Phone, Mail, MapPin, Calendar, Hash, Users } from 'lucide-react';
import { StudentAdmissionStatusBadge, StudentStatusBadge } from './student-status-badge';
import type { StudentDTO } from '../types/student-ui.types';
import { StudentGuardiansList } from '../../guardian';

export interface StudentDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  student: StudentDTO | null;
  userCapabilities?: string[];
}

export function StudentDetailsModal({
  isOpen,
  onClose,
  student,
  userCapabilities = [],
}: StudentDetailsModalProps) {
  const [activeTab, setActiveTab] = useState<'profile' | 'guardians'>('profile');

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen || !student) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="student-details-title"
    >
      <div className="relative w-full max-w-xl bg-[hsl(var(--card))] border border-[hsl(var(--border))] rounded-xl shadow-2xl overflow-hidden my-8">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.3)]">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-base">
              {student.firstName[0]}
              {student.lastName[0]}
            </div>
            <div>
              <h2 id="student-details-title" className="text-lg font-bold text-[hsl(var(--foreground))]">
                {student.displayName}
              </h2>
              <div className="flex items-center gap-2 mt-0.5">
                <StudentAdmissionStatusBadge status={student.admissionStatus} />
                <StudentStatusBadge status={student.status} />
              </div>
            </div>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} aria-label="Close modal" className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Navigation Tabs Bar */}
        <div className="flex border-b border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.15)] px-6 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('profile')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'profile'
                ? 'border-primary text-primary'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
            data-testid="student-profile-tab"
          >
            <User className="h-3.5 w-3.5" />
            <span>Profile & Admission</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('guardians')}
            className={`pb-2.5 px-4 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1.5 ${
              activeTab === 'guardians'
                ? 'border-primary text-primary'
                : 'border-transparent text-[hsl(var(--muted-foreground))] hover:text-[hsl(var(--foreground))]'
            }`}
            data-testid="student-guardians-tab"
          >
            <Users className="h-3.5 w-3.5" />
            <span>Guardians</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 space-y-6 text-sm max-h-[70vh] overflow-y-auto">
          {activeTab === 'profile' ? (
            <>
              {/* Identity & Admission Details */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-2">
                  <Hash className="h-4 w-4 text-primary" /> Identity & Admission
                </h3>
                <div className="grid grid-cols-2 gap-4 bg-[hsl(var(--muted)/0.3)] p-4 rounded-lg border border-[hsl(var(--border))]">
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Admission Number</span>
                    <p className="font-mono text-sm font-semibold text-[hsl(var(--foreground))]">
                      {student.admissionNumber}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Gender</span>
                    <p className="font-medium text-[hsl(var(--foreground))] capitalize">{student.gender || 'Not specified'}</p>
                  </div>
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Date of Birth</span>
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {student.dateOfBirth ? new Date(student.dateOfBirth).toLocaleDateString() : 'Not provided'}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs text-[hsl(var(--muted-foreground))]">Admission Date</span>
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {student.admissionDate ? new Date(student.admissionDate).toLocaleDateString() : 'Not admitted yet'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Contact Details */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-2">
                  <User className="h-4 w-4 text-primary" /> Contact Information
                </h3>
                <div className="space-y-3 bg-[hsl(var(--muted)/0.3)] p-4 rounded-lg border border-[hsl(var(--border))]">
                  <div className="flex items-center gap-3">
                    <Phone className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    <div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Phone Number</span>
                      <p className="font-medium text-[hsl(var(--foreground))]">{student.phone || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Mail className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0" />
                    <div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Email Address</span>
                      <p className="font-medium text-[hsl(var(--foreground))]">{student.email || 'Not provided'}</p>
                    </div>
                  </div>
                  <div className="flex items-start gap-3">
                    <MapPin className="h-4 w-4 text-[hsl(var(--muted-foreground))] shrink-0 mt-1" />
                    <div>
                      <span className="text-xs text-[hsl(var(--muted-foreground))]">Address</span>
                      <p className="font-medium text-[hsl(var(--foreground))]">
                        {[student.address, student.city, student.state, student.postalCode].filter(Boolean).join(', ') ||
                          'No address recorded'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Timestamps */}
              <div>
                <h3 className="text-xs font-semibold uppercase tracking-wider text-[hsl(var(--muted-foreground))] mb-3 flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-primary" /> Audit Metadata
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs text-[hsl(var(--muted-foreground))]">
                  <div>
                    <span>Created Record:</span>
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {new Date(student.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span>Last Updated:</span>
                    <p className="font-medium text-[hsl(var(--foreground))]">
                      {new Date(student.updatedAt).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <StudentGuardiansList
              studentId={student.id}
              userCapabilities={userCapabilities}
            />
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-4 border-t border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.2)]">
          <Button variant="outline" size="sm" onClick={onClose}>
            Close Details
          </Button>
        </div>
      </div>
    </div>
  );
}
