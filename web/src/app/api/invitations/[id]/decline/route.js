import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { declineInvitation } from "@/lib/invitations";

export async function POST(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const result = await declineInvitation(auth.user, id);
    return ok({
      invitation: result.invitation,
      already: result.already,
    });
  } catch (e) {
    return fail(e.message, e.status || 400, e.code);
  }
}
