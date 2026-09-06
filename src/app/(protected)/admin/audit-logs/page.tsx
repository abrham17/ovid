import React from 'react';
import { db } from '@/lib/db';
import { requireUser } from '@/lib/rbac';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ShieldCheck, FileText, User, Calendar, Tag } from 'lucide-react';

export default async function AuditLogsPage() {
  const user = await requireUser();

  const auditLogs = await db.auditLog.findMany({
    take: 100,
    orderBy: { changedAt: 'desc' },
    include: {
      user: {
        select: {
          fullName: true,
          email: true,
          role: true,
        },
      },
      project: {
        select: {
          code: true,
          name: true,
        },
      },
    },
  });

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            IT & Admin Governance Audit Log Inspector
          </h1>
          <p className="text-sm text-muted-foreground">
            ISO 9001 §7.5.3 Complete Record Traceability & Rationale Log
          </p>
        </div>
        <Badge variant="outline" className="text-xs px-3 py-1">
          <ShieldCheck className="w-3.5 h-3.5 mr-1 text-green-600" />
          IT Department & Admin Oversight
        </Badge>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>System Mutations & CRUD Audit Logs (Last 100 Events)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-muted-foreground uppercase bg-muted/50">
                <tr>
                  <th className="px-4 py-3">Timestamp</th>
                  <th className="px-4 py-3">Actor / Role</th>
                  <th className="px-4 py-3">Entity Domain</th>
                  <th className="px-4 py-3">Action</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Typed Justification / Rationale</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-muted/30">
                    <td className="px-4 py-3 whitespace-nowrap text-xs font-mono text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(log.changedAt).toLocaleString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 font-medium">
                        <User className="w-3.5 h-3.5 text-blue-600" />
                        {log.user.fullName}
                      </div>
                      <div className="text-xs text-muted-foreground">{log.userRole || log.user.role}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant="secondary" className="font-mono text-xs">
                        {log.entityType}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        variant={
                          log.action === 'CREATE'
                            ? 'default'
                            : log.action === 'DELETE'
                            ? 'destructive'
                            : 'outline'
                        }
                      >
                        {log.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {log.project ? `${log.project.code}` : '-'}
                    </td>
                    <td className="px-4 py-3 text-xs max-w-xs truncate italic text-muted-foreground">
                      {log.reason || 'Standard system mutation'}
                    </td>
                  </tr>
                ))}
                {auditLogs.length === 0 && (
                  <tr>
                    <td colSpan={6} className="text-center py-8 text-muted-foreground">
                      No audit log entries recorded yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
