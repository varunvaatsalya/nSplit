import { NextResponse } from "next/server";
import release from "@/config/app-release.json";

/**
 * One stable link for the Android APK: every "Download" button points here, and
 * this redirects to wherever the current file lives (set in config/app-release.json).
 */
export function GET(request) {
  if (!release.downloadUrl) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.redirect(release.downloadUrl);
}
