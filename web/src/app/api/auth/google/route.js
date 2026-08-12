import { fail } from "@/lib/api-response";

/**
 * Google OAuth placeholder — architecture reserved for future implementation.
 * UI may show "Continue with Google" as coming soon; do not fake success.
 */
export async function POST() {
  return fail(
    "Google authentication is not available yet",
    501,
    "GOOGLE_AUTH_NOT_IMPLEMENTED"
  );
}
