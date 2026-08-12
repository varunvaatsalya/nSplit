import { fail } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";

export async function requireAuth() {
  const result = await getSessionUser();
  if (!result?.user) {
    return { error: fail("Authentication required", 401), user: null, session: null };
  }
  return { error: null, user: result.user, session: result.session, token: result.token };
}
