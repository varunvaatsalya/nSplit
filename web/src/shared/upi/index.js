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
 * `upi://pay` deep link that opens any UPI app (GPay, PhonePe, Paytm, BHIM)
 * with payee, amount and note pre-filled. Values are percent-encoded, since some
 * UPI apps mis-read "+" for spaces.
 */
export function buildUpiLink({ upiId, name, amountMinor, currency = "INR", note }) {
  const params = [
    ["pa", normalizeUpiId(upiId)],
    ["pn", String(name || "").slice(0, 50)],
    ["am", ((Number(amountMinor) || 0) / 100).toFixed(2)],
    ["cu", currency],
  ];
  if (note) params.push(["tn", String(note).slice(0, 80)]);
  return `upi://pay?${params.map(([k, v]) => `${k}=${encodeURIComponent(v)}`).join("&")}`;
}
