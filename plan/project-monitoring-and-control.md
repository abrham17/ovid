# Project monitoring and control — analysis and plan

Focus
Assess whether the PMS supports a true control cycle (monitor → detect variance → act → verify).

Existing capabilities
- Notifications, executive intervention model, oversight assignments, daily entries for earthwork/structure/rebar, measurement & BOQ models.

Gaps
1. No automated KPI engine producing alerts on variances (time/cost/quality)
2. No documented corrective action lifecycle linking issue detection (from daily entries, ITRs, safety incidents) to actions and verification closure
3. No dashboarding API or scheduled jobs creating aggregated metrics for management reporting

Required additions
- KPI engine `src/lib/services/kpi.ts` that consumes ProgressEntries, Cost data, Quality incidents, and emits Alerts when thresholds crossed
- Alert/Audit artifacts: `Alert` model, and link to ExecutiveIntervention or CorrectiveAction
- CorrectiveAction model (if ExecutiveIntervention used, standardize fields) and workflow: detected → action assigned → implemented → verified
- Scheduled jobs to compute weekly/monthly management reports and persist snapshots

Files to add/change
- prisma/schema.prisma: add Alert, CorrectiveAction models
- src/lib/services/kpi.ts, report-generator.ts
- src/app/api/dashboard endpoints to fetch KPI snapshots and alerts

Priority
- KPI engine & alerts: high
- Corrective action lifecycle: medium

Verification
- Simulate triggers (e.g., progress falloff) and confirm alerts are created and actions track to closure

