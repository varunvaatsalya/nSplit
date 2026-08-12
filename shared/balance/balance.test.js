import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { computeGroupBalances } from "./index.js";

describe("balance engine", () => {
  it("computes simple expense balances", () => {
    const result = computeGroupBalances({
      members: [{ id: "v" }, { id: "a" }, { id: "r" }],
      expenses: [
        {
          payers: [{ memberId: "v", amountMinor: 900 }],
          splits: [
            { memberId: "v", amountMinor: 300 },
            { memberId: "a", amountMinor: 300 },
            { memberId: "r", amountMinor: 300 },
          ],
        },
      ],
    });

    assert.equal(result.byMemberId.v.netMinor, 600);
    assert.equal(result.byMemberId.a.netMinor, -300);
    assert.equal(result.byMemberId.r.netMinor, -300);
  });

  it("handles multiple payers", () => {
    const result = computeGroupBalances({
      members: [{ id: "v" }, { id: "a" }],
      expenses: [
        {
          payers: [
            { memberId: "v", amountMinor: 1000 },
            { memberId: "a", amountMinor: 500 },
          ],
          splits: [
            { memberId: "v", amountMinor: 750 },
            { memberId: "a", amountMinor: 750 },
          ],
        },
      ],
    });
    assert.equal(result.byMemberId.v.netMinor, 250);
    assert.equal(result.byMemberId.a.netMinor, -250);
  });

  it("applies transfers as settlements", () => {
    const result = computeGroupBalances({
      members: [{ id: "v" }, { id: "a" }],
      expenses: [
        {
          payers: [{ memberId: "a", amountMinor: 800 }],
          splits: [
            { memberId: "v", amountMinor: 800 },
            { memberId: "a", amountMinor: 0 },
          ],
        },
      ],
      transfers: [
        { fromMemberId: "v", toMemberId: "a", amountMinor: 500 },
      ],
    });
    // Before transfer: v=-800, a=+800; after: v=-300, a=+300
    assert.equal(result.byMemberId.v.netMinor, -300);
    assert.equal(result.byMemberId.a.netMinor, 300);
  });

  it("fully settles a group", () => {
    const result = computeGroupBalances({
      members: [{ id: "v" }, { id: "a" }],
      expenses: [
        {
          payers: [{ memberId: "a", amountMinor: 500 }],
          splits: [
            { memberId: "v", amountMinor: 500 },
            { memberId: "a", amountMinor: 0 },
          ],
        },
      ],
      transfers: [
        { fromMemberId: "v", toMemberId: "a", amountMinor: 500 },
      ],
    });
    assert.equal(result.byMemberId.v.netMinor, 0);
    assert.equal(result.byMemberId.a.netMinor, 0);
  });
});
