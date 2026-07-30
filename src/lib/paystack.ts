// ─────────────────────────────────────────────────────────────────────────────
// Paystack payment integration — shared helpers
// Docs: https://paystack.com/docs/api
// ─────────────────────────────────────────────────────────────────────────────

const BASE = "https://api.paystack.co";

/** Get the secret key from env, throwing if not set. */
function secretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

/** Raw POST to Paystack API. */
async function post<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Paystack API error");
  return json.data as T;
}

/** Raw GET from Paystack API. */
async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    headers: { Authorization: `Bearer ${secretKey()}` },
  });
  const json = await res.json();
  if (!json.status) throw new Error(json.message || "Paystack API error");
  return json.data as T;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface InitResponse {
  authorization_url: string;
  access_code: string;
  reference: string;
}

export interface VerifyResponse {
  id: number;
  status: "success" | "failed" | "abandoned" | "pending";
  reference: string;
  amount: number; // in kobo
  channel: string; // "card" | "bank" | "ussd" | "qr" | "mobile_money" | "bank_transfer"
  currency: string;
  paid_at: string;
  created_at: string;
  customer: { email: string; id: number };
  authorization: Record<string, any>;
  metadata: Record<string, any>;
  fees: number;
  paidAt: string;
}

export interface WebhookEvent {
  event: "charge.success" | "charge.failed" | "transfer.success" | "transfer.failed";
  data: {
    id: number;
    reference: string;
    status: string;
    amount: number;
    channel: string;
    currency: string;
    paid_at: string;
    customer: { email: string };
    metadata: Record<string, any>;
    authorization: Record<string, any>;
  };
}

// ─── API methods ─────────────────────────────────────────────────────────────

/**
 * Initialize a transaction.
 * `amount` in kobo (e.g. ₦5000 = 500000).
 * `metadata` should include `{ invoice_id, patient_id, org_id }`.
 */
export async function initializeTransaction(opts: {
  email: string;
  amountKobo: number;
  reference?: string;
  metadata?: Record<string, any>;
  callbackUrl?: string;
}): Promise<InitResponse> {
  return post("/transaction/initialize", {
    email: opts.email,
    amount: opts.amountKobo,
    reference: opts.reference,
    metadata: opts.metadata || {},
    callback_url: opts.callbackUrl,
  });
}

/** Verify a transaction by reference. */
export async function verifyTransaction(reference: string): Promise<VerifyResponse> {
  return get(`/transaction/verify/${encodeURIComponent(reference)}`);
}

/** Verify the webhook HMAC signature. */
export function verifyWebhookSignature(body: string, signature: string): boolean {
  const crypto = require("crypto");
  const hash = crypto
    .createHmac("sha512", process.env.PAYSTACK_WEBHOOK_SECRET || "")
    .update(body)
    .digest("hex");
  return hash === signature;
}
