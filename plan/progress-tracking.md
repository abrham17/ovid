# Progress tracking — analysis and plan

ISO references
- ISO/IEC 25010 — accuracy and reliability requirements for progress data
- ISO/IEC 12207 — monitoring & control processes

Current implementation indicators
- WbsNode.weightPercent used for weighted rollup
- ScheduleActivity has baseline and planned dates and actualStart/Finish fields
- No dedicated progress snapshot table found in excerpt

Critical findings
1. No clear distinction stored between "planned progress" vs "actual progress" at the same timestamp; ScheduleActivity has planned and actual dates but percentage progress appears not to be stored historically.
2. No Earned Value Management (EVM) constructs: no stored baseline cost/time metrics for CPI/SPI calculation, nor accumulated actual cost per activity (only MeasurementEntry and cost models exist but not tied to progress snapshots).
3. No ProgressSnapshot or Measurement of percent complete per date for historical trend analysis.

Required changes
1. Introduce `ProgressEntry` model: { id, projectId, wbsNodeId?, activityId?, date, plannedPercent, actualPercent, cumulativePlannedPercent, cumulativeActualPercent, createdById }
2. Implement `progress-service` that records progress entries when field-level updates happen (activity actual progress or daily reports create entries). Hook into existing daily report flows (EarthworkDailyEntry, StructureDailyEntry, RebarDailyEntry) to capture actual completed work and push progress entries.
3. Preserve baselines: store baseline planned percent/time in `ScheduleBaseline` and use it to compute variance.
4. Provide EVM metrics computation service: CPI, SPI, SV, CV using baseline cost and actual cost (requires integration with MeasurementEntry and Cost entries).

DB/Schema changes
- Add ProgressEntry table and indexes on (projectId, date)
- Add ProgressSnapshot for periodic aggregated snapshots (weekly/monthly) to support reporting

Backend/API changes
- API endpoints to fetch progress time-series, snapshot comparisons, and EVM metrics.
- Add scheduled job to compute aggregate progress snapshots nightly.

Frontend
- Charts and reports for baseline vs actual progress, EVM charts, variance alerts.

Priority
- ProgressEntry + capture hooks: critical
- EVM metrics: high
- Reporting UI: medium

Verification
- Given baseline and reported daily entries, computed project progress equals expected rollups per weights, and EVM metrics computed for sample dataset.

