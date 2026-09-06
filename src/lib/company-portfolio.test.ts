import assert from "node:assert/strict";
import { calculateCriticalActivityIds, ratio } from "./company-portfolio";

const date = (day: number) => new Date(Date.UTC(2026, 0, day));
const critical = calculateCriticalActivityIds([
  { id: "A", plannedStart: date(1), plannedFinish: date(3), successors: [{ successorId: "B", lagDays: 0 }, { successorId: "C", lagDays: 0 }] },
  { id: "B", plannedStart: date(3), plannedFinish: date(8), successors: [{ successorId: "D", lagDays: 0 }] },
  { id: "C", plannedStart: date(3), plannedFinish: date(5), successors: [{ successorId: "D", lagDays: 0 }] },
  { id: "D", plannedStart: date(8), plannedFinish: date(10), successors: [] },
]);

assert.deepEqual([...critical].sort(), ["A", "B", "D"]);
assert.equal(ratio(80, 100), 0.8);
assert.equal(ratio(100, 0), null);

console.log("Company portfolio calculation tests passed");
