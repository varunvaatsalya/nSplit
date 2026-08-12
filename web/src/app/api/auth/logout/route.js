import { ok } from "@/lib/api-response";
import {
  clearSessionCookie,
  destroySessionByToken,
  getSessionUser,
} from "@/lib/auth/session";

export async function POST() {
  const result = await getSessionUser();
  if (result?.token) {
    await destroySessionByToken(result.token);
  }
  await clearSessionCookie();
  return ok({ success: true });
}
