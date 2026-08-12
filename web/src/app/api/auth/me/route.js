import { fail, ok } from "@/lib/api-response";
import { getSessionUser, publicUser } from "@/lib/auth/session";

export async function GET() {
  const result = await getSessionUser();
  if (!result?.user) {
    return fail("Authentication required", 401);
  }
  return ok({ user: publicUser(result.user) });
}
