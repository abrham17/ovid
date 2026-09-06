# Change management — analysis and plan

ISO refs
- ISO/IEC 12207 (configuration & change control) and ISO 9001 (control of changes)

Existing code & constructs
- VariationOrder model, ScheduleChangeRequest, CompanyApproval, SignOff

Gaps found
1. Changes to scope/schedule/cost are modeled (VariationOrder, ScheduleChangeRequest) but there is no consistent versioned baseline update flow connecting approvals to baseline updates and audit logs
2. Impact analysis capability missing (what downstream activities/costs are impacted)
3. PR and approval forms appear but no programmatic enforcement that approved change updates baselines and notifies stakeholders

Required changes
- Formalize `ChangeRequest` canonical model (if VariationOrder and ScheduleChangeRequest are separate, unify into ChangeRequest with type discriminator)
- Implement ImpactAnalysis service that can compute affected activities, resource allocations and cost delta, using scheduler and BOQ/cost models
- When ChangeRequest is approved: create ProjectBaseline snapshot and persist change delta; link to AuditLog and SignOffs
- Provide endpoints and UI to review impact reports and confirm baselines updated post-approval

Files to change
- prisma/schema.prisma: add ChangeRequest model if necessary; extend VariationOrder to reference baseline snapshot
- src/lib/services/change.ts with impact analysis and applyChange functions
- UI: Change Request review workflow with impact report

Verification
- Approval of a change creates an auditable baseline and corresponding approval records; impact report matches subsequent schedule recalculation

Priority
- Baseline update automation on approval: critical
- Impact analysis: high

