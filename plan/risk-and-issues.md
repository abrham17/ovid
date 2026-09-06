# Risk and Issues — analysis and plan

Current models
- RiskEntry with category, status, ownerId, mitigation fields; AuditFinding exists for audits; SafetyObservation and SafetyIncident models for HSE

Gaps
1. RiskEntry lacks time-series of risk likelihood/impact changes (no risk history)
2. No formal linkage of risks to WBS nodes/activities/tasks visible (RiskEntry has projectId and may relate to WbsNode but ensure consistent foreign key)
3. No escalation/closure policies nor automated reminders

Required changes
- Add `RiskAssessment` historical table capturing periodic likelihood/impact ratings, comments and assessor
- Enforce link to owned work items via wbsNodeId and activityId optional fields
- Add workflows: risk.acceptOwnership, risk.mitigate, risk.close with SignOff and AuditLog entries
- Alerts on high-priority risks to ExecutiveIntervention

Files
- prisma/schema.prisma: RiskAssessment model
- src/lib/services/risk.ts: functions for assessments and alerts
- UI: Risk register with history and link-to-activity

Verification
- Risk history entries present for risk changes; alerts create executive interventions

Priority
- Risk history & linkage: high

