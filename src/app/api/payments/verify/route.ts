import { NextRequest } from "next/server";
import { withAuth, ok, err } from "@/lib/api-utils";
import { verifyTransaction } from "@/lib/paystack";

/**
 * GET /api/payments/verify?reference=xxx
 *
 * Check the status of a Paystack transaction by reference.
 * Returns the full verification data from Paystack + our local payment record.
 */
export const GET = withAuth(async (req, supabase) => {
  const reference = new URL(req.url).searchParams.get("reference");
  if (!reference) return err("Missing reference query param", 400);

  // Get local payment record
  const { data: localPayment } = await supabase
    .from("payments")
    .select("*, invoice:invoices(*), patient:patients(*, user:users(id, first_name, last_name))")
    .eq("transaction_ref", reference)
    .maybeSingle();

  // Verify with Paystack
  let paystackData = null;
  try {
    paystackData = await verifyTransaction(reference);
  } catch (e: any) {
    // Paystack verification might fail if reference is invalid
    paystackData = { error: e.message };
  }

  return ok({
    reference,
    payment: localPayment,
    paystack: paystackData,
  });
});
