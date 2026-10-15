import { NextResponse } from "next/server";

import { connectDb } from "@/lib/db";
import { fail, zodError } from "@/lib/api-response";
import { SHARE_TOKEN } from "@/lib/share";
import {
  RequestError,
  assertWithinLimits,
  buildPayload,
  createRequestSchema,
  serializeRequest,
} from "@/lib/share-requests";
import { Group, ShareRequest, activeMembers } from "@/models";

const VIEWER_KEY = /^[A-Za-z0-9_-]{16,64}$/;

function json(data, status = 200) {
  return NextResponse.json({ data, error: null }, { status, headers: { "Cache-Control": "no-store" } });
}

async function groupForToken(params) {
  const { token } = await params;
  if (!SHARE_TOKEN.test(String(token || ""))) return null;
  await connectDb();
  return Group.findOne({ "share.token": token }).lean();
}

/** The viewer's own requests (matched by the random key kept in their browser). */
export async function GET(request, { params }) {
  const group = await groupForToken(params);
  if (!group) return fail("This link was turned off or does not exist", 404);
  const viewerKey = new URL(request.url).searchParams.get("viewerKey") || "";
  if (!VIEWER_KEY.test(viewerKey)) return json({ requests: [] });

  const rows = await ShareRequest.find({ groupId: group._id, viewerKey }).sort({ createdAt: -1 }).limit(30).lean();
  return json({ requests: rows.map(serializeRequest) });
}

/** Suggest an expense or a payment. Nothing changes until a group member approves it. */
export async function POST(request, { params }) {
  const group = await groupForToken(params);
  if (!group) return fail("This link was turned off or does not exist", 404);

  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = createRequestSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  if (!VIEWER_KEY.test(parsed.data.viewerKey)) return fail("Invalid viewer key", 400);

  const submitter = activeMembers(group).find((m) => String(m._id) === parsed.data.memberId);
  if (!submitter) return fail("Pick your name again: that member is no longer in the group", 422);

  try {
    await assertWithinLimits(group._id, parsed.data.viewerKey);
    const payload = buildPayload(group, parsed.data);
    const row = await ShareRequest.create({
      groupId: group._id,
      kind: parsed.data.kind,
      submittedByMemberId: submitter._id,
      submitterName: submitter.displayName,
      viewerKey: parsed.data.viewerKey,
      payload,
    });
    return json({ request: serializeRequest(row.toObject()) }, 201);
  } catch (e) {
    if (e instanceof RequestError) return fail(e.message, e.status);
    throw e;
  }
}
