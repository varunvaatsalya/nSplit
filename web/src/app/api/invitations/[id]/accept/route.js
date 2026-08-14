import { fail, ok } from "@/lib/api-response";
import { requireAuth } from "@/lib/auth/require-auth";
import { acceptInvitation } from "@/lib/invitations";

export async function POST(_request, { params }) {
  const auth = await requireAuth();
  if (auth.error) return auth.error;

  const { id } = await params;
  try {
    const result = await acceptInvitation(auth.user, id);
    return ok({
      invitation: result.invitation,
      group: {
        _id: String(result.group._id),
        code: result.group.code,
        name: result.group.name,
      },
      already: result.already,
    });
  } catch (e) {
    return fail(e.message, e.status || 400, e.code);
  }
}
