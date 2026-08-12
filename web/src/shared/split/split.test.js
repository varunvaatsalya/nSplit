import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { calculateSplit, validatePayers, SplitMethod } from "../split/index.js";

describe("split engine", () => {
  it("splits equally with remainder", () => {
    const result = calculateSplit({
      method: SplitMethod.EQUAL,
      totalMinor: 1000,
      participants: [{ memberId: "a" }, { memberId: "b" }, { memberId: "c" }],
    });
    assert.equal(result.valid, true);
    const sum = result.splits.reduce((s, x) => s + x.amountMinor, 0);
    assert.equal(sum, 1000);
    assert.deepEqual(
      result.splits.map((s) => s.amountMinor).sort((a, b) => a - b),
      [333, 333, 334]
    );
  });

  it("validates exact amounts", () => {
    const ok = calculateSplit({
      method: SplitMethod.EXACT,
      totalMinor: 1000,
      participants: [
        { memberId: "a", inputValue: 500 },
        { memberId: "b", inputValue: 300 },
        { memberId: "c", inputValue: 200 },
      ],
    });
    assert.equal(ok.valid, true);

    const bad = calculateSplit({
      method: SplitMethod.EXACT,
      totalMinor: 1000,
      participants: [
        { memberId: "a", inputValue: 500 },
        { memberId: "b", inputValue: 300 },
      ],
    });
    assert.equal(bad.valid, false);
  });

  it("handles percentage with rounding", () => {
    const result = calculateSplit({
      method: SplitMethod.PERCENTAGE,
      totalMinor: 100,
      participants: [
        { memberId: "a", inputValue: 33.33 },
        { memberId: "b", inputValue: 33.33 },
        { memberId: "c", inputValue: 33.34 },
      ],
    });
    assert.equal(result.valid, true);
    assert.equal(
      result.splits.reduce((s, x) => s + x.amountMinor, 0),
      100
    );
  });

  it("handles shares", () => {
    const result = calculateSplit({
      method: SplitMethod.SHARES,
      totalMinor: 1000,
      participants: [
        { memberId: "a", inputValue: 2 },
        { memberId: "b", inputValue: 1 },
        { memberId: "c", inputValue: 1 },
      ],
    });
    assert.equal(result.valid, true);
    const byId = Object.fromEntries(
      result.splits.map((s) => [s.memberId, s.amountMinor])
    );
    assert.equal(byId.a, 500);
    assert.equal(byId.b, 250);
    assert.equal(byId.c, 250);
  });

  it("rejects invalid percentage totals", () => {
    const result = calculateSplit({
      method: SplitMethod.PERCENTAGE,
      totalMinor: 1000,
      participants: [
        { memberId: "a", inputValue: 40 },
        { memberId: "b", inputValue: 40 },
      ],
    });
    assert.equal(result.valid, false);
  });
});

describe("multiple payers", () => {
  it("accepts matching payer totals", () => {
    const result = validatePayers({
      totalMinor: 1500,
      payers: [
        { memberId: "a", amountMinor: 1000 },
        { memberId: "b", amountMinor: 500 },
      ],
    });
    assert.equal(result.valid, true);
  });

  it("rejects mismatched payer totals", () => {
    const result = validatePayers({
      totalMinor: 1500,
      payers: [{ memberId: "a", amountMinor: 1000 }],
    });
    assert.equal(result.valid, false);
  });
});
