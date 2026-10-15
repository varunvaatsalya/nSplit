import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { buildUpiLink, isValidUpiId, normalizeUpiId } from "./index.js";

describe("upi", () => {
  it("accepts common VPAs and rejects junk", () => {
    for (const ok of ["varun@okhdfcbank", "98765.43210@ybl", "rahul_k-1@paytm", " Priya@OKSBI "]) {
      assert.equal(isValidUpiId(ok), true, ok);
    }
    for (const bad of ["", "varun", "@ybl", "v@", "varun@1bank", "a b@ybl", "x@y"]) {
      assert.equal(isValidUpiId(bad), false, bad);
    }
    assert.equal(normalizeUpiId(" Priya@OKSBI "), "priya@oksbi");
  });

  it("builds an encoded upi://pay link", () => {
    const link = buildUpiLink({ upiId: "Varun@YBL", name: "Varun K", amountMinor: 45050, note: "Goa trip · nSplit" });
    assert.equal(
      link,
      "upi://pay?pa=varun%40ybl&pn=Varun%20K&am=450.50&cu=INR&tn=Goa%20trip%20%C2%B7%20nSplit"
    );
  });
});
