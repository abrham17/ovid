# Risk and Issue Management — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 31000:2018 (Risk management guidelines), ISO 10006:2017 §7.5 (Risk management in projects), ISO 9001:2015 §6.1 (Actions to address risks and opportunities).
- **Principle**: Risks must be systematically identified, categorized (`DESIGN`, `PROCUREMENT`, `WEATHER`, `FINANCIAL`, etc.), assessed ($Likelihood \times Impact$), assigned to a named owner, provided with mitigation plans, and linked directly to operational realities (stoppages, variation orders, decision logs).

## 2. Where it Applies to Project Management
Applies across risk registers, site issue logs, work stoppages, delay claims, material shortage alerts, and financial risk contingency allocations.

## 3. What the Current Code Does
- `prisma/schema.prisma` implements `RiskEntry` (`category`, `likelihood`, `impact`, `ownerId`, `mitigationPlan`, `status`, `realizedAsStoppageId`, `realizedAsVariationId`).
- `src/lib/services/risk.service.ts` provides CRUD operations and realizes risks into stoppage entries or variation orders.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model RiskEntry`, `model StoppageEntry`, `model VariationOrder`)
- `src/lib/services/risk.service.ts`
- `src/lib/services/stoppage.service.ts`
- `src/app/api/projects/[id]/risks/route.ts`

## 5. Compliance Status
**Fully Aligned (Risk Model & Stoppage Linkage)** / **Partially Compliant (Risk Heatmap Matrix)**

## 6. Exact Gap
1. Risk score calculation ($Likelihood \times Impact$) is performed client-side dynamically, but is not persisted as a dedicated database column for indexing/sorting in risk heatmaps.
2. Automated notifications are not dispatched to risk owners when high-severity risks ($Score \ge 15$) remain unmitigated past their review dates.

## 7. Why the Gap Matters
Unmonitored high-severity risks risk deteriorating into unmitigated work stoppages or cost overruns without executive visibility.

## 8. Required Architectural / Design Change
- Update `risk.service.ts` to calculate risk score ($Likelihood \times Impact$) and dispatch notifications via `notification.service.ts` when a risk score $\ge 15$ is created or updated.
- Render a 5x5 Risk Heatmap matrix in the project risk register UI.

## 9. Required Database Change
- Existing `RiskEntry` schema in `prisma/schema.prisma` is fully aligned and includes relations to `StoppageEntry` and `VariationOrder`.

## 10. Required Backend / API Change
- Update `src/lib/services/risk.service.ts`:
  - On `realizeRisk()`, atomically create linked `StoppageEntry` or `VariationOrder` and set `RiskEntry.status = REALIZED`.
  - Dispatch `RISK_UNASSIGNED` or high-severity risk notification.

## 11. Required Frontend / UI Change
- Update risk register tab (`src/components/projects/risk-tab.tsx`) to display a **5x5 Risk Heatmap Matrix** (Likelihood vs Impact grid).
- Provide "Realize as Stoppage" action button for site engineers.

## 12. Required Workflow Change
1. Risk identified and scored ($Likelihood \times Impact$).
2. Risk materializes on site $\rightarrow$ Site Engineer clicks "Realize as Stoppage".
3. System creates `StoppageEntry`, links it to `RiskEntry`, sets `status = REALIZED`, and notifies PM.

## 13. Dependencies
- Stoppage service (`stoppage.service.ts`).
- Notification service (`notification.service.ts`).

## 14. Implementation Priority
**Medium (Phase 7)**

## 15. Acceptance / Verification Criteria
- Realizing a risk creates a `StoppageEntry` record with matching `projectId` and `wbsNodeId`.
- 5x5 Heatmap accurately plots risks into low, medium, high, and critical threat quadrants.
