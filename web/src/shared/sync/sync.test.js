import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { backoffMs, MutationType } from "./mutation-types.js";

describe("sync helpers", () => {
  it("exposes mutation types", () => {
    assert.equal(MutationType.EXPENSE_CREATE, "expense.create");
  });

  it("backoff grows with retries and stays under cap", () => {
    const a = backoffMs(0, { base: 1000, cap: 300000 });
    const b = backoffMs(3, { base: 1000, cap: 300000 });
    assert.ok(a >= 1000 && a < 2000);
    assert.ok(b >= 8000);
    const capped = backoffMs(20, { base: 1000, cap: 5000 });
    assert.ok(capped <= 5250);
  });
});
