import { NextRequest } from "next/server";
import { withAuth, ok, err, parseBody, ValidationError } from "@/lib/api-utils";
import { initializeTransaction } from "@/lib/paystack";

/**
 * POST /api/payments/initialize
 *
 * Creates a Paystack checkout session for an invoice.
 * Body: { invoice_id, patient_id, email, amount (in Naira, e.g. 5000) }
 *
 * Returns { authorization_url, access_code, reference }.
 * Frontend redirects the user to authorization_url.
 */
export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    invoice_id: string;
    patient_id: string;
    email: string;
    amount: number; // in Naira
  }>(req);

  if (!body.invoice_id || !body.patient_id || !body.email || !body.amount) {
    throw new ValidationError("Missing required fields: invoice_id, patient_id, email, amount");
  }

  // Verify the invoice exists and is payable
  const { data: invoice } = await supabase
    .from("invoices")
    .select("id, total_amount, paid_amount, status, invoice_number")
    .eq("id", body.invoice_id)
    .single();

  if (!invoice) return err("Invoice not found", 404);
  if (invoice.status === "paid") return err("Invoice already paid", 400);
  if (invoice.status === "cancelled" || invoice.status === "refunded") {
    return err("Invoice is cancelled or refunded", 400);
  }

  // Calculate remaining amount (in Naira, convert to kobo for Paystack)
  const outstanding = (invoice.total_amount || 0) - (invoice.paid_amount || 0);
  if (outstanding <= 0) return err("Invoice is fully paid", 400);

  // Amount paid must not exceed outstanding
  if (body.amount > outstanding) {
    return err(`Amount exceeds outstanding balance of ₦${outstanding.toLocaleString()}`, 400);
  }

  // Get user's org_id for metadata
  const { data: profile } = await supabase.from("users").select("org_id").eq("id", authUserId).single();
  const orgId = profile?.org_id;

  // Initialize Paystack transaction
  const callbackUrl = `${process.env.NEXT_PUBLIC_APP_URL}/api/payments/callback`;
  const result = await initializeTransaction({
    email: body.email,
    amountKobo: Math.round(body.amount * 100), // Naira → kobo
    metadata: {
      invoice_id: body.invoice_id,
      patient_id: body.patient_id,
      org_id: orgId,
      invoice_number: invoice.invoice_number,
    },
    callbackUrl,
  });

  return ok({
    authorization_url: result.authorization_url,
    access_code: result.access_code,
    reference: result.reference,
  });
});
