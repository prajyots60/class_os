'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle, Badge } from '@coaching-os/ui';
import { GraduationCap, Building2, BookOpen, UserCheck } from 'lucide-react';
import type { ParentHubProfileSummaryDTO } from '../types/parent-ui.types';

interface ChildSummaryCardProps {
  profile: ParentHubProfileSummaryDTO;
}

export function ChildSummaryCard({ profile }: ChildSummaryCardProps) {
  const linkedStudents = profile.linkedStudents;

  return (
    <Card className="shadow-sm border border-[hsl(var(--border))]">
      <CardHeader className="flex-row items-center justify-between pb-3 space-y-0">
        <div className="flex items-center gap-3">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[hsl(var(--primary)/0.15)] text-[hsl(var(--primary))] font-bold text-lg">
            {profile.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <CardTitle className="text-lg font-bold text-[hsl(var(--foreground))]">
              {profile.name}
            </CardTitle>
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              {linkedStudents.length === 0
                ? 'No students linked yet'
                : `${linkedStudents.length} student link${linkedStudents.length > 1 ? 's' : ''}`}
            </p>
          </div>
        </div>
        <Badge variant={linkedStudents.length > 0 ? 'default' : 'outline'}>
          {linkedStudents.length > 0 ? 'Active Student' : 'Unlinked'}
        </Badge>
      </CardHeader>

      <CardContent className="pt-2">
        {linkedStudents.length === 0 ? (
          <div className="rounded-md border border-dashed border-[hsl(var(--border))] p-4 text-center">
            <p className="text-xs text-[hsl(var(--muted-foreground))]">
              This child profile has no linked students. Contact your coaching institute to receive a student linking code.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {linkedStudents.map((student) => (
              <div
                key={student.linkId}
                className="rounded-lg border border-[hsl(var(--border))] bg-[hsl(var(--muted)/0.25)] p-3 text-sm"
              >
                <div className="flex items-center justify-between font-medium text-[hsl(var(--foreground))] pb-1.5 border-b border-[hsl(var(--border)/0.5)] mb-2">
                  <div className="flex items-center gap-1.5">
                    <GraduationCap className="h-4 w-4 text-[hsl(var(--primary))]" aria-hidden="true" />
                    <span>{student.fullName}</span>
                  </div>
                  <span className="text-xs text-[hsl(var(--muted-foreground))] font-mono">
                    {student.admissionNumber}
                  </span>
                </div>

                <div className="grid gap-1.5 text-xs text-[hsl(var(--muted-foreground))] sm:grid-cols-2">
                  <div className="flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="font-medium text-[hsl(var(--foreground))]">{student.instituteName}</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:justify-end">
                    <UserCheck className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="capitalize">{student.status}</span>
                  </div>
                </div>

                {student.enrollments.length > 0 && (
                  <div className="mt-2.5 pt-2 border-t border-[hsl(var(--border)/0.5)]">
                    <div className="flex items-center gap-1 text-[11px] font-medium text-[hsl(var(--muted-foreground))] mb-1">
                      <BookOpen className="h-3 w-3" aria-hidden="true" />
                      <span>Active Batches:</span>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {student.enrollments.map((enr) => (
                        <Badge
                          key={enr.id}
                          variant="secondary"
                          className="text-[10px] px-2 py-0.5"
                        >
                          {enr.batchName}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
