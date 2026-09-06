import assert from "node:assert/strict";
import { COMPANY_ROLE_PERMISSIONS, companyRoleCan } from "./permissions";
import {
  canCloseExecutiveIntervention,
  canManagementTransitionIntervention,
  isTerminalExecutiveIntervention,
} from "./executive-intervention";

const businessResources = ["project_approval", "contractor_onboarding", "legal_escalation", "planning_monitoring", "engineering_standards", "equipment_capital", "finance_approval", "audit_compliance"] as const;

assert.equal(companyRoleCan("GENERAL_MANAGER", "project_approval", "approve"), true);
assert.equal(companyRoleCan("GENERAL_MANAGER", "project_approval", "create"), false);
assert.equal(companyRoleCan("GENERAL_MANAGER", "portfolio", "read"), true);
assert.equal(companyRoleCan("HEAD_TENDERING", "project_approval", "create"), true);
assert.equal(companyRoleCan("HEAD_TENDERING", "project_approval", "approve"), false);
assert.equal(companyRoleCan("HEAD_TENDERING", "contractor_onboarding", "create"), true);
assert.equal(companyRoleCan("TENDERING_OFFICER", "project_approval", "create"), false);
assert.equal(companyRoleCan("LEGAL_SERVICE_MANAGER", "legal_escalation", "approve"), true);
assert.equal(companyRoleCan("HEAD_PLANNING_MONITORING", "planning_monitoring", "update"), true);
assert.equal(companyRoleCan("PLANNING_OFFICER", "planning_monitoring", "approve"), false);
assert.equal(companyRoleCan("HEAD_ENGINEERING_SERVICES", "engineering_standards", "approve"), true);
assert.equal(companyRoleCan("ENGINEERING_SERVICES_OFFICER", "engineering_standards", "approve"), false);
assert.equal(companyRoleCan("INTERNAL_AUDITOR", "audit_compliance", "read"), true);
assert.equal(companyRoleCan("INTERNAL_AUDITOR", "audit_compliance", "update"), false);
assert.equal(companyRoleCan("INTERNAL_AUDITOR", "audit_findings", "create"), true);
assert.equal(companyRoleCan("INTERNAL_AUDITOR", "audit_findings", "update"), true);
assert.equal(companyRoleCan("EQUIPMENT_ADMIN_MANAGER", "equipment_capital", "create"), true);
assert.equal(companyRoleCan("EQUIPMENT_ADMIN_MANAGER", "equipment_capital", "approve"), false);
assert.equal(companyRoleCan("FINANCE_DEPT_MANAGER", "finance_approval", "approve"), true);
assert.equal(companyRoleCan("GENERAL_MANAGER", "executive_approval", "approve"), true);
assert.equal(companyRoleCan("GENERAL_MANAGER", "executive_intervention", "create"), true);
assert.equal(companyRoleCan("HEAD_PLANNING_MONITORING", "executive_intervention", "update"), true);
assert.equal(companyRoleCan("INTERNAL_AUDITOR", "executive_intervention", "update"), false);

assert.equal(canManagementTransitionIntervention("OPEN", "ACKNOWLEDGED"), true);
assert.equal(canManagementTransitionIntervention("OPEN", "READY_FOR_REVIEW"), false);
assert.equal(canManagementTransitionIntervention("ACKNOWLEDGED", "ACTION_IN_PROGRESS"), true);
assert.equal(canManagementTransitionIntervention("ACTION_IN_PROGRESS", "READY_FOR_REVIEW"), true);
assert.equal(canManagementTransitionIntervention("CLOSED", "ACTION_IN_PROGRESS"), false);
assert.equal(canCloseExecutiveIntervention("READY_FOR_REVIEW"), true);
assert.equal(canCloseExecutiveIntervention("ACTION_IN_PROGRESS"), false);
assert.equal(isTerminalExecutiveIntervention("CANCELLED"), true);

for (const permissions of Object.values(COMPANY_ROLE_PERMISSIONS)) {
  assert.equal("company_staff" in permissions, false, "Business roles must not administer company staff");
}
for (const resource of businessResources) {
  assert.equal(companyRoleCan("INTERNAL_AUDITOR", resource, "update"), false);
  assert.equal(companyRoleCan("INTERNAL_AUDITOR", resource, "create"), false);
  assert.equal(companyRoleCan("INTERNAL_AUDITOR", resource, "approve"), false);
}
assert.equal(companyRoleCan("INTERNAL_AUDITOR", "audit_findings", "approve"), false);

console.log("Company RBAC matrix tests passed");
