# Project Planning Lifecycle & Physical Quantity-Based Progress Tracking

## 1. Project Lifecycle Management (Initiation to Closure)

In compliance with ISO 10006 (Quality Management in Projects) and FIDIC standards, the PMS manages projects through four mandatory sequential lifecycle phases:

```
[ PHASE 1: INITIATION ]  -->  [ PHASE 2: PLANNING ]  -->  [ PHASE 3: EXECUTION ]  -->  [ PHASE 4: CLOSURE ]
  - Charter & Setup            - WBS & Activity Mapping     - Daily Site Reporting       - Final Inspection
  - Executive Approval         - Physical BOQ Allocation     - Certified Measurements     - Defect Handover
  - Scope Definition           - Multi-tier Plan Approval    - Physical Progress Rollup   - Final IPC & Audit
```

### Phase 1: Initiation
- **Activities**: Project charter creation, assigning Client/Consultant/Contractor organizations, defining contract value, type (e.g., FIDIC Red/Yellow, Ethio-Standard), and setting planned dates.
- **Gate Check**: Executive approval by `GENERAL_MANAGER` or `MANAGING_DIRECTOR` via `CompanyApproval`.

### Phase 2: Planning & Activity Distribution
- **Activities**:
  1. Decomposition of project into Work Breakdown Structure (WBS) nodes (`PHASE`, `SECTION`, `FLOOR`, `STRUCTURAL_ELEMENT`, `ACTIVITY`).
  2. Subcontractors decompose assigned scopes and submit formal plans via `WbsPlanSubmission`.
  3. Association of Bill of Quantities (`BoqItem`) to leaf WBS nodes with physical target quantities ($Q_{target}$) and unit rates.
- **Gate Check**: Verification of the **100% Rule** (sibling weight percentages sum exactly to 100%) and formal PM sign-off.

### Phase 3: Execution & Quantity-Based Progress Tracking
- **Activities**:
  1. On-site execution recorded via daily report digital twins:
     - **Earthwork Daily Entry**: Length, Width, Depth $\rightarrow$ Volume ($m^3$).
     - **Structure Daily Entry**: Concrete Grade, Actual Volume ($m^3$).
     - **Rebar Daily Entry**: Diameter, Number of Bars, Length $\rightarrow$ Computed Weight ($kg$/tons) using `WeightFactor`.
  2. Independent verification by Contractor Oversight team (`OversightDailyEntry`).
  3. Measurement Certification (`MeasurementEntry`) by Consultant/QS.
- **Gate Check**: Discrepancy checks between reported vs. oversight-observed physical quantities prior to IPC inclusion.

### Phase 4: Closure & Handover
- **Activities**: Final Punch List item verification, Defect Liability Period log closure, final IPC calculation, and post-project audit review (`LessonsLearned`).

---

## 2. Real Bottom-Up Physical Quantity Progress Tracking Engine

### Mathematical Model (No Subjective Percentages)

Progress in the PMS is strictly computed from verified physical quantities relative to BOQ target quantities.

1. **Leaf WBS Node / Activity Progress ($P_{leaf}$)**:
   $$P_{leaf} = \min\left(100\%, \frac{\sum Q_{certified}}{Q_{target}} \times 100\right)$$
   *Where $Q_{certified}$ is the certified physical quantity completed, and $Q_{target}$ is the budgeted BOQ quantity.*

2. **WBS Rollup Math (Weighted Hierarchy)**:
   For any parent WBS node $N$ with child nodes $C_1, C_2, \dots, C_k$ and weights $W_1, W_2, \dots, W_k$ (where $\sum W_i = 100\%$):
   $$P_{parent} = \sum_{i=1}^{k} \left( P_{C_i} \times \frac{W_i}{100} \right)$$

3. **Subcontractor Independent Oversight & Variance Handling**:
   - Subcontractor reports $Q_{claimed}$ in their daily entry.
   - Contractor Oversight Observer measures $Q_{observed}$ independently in `OversightDailyEntry`.
   - Variance ($\Delta Q = Q_{claimed} - Q_{observed}$) triggers an automated alert if $\Delta Q > 0$. Certified quantity $Q_{certified}$ cannot exceed $Q_{observed}$ without formal PM justification and audit logging.
