'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ROLE_LABELS } from '@/lib/constants';
import type { UserRole } from '@/generated/prisma/enums';
import { Trash2, Plus, Briefcase, Check, X, AlertCircle } from 'lucide-react';

interface BulkInviteFormProps {
  organizationId: string;
}

export function BulkInviteForm({ organizationId }: BulkInviteFormProps) {
  const [rows, setRows] = useState([
    { email: '', fullName: '', jobTitle: '', role: 'SITE_ENGINEER' as UserRole, phone: '' },
  ]);

  const addRow = () => {
    setRows([
      ...rows,
      { email: '', fullName: '', jobTitle: '', role: 'SITE_ENGINEER' as UserRole, phone: '' },
    ]);
  };

  const removeRow = (index: number) => {
    if (rows.length === 1) return;
    setRows(rows.filter((_, i) => i !== index));
  };

  const updateRow = (index: number, field: string, value: string) => {
    const updated = [...rows];
    updated[index] = { ...updated[index], [field]: value };
    setRows(updated);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} className="flex gap-2 items-center bg-muted/40 p-2 rounded-md">
            <input
              type="email"
              placeholder="Email address"
              value={row.email}
              onChange={(e) => updateRow(i, 'email', e.target.value)}
              className="px-2 py-1 text-sm border rounded w-1/4 bg-background"
              required
            />
            <input
              type="text"
              placeholder="Full Name"
              value={row.fullName}
              onChange={(e) => updateRow(i, 'fullName', e.target.value)}
              className="px-2 py-1 text-sm border rounded w-1/4 bg-background"
              required
            />
            <input
              type="text"
              placeholder="Job Title"
              value={row.jobTitle}
              onChange={(e) => updateRow(i, 'jobTitle', e.target.value)}
              className="px-2 py-1 text-sm border rounded w-1/4 bg-background"
              required
            />
            <select
              value={row.role}
              onChange={(e) => updateRow(i, 'role', e.target.value)}
              className="px-2 py-1 text-sm border rounded w-1/4 bg-background"
            >
              {Object.entries(ROLE_LABELS).map(([value, label]) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>
            {rows.length > 1 && (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => removeRow(i)}
                className="h-8 w-8 text-destructive"
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            )}
          </div>
        ))}
      </div>

      <div className="flex justify-between items-center pt-2">
        <Button type="button" variant="outline" size="sm" onClick={addRow}>
          <Plus className="w-4 h-4 mr-1" /> Add Person
        </Button>
        <Button type="button" size="sm" onClick={() => alert('Batch invitations processed.')}>
          Send Team Invitations
        </Button>
      </div>
    </div>
  );
}
