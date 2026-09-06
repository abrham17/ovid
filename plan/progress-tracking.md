# Project Progress Tracking — ISO Alignment Analysis & Plan

## 1. ISO Requirement / Principle
- **Standards**: ISO 10006:2017 §7.4 (Progress measurement & EVM), ISO 21502:2020 §7.8 (Controlling project performance), ISO 9001:2015 §9.1 (Monitoring, measurement, analysis, and evaluation).
- **Principle**: Project progress must be calculated bottom-up using verified physical quantities ($m^3$ concrete, $kg$ rebar, $m^2$ formwork) certified against BOQ target quantities, rather than subjective percentage estimates. Earned Value Management ($EVM$) metrics ($PV, EV, AC, CPI, SPI$) and historical S-curves must be maintained.

## 2. Where it Applies to Project Management
Applies to physical progress measurement, WBS node rollup, financial IPC certification, schedule performance analysis, and executive dashboard progress reporting.

## 3. What the Current Code Does
- `src/lib/services/progress.service.ts` calculates bottom-up physical quantity progress by summing certified entries from `EarthworkDailyEntry`, `StructureDailyEntry`, `RebarDailyEntry`, and `MeasurementEntry`.
- `src/lib/weight-math.ts` rolls up leaf progress through the WBS tree using `weightPercent` values.

## 4. Relevant Files / Modules / Database Entities
- `prisma/schema.prisma` (`model WbsNode`, `model BoqItem`, `model MeasurementEntry`)
- `src/lib/services/progress.service.ts`
- `src/lib/weight-math.ts`
- `src/app/api/projects/[id]/progress/route.ts`

## 5. Compliance Status
**Fully Aligned (Physical Progress Engine)** / **Partially Compliant (EVM S-Curve Snapshot Persistence)**

## 6. Exact Gap
1. While physical progress is calculated accurately on demand, the system lacks a scheduled snapshot entity (`ProgressSnapshot`) to store daily/weekly historical progress records.
2. S-curve charts in the UI cannot be rendered historically without snapshot time-series data.

## 7. Why the Gap Matters
Without time-series `ProgressSnapshot` records, project controls cannot track schedule performance trends over time, calculate Schedule Variance ($SV = EV - PV$), or display S-curve progress vs baseline curves.

## 8. Required Architectural / Design Change
- Implement a **Progress Snapshot Engine** in `src/lib/services/progress.service.ts` that captures daily/weekly time-series snapshots of $PV, EV, AC, CPI, SPI$ for every active project.
- Expose an S-curve API endpoint returning historical progress data arrays.

## 9. Required Database Change
Add `model ProgressSnapshot` in `prisma/schema.prisma`:
```prisma
model ProgressSnapshot {
  id               String   @id @default(cuid())
  projectId        String
  snapshotDate     DateTime @db.Date
  plannedValue     Decimal  @db.Decimal(18, 2) // PV
  earnedValue      Decimal  @db.Decimal(18, 2) // EV
  actualCost       Decimal  @db.Decimal(18, 2) // AC
  physicalPercent  Decimal  @db.Decimal(6, 2)
  scheduleVariance Decimal  @db.Decimal(18, 2) // SV = EV - PV
  costVariance     Decimal  @db.Decimal(18, 2) // CV = EV - AC
  cpi              Decimal  @db.Decimal(6, 3)  // CPI = EV / AC
  spi              Decimal  @db.Decimal(6, 3)  // SPI = EV / PV
  createdAt        DateTime @default(now())

  project Project @relation(fields: [projectId], references: [id], onDelete: Cascade)

  @@unique([projectId, snapshotDate])
  @@index([projectId, snapshotDate])
}
```

## 10. Required Backend / API Change
- Add `captureProgressSnapshot(projectId)` in `src/lib/services/progress.service.ts`.
- Expose endpoint `GET /api/projects/:id/progress/history` returning `ProgressSnapshot[]`.

## 11. Required Frontend / UI Change
- Update project overview workspace (`src/components/projects/workspace.tsx`) with an **S-Curve Chart Component** (Planned vs Earned vs Actual Cost over time).
- Display EVM KPI cards ($CPI$, $SPI$, $SV$, $CV$).

## 12. Required Workflow Change
1. Site daily entries and IPC measurements are approved daily.
2. Progress service recalculates current physical $EV$ and $AC$.
3. Scheduled daily job invokes `captureProgressSnapshot(projectId)` to append to the historical S-curve dataset.

## 13. Dependencies
- Weight math rollup engine (`src/lib/weight-math.ts`).
- Daily report services (`daily.service.ts`).

## 14. Implementation Priority
**High (Phase 4)**

## 15. Acceptance / Verification Criteria
- $PhysicalProgress \% = \frac{\sum PhysicalQuantity_{Certified}}{PhysicalQuantity_{BOQ\_Target}} \times 100$ matches certified site logs.
- `GET /api/projects/:id/progress/history` returns valid time-series data for rendering S-curves.
- Unit tests in `progress.service.test.ts` verify EVM math ($CPI, SPI, SV, CV$).
