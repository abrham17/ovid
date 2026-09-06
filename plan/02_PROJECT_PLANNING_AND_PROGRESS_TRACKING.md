# 02. Project Planning & Physical Quantity-Based Progress Tracking Architecture

## Executive Summary
In compliance with **ISO 10006 §7.3 (Progress & Measurement)** and **ISO 9001 §9.1 (Monitoring, Measurement, Analysis, & Evaluation)**, construction progress must NOT rely on subjective percentage estimates or static weight factor guesses. Instead, progress tracking in the Project Management System (PMS) must be derived **bottom-up** from verified, physical measurement entries and certified IPC quantities compared against baseline Work Breakdown Structure (WBS) and Bill of Quantities (BoQ) target quantities.

This document outlines the architecture, data models, formulas, and WBS roll-up algorithms required to transform project planning and progress tracking into an ISO-certified, real-quantity-driven engine.

---

## 1. WBS Breakdown Structure & Hierarchy Rules

The Work Breakdown Structure (WBS) serves as the unifying spine for physical scope, time (schedule), cost (BoQ), and daily field reports.

```
PROJECT (Level 0)
  └── PHASE / SECTION (Level 1: e.g., Substructure, Superstructure, Station 0+000 - 10+000)
        └── FLOOR / ZONE (Level 2: e.g., Ground Floor, 1st Typical Floor, Culvert #1)
              └── STRUCTURAL ELEMENT / ACTIVITY GROUP (Level 3: e.g., Shear Wall, Columns, Earthwork Excavation)
                    └── ACTIVITY / LEAF TASK (Level 4: e.g., Concrete Pour C30, Rebar Placing D16, Cut Excavation)
```

### Hierarchy Constraints
1. **Leaf Nodes Only**: Actual physical measurements and daily site reports (`EarthworkDailyEntry`, `StructureDailyEntry`, `RebarDailyEntry`, `MeasurementEntry`) can ONLY be attached to Leaf WBS Nodes (Level 4).
2. **BoQ Mapping**: Every Leaf WBS Node must map to one or more `BoqItem`s containing the `budgetedQuantity`, `unit` (e.g., $m^3$, $kg$, $m^2$, $m$), and `unitRate` (ETB / USD).
3. **Multi-Discipline Checkpoints**: For structural elements (Columns, Slabs, Shear Walls), physical progress is tied to physical checkpoints:
   - Checkpoint 1 (Q1): Formwork Erection ($m^2$)
   - Checkpoint 2 (Q2): Rebar Placement ($kg$)
   - Checkpoint 3 (Q3): Concrete Pour ($m^3$)

---

## 2. Physical Quantity Progress Calculation Formulas

### A. Leaf Node Physical Progress ($P_{\text{leaf}}$)

For a specific BoQ item / Leaf WBS Node $i$:

$$Q_{\text{certified}, i} = \sum \text{Certified Quantity from Approved IPCs / Measurement Entries}$$
$$Q_{\text{daily\_approved}, i} = \sum \text{Daily Site Quantities from Approved Daily Reports}$$

To enforce ISO quality assurance, the system distinguishes between **Uncertified Field Progress** and **Certified Progress**:

$$\text{Progress}_{\text{uncertified}, i} = \min\left(100\%, \frac{Q_{\text{daily\_approved}, i}}{Q_{\text{budgeted}, i}} \times 100\right)$$

$$\text{Progress}_{\text{certified}, i} = \min\left(100\%, \frac{Q_{\text{certified}, i}}{Q_{\text{budgeted}, i}} \times 100\right)$$

### B. Weighted Parent Roll-Up Progress ($P_{\text{parent}}$)

When rolling progress up from Leaf WBS Nodes to Parent Nodes (Floor -> Phase -> Project), progress is weighted by **Monetary BOQ Value** ($V_i = Q_{\text{budgeted}, i} \times \text{UnitRate}_i$) to reflect true physical/financial project completion:

$$P_{\text{parent}} = \frac{\sum_{i \in \text{Children}} (P_{\text{leaf}, i} \times V_i)}{\sum_{i \in \text{Children}} V_i}$$

Where:
- $P_{\text{leaf}, i}$ is the physical progress percentage of child node $i$.
- $V_i$ is the total budgeted value of child node $i$.

---

## 3. Daily Site Reports to Quantity Roll-Up Workflow

```
┌─────────────────────────────────────────────────────────┐
│              Site Foreman / Site Engineer               │
│  Creates Daily Report (Earthwork / Structure / Rebar)  │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│               Superintendent / Resident QS              │
│       Reviews Physical Measurements & Sign-Off         │
└────────────────────────────┬────────────────────────────┘
                             │ Approves
                             ▼
┌─────────────────────────────────────────────────────────┐
│           Daily Entry Status set to APPROVED            │
│  Physical Quantities added to Uncertified Progress Pool │
└────────────────────────────┬────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────┐
│            Consultant QS / Resident Engineer            │
│  Inspects Site & Issues Joint Measurement / IPC Cert   │
└────────────────────────────┬────────────────────────────┘
                             │ Certifies
                             ▼
┌─────────────────────────────────────────────────────────┐
│            MeasurementEntry Status -> CERTIFIED         │
│  Certified Progress updated & WBS Progress Rolled Up    │
└─────────────────────────────────────────────────────────┘
```

---

## 4. Integration with Work Stoppages & Delays

Under FIDIC Clause 8.4 and ISO 10006 §7.4, work stoppages directly impact physical progress velocity and critical path schedules.

### Stoppage Impact Rules
1. **Activity Blocking**: When a `StoppageEntry` is logged against a WBS Node/Activity, the system marks the activity as `BLOCKED_BY_STOPPAGE`.
2. **Standing Cost Calculation**: The system automatically calculates daily standing costs based on assigned resource idle hours:
   $$\text{Standing Cost}_{\text{daily}} = \sum (\text{Equipment Idle Hours} \times \text{Hourly Idle Rate}) + \sum (\text{Labor Standby Hours} \times \text{Hourly Standby Rate})$$
3. **Critical Path Recalculation**: If the stoppage duration exceeds the Total Float of the activity, the forecasted `projectedEndDate` for parent WBS nodes and the entire Project is automatically shifted forward, generating an automatic **Variation / Extension of Time (EOT) Candidate**.

---

## 5. Executive Portfolio & Operational Department Dashboard Data Models

Top Management (General Manager, Managing Director) requires a unified **Top-Down View** fed by **Bottom-Up Measurements**:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                      GENERAL MANAGER PORTFOLIO VIEW                     │
├─────────────────┬───────────────────┬─────────────────┬─────────────────┤
│ Physical Prog % │ Financial S-Curve │ Active Stoppages│ Unsettled Claims│
│  (Target vs Act)│  (Planned vs Act) │   (Cost Impact) │  (FIDIC Cl 20)  │
└─────────────────┴───────────────────┴─────────────────┴─────────────────┘
```

### Key Metrics Tracked
- **Overall Physical Completion %**: Value-weighted physical roll-up across all active projects.
- **Physical vs Schedule Variance (SPI)**: $\text{Earned Value (Physical)} / \text{Planned Value}$.
- **Cost Variance (CPI)**: $\text{Earned Value (Physical)} / \text{Actual Cost}$.
- **Equipment Utilization Index**: Ratio of Operating Hours ($OH$) to total Hours ($OH + IH + DH$).
- **Subcontractor Certified Work vs Payment Ratio**: Ensuring contractor payments match certified physical work.
