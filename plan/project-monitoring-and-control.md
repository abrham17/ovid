# Project Monitoring and Control — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 21502:2020 §7.8 (Controlling project performance), ISO 10006:2017 §7.4 (Control of project execution), ISO 9001:2015 §9.1.3 (Analysis and evaluation).
- **Principle**: Monitoring must establish a closed-loop control cycle: measure performance against baselines ($PV, EV, AC$), identify variances, trigger automated exception alerts, log corrective/preventive action requests ($CAPA$), and track executive interventions to closure.

## 2. Where it Applies to Project Management
Applies to executive oversight, portfolio monitoring, exception flagging, executive interventions, and management escalation workflows.

## 3. What the Current Code Does
- `prisma/schema.prisma` defines `ExecutiveIntervention`, `ExecutiveInterventionEvent`, and `AuditFinding`.
- Services `executive-intervention.ts` and `compliance.service.ts` manage intervention lifecycles and audit findings.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model ExecutiveIntervention`, `model ExecutiveInterventionEvent`, `model AuditFinding`)
- `src/lib/executive-intervention.ts`
- `src/lib/services/dashboard.service.ts`
- `src/lib/services/compliance.service.ts`
- `src/app/api/executive-interventions/route.ts`

## 5. Compliance Status
**Partially Compliant**

## 6. Exact Gap
1. Creating an `ExecutiveIntervention` currently relies on manual user entry; the system does not automatically evaluate project metrics ($SPI < 0.85$, $CPI < 0.85$, open critical safety incidents $> 48$ hours) to auto-generate intervention alerts.
2. No automated escalation notification dispatches when executive interventions exceed their `dueAt` date without resolution.

## 7. Why the Gap Matters
Passive monitoring without automated exception triggers allows critical cost and schedule overruns to worsen undetected, failing to fulfill ISO closed-loop control requirements.

## 8. Required Architectural / Design Change
- Implement a **Monitoring Control Loop Evaluator** in `src/lib/services/dashboard.service.ts` that checks project variance metrics daily.
- Automatically create `ExecutiveIntervention` records when $SPI < 0.85$, $CPI < 0.85$, or open critical safety incidents exceed 48 hours.

## 9. Required Database Change
- Existing `ExecutiveIntervention` and `ExecutiveInterventionEvent` models in `prisma/schema.prisma` are fully aligned and support intervention event streams.

## 10. Required Backend / API Change
- Add `evaluateProjectControlMetrics(projectId)` to `src/lib/services/dashboard.service.ts`:
  - Fetch latest `ProgressSnapshot`.
  - If $SPI < 0.85$, auto-create `ExecutiveIntervention` (`category: SCHEDULE`, `priority: CRITICAL`, `requiredAction: "Submit Recovery Plan within 48h"`).
  - If $CPI < 0.85$, auto-create `ExecutiveIntervention` (`category: COST`, `priority: CRITICAL`, `requiredAction: "Submit Cost Realignment Proposal"`).

## 11. Required Frontend / UI Change
- Update executive portfolio dashboard (`src/components/dashboards/executive-portfolio-view.tsx`) with an **Executive Interventions Control Panel**.
- Display flagged variance alerts and resolution progress.

## 12. Required Workflow Change
1. Scheduled daily evaluation checks project metrics.
2. $SPI = 0.80$ detected $\rightarrow$ system auto-creates `ExecutiveIntervention` and notifies Senior PM and General Manager.
3. Senior PM submits response $\rightarrow$ General Manager reviews and closes upon verification.

## 13. Dependencies
- Progress snapshot service (`progress.service.ts`).
- Executive intervention service (`executive-intervention.ts`).

## 14. Implementation Priority
**High (Phase 5)**

## 15. Acceptance / Verification Criteria
- Simulating $SPI = 0.80$ automatically generates a `CRITICAL` `ExecutiveIntervention` record assigned to the Senior PM.
- Interventions log all response events in `ExecutiveInterventionEvent` with full audit history.
