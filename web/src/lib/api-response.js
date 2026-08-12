import { NextResponse } from "next/server";

export function ok(data, init = {}, meta = undefined) {
  const body = { data, error: null };
  if (meta !== undefined) body.meta = meta;
  return NextResponse.json(body, { status: 200, ...init });
}

export function created(data, init = {}) {
  return NextResponse.json({ data, error: null }, { status: 201, ...init });
}

export function fail(message, status = 400, code = undefined, details = undefined) {
  return NextResponse.json(
    {
      data: null,
      error: {
        message,
        code: code ?? statusToCode(status),
        details: details ?? null,
      },
    },
    { status }
  );
}

function statusToCode(status) {
  if (status === 401) return "UNAUTHORIZED";
  if (status === 403) return "FORBIDDEN";
  if (status === 404) return "NOT_FOUND";
  if (status === 409) return "CONFLICT";
  if (status === 422) return "VALIDATION_ERROR";
  if (status === 501) return "NOT_IMPLEMENTED";
  return "BAD_REQUEST";
}

export function zodError(error) {
  return fail("Validation failed", 422, "VALIDATION_ERROR", error.flatten());
}
