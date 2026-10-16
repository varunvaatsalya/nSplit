/**
 * UPI helpers shared by app, web and server.
 * A UPI ID (VPA) looks like `name@bank`: a handle, "@", and a provider code.
 */

const UPI_ID = /^[a-z0-9._-]{2,256}@[a-z][a-z0-9]{1,64}$/;

export function normalizeUpiId(value) {
  return String(value || "").trim().toLowerCase();
}

export function isValidUpiId(value) {
  return UPI_ID.test(normalizeUpiId(value));
}

/**
 * `upi://pay` URI: opens a UPI app as a link, or is the content of a payment QR.
 *
 * Note: UPI apps and banks often refuse a link with a pre-filled amount to a
 * *personal* UPI ID ("may fail as per UPI risk policy" / "payment mode is not
 * allowed for this UPI ID"); scanning a QR or typing the UPI ID is still allowed.
 * So for people, prefer a QR without an amount and offer the link only as extra.
 * Values are percent-encoded, since some UPI apps mis-read "+" for spaces.
 */
export function buildUpiLink({ upiId, name, amountMinor, currency = "INR", note }) {
  const params = [
    ["pa", normalizeUpiId(upiId)],
    ["pn", String(name || "").slice(0, 50)],
  ];
  // Without an amount this is the same as a person's own UPI QR: the payer types it.
  if (amountMinor) params.push(["am", ((Number(amountMinor) || 0) / 100).toFixed(2)]);
  params.push(["cu", currency]);
  if (note) params.push(["tn", String(note).slice(0, 80)]);
  // "@" stays literal, as in bank-issued UPI QR codes; some scanners don't decode %40.
  const encode = (v) => encodeURIComponent(v).replace(/%40/g, "@");
  return `upi://pay?${params.map(([k, v]) => `${k}=${encode(v)}`).join("&")}`;
}
