import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { verifyTransaction } from "@/lib/paystack";

/**
 * GET /api/payments/callback?reference=xxx&trxref=xxx
 *
 * Handles the redirect from Paystack after a customer completes or cancels payment.
 * Verifies the transaction and updates the database.
 * Redirects the user to the patient payments page with a status indicator.
 */
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const reference = searchParams.get("reference") || searchParams.get("trxref");
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  if (!reference) {
    return NextResponse.redirect(`${appUrl}/patient/payments?status=error&message=Missing+reference`);
  }

  try {
    // Verify with Paystack
    const verification = await verifyTransaction(reference);

    if (verification.status === "success") {
      // Use service client to ensure we can read/write regardless of session
      // (callback is hit after redirect — user may have an active session or not)
      const svc = createServiceClient();

      // Check if this payment was already processed (idempotency)
      const { data: existing } = await svc
        .from("payments")
        .select("id")
        .eq("transaction_ref", reference)
        .maybeSingle();

      if (!existing) {
        const metadata = verification.metadata || {};
        const invoiceId = metadata.invoice_id;
        const patientId = metadata.patient_id;
        const amountNaira = verification.amount / 100; // kobo → Naira

        // Resolve org from the invoice (payments.org_id is NOT NULL)
        const { data: inv } = await svc.from("invoices").select("org_id").eq("id", invoiceId).maybeSingle();
        const orgId = inv?.org_id || null;

        // Insert payment record
        const { data: payment, error: payError } = await svc
          .from("payments")
          .insert({
            org_id: orgId,
            invoice_id: invoiceId,
            patient_id: patientId,
            amount: amountNaira,
            payment_method: verification.channel === "card" ? "card" : "transfer",
            status: "completed",
            transaction_ref: reference,
            payment_date: verification.paid_at || new Date().toISOString(),
            notes: JSON.stringify({
              channel: verification.channel,
              card_type: verification.authorization?.card_type,
              last4: verification.authorization?.last4,
              bank: verification.authorization?.bank,
              fees: verification.fees,
              paid_at: verification.paidAt,
            }),
          })
          .select()
          .single();

        if (payError) {
          console.error("[Paystack Callback] Failed to insert payment:", payError);
          return NextResponse.redirect(
            `${appUrl}/patient/payments?status=error&message=Payment+record+failed`
          );
        }

        // Update invoice paid_amount and status
        if (invoiceId) {
          const { data: invoice } = await svc
            .from("invoices")
            .select("paid_amount, total_amount")
            .eq("id", invoiceId)
            .single();

          if (invoice) {
            const newPaid = (invoice.paid_amount || 0) + amountNaira;
            const newStatus = newPaid >= invoice.total_amount ? "paid" : "partially_paid";
            await svc
              .from("invoices")
              .update({ paid_amount: newPaid, status: newStatus })
              .eq("id", invoiceId);
          }
        }
      }

      return NextResponse.redirect(`${appUrl}/patient/payments?status=success&reference=${reference}`);
    }

    // Payment not successful
    return NextResponse.redirect(
      `${appUrl}/patient/payments?status=failed&reference=${reference}&message=${verification.status}`
    );
  } catch (err: any) {
    console.error("[Paystack Callback] Verification failed:", err);
    return NextResponse.redirect(
      `${appUrl}/patient/payments?status=error&message=${encodeURIComponent(err.message || "Verification failed")}`
    );
  }
}
