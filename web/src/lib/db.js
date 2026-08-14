import mongoose from "mongoose";

const globalForMongo = globalThis;

/**
 * Connect once per process (Next.js hot-reload safe).
 */
export async function connectDb() {
  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }
  if (globalForMongo._nsplitMongoPromise) {
    return globalForMongo._nsplitMongoPromise;
  }

  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error("MONGODB_URI is not set");
  }

  globalForMongo._nsplitMongoPromise = mongoose.connect(uri, {
    bufferCommands: false,
  });

  await globalForMongo._nsplitMongoPromise;
  return mongoose.connection;
}

/**
 * Run work in a Mongo transaction when supported; otherwise sequential.
 * Standalone local Mongo often has no replica set - fallback keeps DX easy.
 */
export async function withTransaction(fn) {
  await connectDb();

  let session;
  try {
    session = await mongoose.startSession();
    session.startTransaction();
    const result = await fn(session);
    await session.commitTransaction();
    return result;
  } catch (err) {
    if (session) {
      try {
        await session.abortTransaction();
      } catch {
        // ignore
      }
    }
    // Fallback when transactions are unavailable (standalone Mongo)
    const msg = String(err?.message || err);
    if (
      msg.includes("Transaction numbers are only allowed") ||
      msg.includes("replica set") ||
      msg.includes("not supported")
    ) {
      return fn(null);
    }
    throw err;
  } finally {
    if (session) session.endSession();
  }
}

function isObjectId(value) {
  return (
    value != null &&
    typeof value === "object" &&
    (value._bsontype === "ObjectId" || value.constructor?.name === "ObjectId")
  );
}

function stringifyMongo(value) {
  if (value == null) return value;
  if (value instanceof Date) return value;
  if (isObjectId(value)) return String(value);
  if (Array.isArray(value)) return value.map(stringifyMongo);
  if (typeof value === "object") {
    const out = {};
    for (const [k, v] of Object.entries(value)) {
      if (k === "__v") continue;
      out[k] = stringifyMongo(v);
    }
    return out;
  }
  return value;
}

export function toJSON(doc) {
  if (!doc) return null;
  const obj = typeof doc.toObject === "function" ? doc.toObject() : { ...doc };
  return stringifyMongo(obj);
}

export function toJSONList(docs) {
  return (docs || []).map(toJSON);
}
