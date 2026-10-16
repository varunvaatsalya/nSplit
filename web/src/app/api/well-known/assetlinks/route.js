import { NextResponse } from "next/server";

/**
 * Digital Asset Links for Android App Links, served at
 * /.well-known/assetlinks.json (see the rewrite in next.config.mjs).
 *
 * ANDROID_SHA256_CERT_FINGERPRINTS: comma-separated SHA-256 fingerprints of the
 * keys that sign the app (release upload key, and the debug key for dev builds),
 * e.g. "AB:CD:...,12:34:...". Android then opens /s/<token> links in the app.
 */
const PACKAGE_NAME = "com.varunvaatsalya.nsplit";

export function GET() {
  const fingerprints = (process.env.ANDROID_SHA256_CERT_FINGERPRINTS || "")
    .split(",")
    .map((f) => f.trim().toUpperCase())
    .filter((f) => /^([0-9A-F]{2}:){31}[0-9A-F]{2}$/.test(f));

  const body = fingerprints.length
    ? [
        {
          relation: ["delegate_permission/common.handle_all_urls"],
          target: { namespace: "android_app", package_name: PACKAGE_NAME, sha256_cert_fingerprints: fingerprints },
        },
      ]
    : [];

  return NextResponse.json(body, { headers: { "Cache-Control": "public, max-age=3600" } });
}
