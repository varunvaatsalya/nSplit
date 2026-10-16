import crypto from "node:crypto";
import mongoose from "mongoose";
import { headers } from "next/headers";
import { z } from "zod";

import { connectDb } from "@/lib/db";
import { created, fail, ok, zodError } from "@/lib/api-response";
import { getSessionUser } from "@/lib/auth/session";
import { Feedback, FeedbackType, Group } from "@/models";

const HOUR = 60 * 60 * 1000;
const LIMIT_SIGNED_IN = 10;
const LIMIT_SIGNED_OUT = 5;

const postSchema = z.object({
  type: z.enum(Object.values(FeedbackType)),
  message: z.string().trim().min(3, "Write a little more").max(2000),
  source: z.string().trim().max(60).optional().nullable(),
  groupRef: z.string().trim().max(64).optional().nullable(),
  platform: z.string().trim().max(20).optional().nullable(),
  appVersion: z.string().trim().max(40).optional().nullable(),
  osVersion: z.string().trim().max(40).optional().nullable(),
});

function hashIp(ip) {
  return ip ? crypto.createHash("sha256").update(ip).digest("hex").slice(0, 32) : null;
}

async function groupNameFor(ref) {
  if (!ref) return null;
  const query = mongoose.isValidObjectId(ref) ? { $or: [{ _id: ref }, { code: ref }] } : { code: ref };
  const group = await Group.findOne(query).select("name").lean();
  return group?.name ?? null;
}

/** Send a bug report, idea or other note. Login is optional. */
export async function POST(request) {
  let body;
  try {
    body = await request.json();
  } catch {
    return fail("Invalid JSON body", 400);
  }
  const parsed = postSchema.safeParse(body);
  if (!parsed.success) return zodError(parsed.error);
  const data = parsed.data;

  await connectDb();
  const user = (await getSessionUser().catch(() => null))?.user ?? null;
  const headerStore = await headers();
  const ipHash = hashIp(headerStore.get("x-forwarded-for")?.split(",")[0]?.trim());

  const since = new Date(Date.now() - HOUR);
  const recent = user
    ? await Feedback.countDocuments({ userId: user._id, createdAt: { $gte: since } })
    : ipHash
      ? await Feedback.countDocuments({ ipHash, userId: null, createdAt: { $gte: since } })
      : 0;
  if (recent >= (user ? LIMIT_SIGNED_IN : LIMIT_SIGNED_OUT)) {
    return fail("You've sent a lot of feedback recently. Please try again in a while.", 429);
  }

  const feedback = await Feedback.create({
    type: data.type,
    message: data.message,
    source: data.source || null,
    groupRef: data.groupRef || null,
    groupName: await groupNameFor(data.groupRef),
    userId: user?._id ?? null,
    userName: user?.name ?? null,
    userEmail: user?.email ?? null,
    platform: data.platform || null,
    appVersion: data.appVersion || null,
    osVersion: data.osVersion || null,
    userAgent: headerStore.get("user-agent")?.slice(0, 400) ?? null,
    ipHash,
  });
  return created({ id: String(feedback._id) });
}

function isAdmin(key) {
  const expected = process.env.FEEDBACK_ADMIN_KEY;
  if (!expected || !key) return false;
  const a = Buffer.from(key);
  const b = Buffer.from(expected);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/**
 * List feedback for a review panel. Needs the `x-admin-key` header to match the
 * FEEDBACK_ADMIN_KEY env var.
 * Query: page (1+), limit (1–100, default 20), type, status, source.
 */
export async function GET(request) {
  const headerStore = await headers();
  if (!isAdmin(headerStore.get("x-admin-key"))) return fail("Not allowed", 401);

  const params = request.nextUrl.searchParams;
  const page = Math.max(1, Number.parseInt(params.get("page") || "1", 10) || 1);
  const limit = Math.min(100, Math.max(1, Number.parseInt(params.get("limit") || "20", 10) || 20));
  const filter = {};
  for (const key of ["type", "status", "source"]) {
    const value = params.get(key);
    if (value) filter[key] = value;
  }

  await connectDb();
  const [items, total] = await Promise.all([
    Feedback.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .select("-ipHash")
      .lean(),
    Feedback.countDocuments(filter),
  ]);

  return ok(
    { items: items.map((f) => ({ ...f, _id: String(f._id), userId: f.userId ? String(f.userId) : null })) },
    {},
    { page, limit, total, totalPages: Math.ceil(total / limit) }
  );
}
