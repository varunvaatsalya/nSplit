import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { can, Actions, MemberPermission } from "./roles.js";

describe("permissions", () => {
  it("VIEW_ONLY cannot add", () => {
    assert.equal(can(MemberPermission.VIEW_ONLY, Actions.ADD_EXPENSE), false);
    assert.equal(can(MemberPermission.VIEW_ONLY, Actions.VIEW_BALANCES), true);
  });

  it("ADD can create but not edit", () => {
    assert.equal(can(MemberPermission.ADD, Actions.ADD_EXPENSE), true);
    assert.equal(can(MemberPermission.ADD, Actions.EDIT_EXPENSE), false);
  });

  it("EDIT can modify", () => {
    assert.equal(can(MemberPermission.EDIT, Actions.EDIT_EXPENSE), true);
    assert.equal(can(MemberPermission.EDIT, Actions.MANAGE_MEMBERS), false);
  });

  it("ADMIN can manage members/settings", () => {
    assert.equal(can(MemberPermission.ADMIN, Actions.MANAGE_MEMBERS), true);
    assert.equal(can(MemberPermission.ADMIN, Actions.MANAGE_SETTINGS), true);
  });
});
