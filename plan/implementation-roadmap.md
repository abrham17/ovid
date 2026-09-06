# Master Implementation Roadmap — ISO Standard Alignment

## 1. Executive Summary & Sequential Execution Strategy

This implementation roadmap outlines the sequential, dependency-ordered rollout plan to achieve 100% compliance with ISO 9001:2015, ISO 10006:2017, ISO 21502:2020, and ISO/IEC 27001 across the Ovid PMS codebase.

To ensure system stability, all changes follow a strict dependency order:
$$\text{Foundational RBAC \& Audit} \longrightarrow \text{Project Baseline Engine} \longrightarrow \text{WBS \& Planning} \longrightarrow \text{Physical Site Operations} \longrightarrow \text{CPM Schedule \& EVM} \longrightarrow \text{Quality \& Controls} \longrightarrow \text{Change \& Risk} \longrightarrow \text{Executive Dashboards}$$

---

## 2. Sequential Phase Rollout

### Phase 1: Foundation, Governance & Audit Infrastructure
- **Objective**: Establish universal audit trail, route-level permission manifest, and strict RBAC enforcement.
- **Key Tasks**:
  1. Add `ProjectRole` enum and `ProjectRoleAssignment` model to `prisma/schema.prisma`.
  2. Implement standardized `logAuditEntry()` helper in `src/lib/services/audit.ts` capturing `{ before, after }` state diffs.
  3. Create `src/permissions/route-permissions.json` mapping all API routes to required domain permissions.
  4. Build central API route authorization wrapper (`assertRoutePermission`).
- **Dependencies**: None.
- **Priority**: Critical (P1)
- **Deliverables**: `route-permissions.json`, `audit.ts`, database migrations.

### Phase 2: Project Creation, Chartering & Baseline Engine
- **Objective**: Enforce won-tender conversion, structured objectives, and immutable project baselines.
- **Key Tasks**:
  1. Add `ProjectObjective`, `ProjectStatusHistory`, and `ProjectBaseline` models to `prisma/schema.prisma`.
  2. Implement tender-to-project conversion engine in `project.service.ts` requiring General Manager approval.
  3. Enforce phase gate transitions in `project.service.ts` (`PLANNING` $\rightarrow$ `ACTIVE` requires approved baseline).
  4. Build project charter and baseline UI components.
- **Dependencies**: Phase 1.
- **Priority**: High (P2)
- **Deliverables**: `ProjectBaseline` snapshot engine, phase gate transition checks.

### Phase 3: WBS Decomposition, Subcontractor Isolation & Work Delegation
- **Objective**: Enforce 100% WBS sibling weight rule and isolate subcontractor plan submissions.
- **Key Tasks**:
  1. Implement recursive 100%-Rule validator in `src/lib/weight-math.ts`.
  2. Gate `WbsPlanSubmission` approval on zero weight validation errors in `wbs-plan.service.ts`.
  3. Integrate real-time notification dispatches (`ACTIVITY_ASSIGNED`) into `assignment.service.ts`.
  4. Build WBS weight balance helper UI.
- **Dependencies**: Phase 2.
- **Priority**: High (P3)
- **Deliverables**: Weight math validator, `WbsPlanSubmission` approval gate.

### Phase 4: Physical Quantity Bottom-Up Progress & S-Curve Engine
- **Objective**: Eliminate subjective percentage estimates; derive progress bottom-up from physical daily site logs.
- **Key Tasks**:
  1. Add `ProgressSnapshot` model to `prisma/schema.prisma`.
  2. Integrate daily site entries (Earthwork, Structure, Rebar) directly into physical progress calculations.
  3. Implement daily scheduled progress snapshot job in `progress.service.ts`.
  4. Build S-curve chart component (Planned Value vs Earned Value vs Actual Cost).
- **Dependencies**: Phase 3.
- **Priority**: High (P4)
- **Deliverables**: Physical progress calculation engine, `ProgressSnapshot` time-series data.

### Phase 5: Critical Path Method (CPM) Schedule Solver & Control Loop
- **Objective**: Calculate Early/Late dates, Total Float, Free Float, and Critical Path; automate executive intervention triggers.
- **Key Tasks**:
  1. Build topological CPM solver in `src/lib/cpm-solver.ts`.
  2. Enforce `ScheduleChangeRequest` approval before modifying activity dates on active projects.
  3. Implement automated control metric evaluator in `dashboard.service.ts` auto-creating `ExecutiveIntervention` when $SPI < 0.85$ or $CPI < 0.85$.
  4. Highlight critical path activities in Gantt view UI.
- **Dependencies**: Phase 4.
- **Priority**: High (P5)
- **Deliverables**: `cpm-solver.ts`, automated executive intervention triggers.

### Phase 6: Quality Release Gates & Document Control
- **Objective**: Gate activity completion on passed ITRs/closed defects; enforce ISO 9001 §7.5 document versioning.
- **Key Tasks**:
  1. Implement `assertQualityGatePassed(wbsNodeId)` in `quality.service.ts`.
  2. Block activity completion and IPC payment certification when open defects exist.
  3. Secure file downloads behind authenticated stream routes in `document.service.ts`.
  4. Build document revision tree UI.
- **Dependencies**: Phase 5.
- **Priority**: High (P6)
- **Deliverables**: Quality gate enforcement, secure document download API.

### Phase 7: Integrated Change Control & Risk Stoppage Realization
- **Objective**: Link cost/schedule change controls; realize risks into site work stoppages.
- **Key Tasks**:
  1. Link `VariationOrder` and `ScheduleChangeRequest` in `prisma/schema.prisma`.
  2. Trigger automatic `ProjectBaseline` version increments upon major variation approval.
  3. Implement atomic `realizeRisk()` function in `risk.service.ts` generating `StoppageEntry` records.
  4. Build 5x5 Risk Heatmap matrix UI.
- **Dependencies**: Phase 6.
- **Priority**: Medium (P7)
- **Deliverables**: Integrated variation approval engine, risk heatmap matrix.

### Phase 8: Executive Portfolio Dashboards & Final System Verification
- **Objective**: Provide corporate leadership with cross-project portfolio oversight and execute final end-to-end verification.
- **Key Tasks**:
  1. Verify 24-role RBAC tab matrix and portfolio dashboard access.
  2. Ensure `Prisma.Decimal` serialization handling across all Server/Client Component boundaries.
  3. Run comprehensive integration and E2E test suite.
- **Dependencies**: Phase 1–7.
- **Priority**: Medium (P8)
- **Deliverables**: Fully verified, standard-compliant PMS codebase.

---

## 3. Verification Criteria & Acceptance Sign-off Matrix

| Phase | Core Verification Check | Target Standard | Expected Outcome |
| :--- | :--- | :--- | :--- |
| **Phase 1** | Route authorization & audit diff test | ISO 27001 / ISO 9001 §7.5 | 100% REST endpoints enforce permissions; all CRUD ops write `{ before, after }` JSON diffs. |
| **Phase 2** | Project activation gate check | ISO 21502 §6.2 | Moving project to `ACTIVE` without `ProjectBaseline` returns HTTP 422 error. |
| **Phase 3** | Recursive WBS weight 100% rule | ISO 21502 §7.2 | Approving plan submission with unaligned sibling weights returns HTTP 400 error. |
| **Phase 4** | Physical quantity progress math | ISO 10006 §7.4 | Physical completion percentage perfectly matches certified daily site quantities vs BOQ target. |
| **Phase 5** | CPM solver float accuracy | ISO 21502 §7.4 | Zero total float calculated for critical path activities; Gantt highlights critical path. |
| **Phase 6** | Quality gate activity completion | ISO 9001 §8.6 | Marking activity `COMPLETE` with open `DefectLog` returns HTTP 422 quality error. |
| **Phase 7** | Baseline version increment | ISO 21502 §7.10 | Approving variation order increments `ProjectBaseline.version` and updates contract value. |
| **Phase 8** | Full system regression & portfolio access | ISO 9001 / ISO 27001 | 100% test pass rate; executive portfolio dashboards function seamlessly. |
