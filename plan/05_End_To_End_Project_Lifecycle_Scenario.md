# End-to-End Project Lifecycle & Physical Quantity Tracking Scenario

## 1. Scenario Overview

This scenario illustrates the complete operational lifecycle of a construction project (**"Ovid Plaza High-Rise Building"**) within the Project Management System (PMS), from initial project setup through WBS planning, daily physical quantity site logging, independent contractor oversight, consultant measurement certification, and final project handover.

---

## 2. Stage-by-Stage Operational Scenario

```
+-----------------------------------------------------------------------------------+
| STAGE 1: PROJECT INITIATION & EXECUTIVE GOVERNANCE                               |
| Roles: CLIENT_REP, GENERAL_MANAGER, SENIOR_PM, LEGAL_SERVICE_MANAGER              |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| STAGE 2: WBS DECOMPOSITION & PHYSICAL BOQ TARGET ALLOCATION                        |
| Roles: SENIOR_PM, OFFICE_ENGINEER, HEAD_PLANNING_MONITORING                       |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| STAGE 3: SUBCONTRACTOR ONBOARDING & DELEGATED PLAN SUBMISSION                     |
| Roles: SUBCONTRACTOR_PM, SENIOR_PM                                                |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| STAGE 4: DAILY SITE OPERATIONS & PHYSICAL QUANTITY RECORDING                       |
| Roles: FOREMAN, SITE_ENGINEER, QC_INSPECTOR, HSE_OFFICER                          |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| STAGE 5: INDEPENDENT CONTRACTOR OVERSIGHT & VARIANCE DETECTION                     |
| Roles: SITE_ENGINEER (Oversight Observer), SENIOR_PM                              |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| STAGE 6: PHYSICAL MEASUREMENT CERTIFICATION & IPC PAYMENT                         |
| Roles: QS, CONSULTANT_ENGINEER, CFO                                               |
+-----------------------------------------------------------------------------------+
                                        |
                                        v
+-----------------------------------------------------------------------------------+
| STAGE 7: FINAL PUNCH LIST, DEFECT HANDOVER & PROJECT CLOSURE                      |
| Roles: QC_INSPECTOR, CONSULTANT_ENGINEER, GENERAL_MANAGER                         |
+-----------------------------------------------------------------------------------+
```

---

### Stage 1: Project Initiation & Executive Governance
- **Action**: Project created in PMS:
  - Code: `PRJ-OVID-001`, Name: "Ovid Plaza High-Rise Building".
  - Type: `BUILDING`, Contract Type: `FIDIC_RED`.
  - Target BOQ Scope: $12,000\,m^3$ Concrete, $1,500\,\text{Tons}$ Rebar.
- **Roles Involved**:
  - `SENIOR_PM`: Registers initial project details.
  - `LEGAL_SERVICE_MANAGER`: Attaches contract terms and retention policies.
  - `GENERAL_MANAGER`: Reviews and issues formal project creation approval (`CompanyApproval`).
- **Audit Action**: `CREATE` on `Project` logged in `AuditLog` with `before: null` and `after: { code: "PRJ-OVID-001", status: "PLANNING" }`.

---

### Stage 2: WBS Decomposition & Physical BOQ Target Allocation
- **Action**: WBS tree created down to Structural Element level:
  - `PHASE 1`: Substructure $\rightarrow$ `SECTION 1`: Foundation $\rightarrow$ `STRUCTURAL_ELEMENT`: Footing F-01.
  - Attached BOQ Item: Item `BOQ-CONC-01`: "C-30 Concrete Pouring", Target Quantity: $500\,m^3$, Unit Rate: $4,500\,\text{ETB}/m^3$.
- **100% Rule Validation**: Sibling WBS nodes assigned weight percentages summing to $100.00\%$.
- **Roles Involved**: `OFFICE_ENGINEER`, `HEAD_PLANNING_MONITORING`.

---

### Stage 3: Subcontractor Onboarding & Delegated Plan Submission
- **Action**: Subcontractor assigned for Rebar Installation scope (`Contract` ID: `SUB-REBAR-01`).
- **Plan Submission**:
  - `SUBCONTRACTOR_PM` creates child WBS nodes under scope root (all nodes set to `status: DRAFT`).
  - Submits plan proposal via `WbsPlanSubmission`.
  - Main Contractor `SENIOR_PM` reviews and approves plan submission. Nodes transition to `status: ACTIVE` and enter active progress tracking.

---

### Stage 4: Daily Site Operations & Physical Quantity Recording
- **Action**: Execution of concrete pour and rebar installation on Foundation Footing F-01 on Day 15:
  1. **Structure Daily Entry** (`StructureDailyEntry`):
     - Logged by `SITE_ENGINEER`.
     - Actual Quantity Poured: $85\,m^3$ C-30 Concrete.
     - Equipment used: Concrete Pump Truck (Operating Hours: $6.0\,\text{hrs}$, Idle: $1.0\,\text{hr}$).
  2. **Rebar Daily Entry** (`RebarDailyEntry`):
     - Logged by `FOREMAN`.
     - Diameter: $20\,\text{mm}$, Number of Bars: $400$, Length: $12\,\text{m}$.
     - Computed Weight: $400 \times 12 \times 2.466\,\text{kg/m} = 11,836.8\,\text{kg} = 11.84\,\text{Tons}$.
- **Roles Involved**: `FOREMAN`, `SITE_ENGINEER`, `QC_INSPECTOR` (passes ITR).

---

### Stage 5: Independent Contractor Oversight & Variance Detection
- **Action**: Contractor Oversight Observer logs independent verification report (`OversightDailyEntry`):
  - Observer measures $82\,m^3$ concrete poured (vs. $85\,m^3$ claimed by subcontractor).
  - Assessment set to `BELOW_REPORTED`.
  - Variance alert flagged for Quantity Surveyor review prior to certification.
- **Roles Involved**: `SITE_ENGINEER` (Oversight Observer), `SENIOR_PM`.

---

### Stage 6: Physical Measurement Certification & IPC Payment
- **Action**: Monthly Interim Payment Certificate (IPC #1) preparation:
  - `QS` compiles certified physical quantities from daily entries:
    $$Q_{certified} = 82\,m^3 \quad (\text{adjusted to oversight measurement})$$
  - Physical Progress calculation:
    $$PhysicalProgress \% = \frac{82\,m^3}{500\,m^3} \times 100 = 16.40\%$$
  - `CONSULTANT_ENGINEER` certifies `MeasurementEntry` (`status: CERTIFIED`).
  - IPC Payment Value calculated: $82 \times 4,500 = 369,000\,\text{ETB}$.
  - `CFO` releases payment voucher.
- **Roles Involved**: `QS`, `CONSULTANT_ENGINEER`, `CFO`.

---

### Stage 7: Final Punch List, Defect Handover & Project Closure
- **Action**: Project completion:
  - All physical BOQ quantities verified ($Q_{certified} = Q_{target}$).
  - `QC_INSPECTOR` verifies closure of all Punch List items (`status: VERIFIED`).
  - Final IPC payment and retention release authorized.
  - Project status changed to `COMPLETE` and archived.
- **Roles Involved**: `QC_INSPECTOR`, `CONSULTANT_ENGINEER`, `GENERAL_MANAGER`.
