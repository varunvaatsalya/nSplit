import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { fail } from "@/lib/api-response";
import { SHARE_TOKEN, loadSharedLedger } from "@/lib/share";

/** Public, read-only ledger behind a share link. No login: the token is the key. */
export async function GET(_request, { params }) {
  const { token } = await params;
  if (!SHARE_TOKEN.test(String(token || ""))) return fail("This link is not valid", 404);

  await connectDb();
  const data = await loadSharedLedger(token);
  if (!data) return fail("This link was turned off or does not exist", 404);

  return NextResponse.json(
    { data, error: null },
    { headers: { "Cache-Control": "no-store", "X-Robots-Tag": "noindex" } }
  );
}
