import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { verifyWebhookSignature } from "@/lib/paystack";

/**
 * POST /api/payments/webhook
 *
 * Paystack webhook handler. Paystack sends events here after
 * transaction completion (async — more reliable than callback redirect).
 *
 * Security: HMAC SHA-512 signature verified before processing.
 * Idempotency: checks if payment reference already processed.
 */
export async function POST(req: NextRequest) {
  try {
    // 1. Read raw body for signature verification
    const rawBody = await req.text();

    // 2. Verify webhook signature
    const signature = req.headers.get("x-paystack-signature") || "";
    if (!verifyWebhookSignature(rawBody, signature)) {
      return NextResponse.json({ success: false, error: "Invalid signature" }, { status: 401 });
    }

    // 3. Parse event
    const event = JSON.parse(rawBody);

    // Only process charge.success events
    if (event.event !== "charge.success") {
      return NextResponse.json({ success: true, data: { ignored: true, event: event.event } });
    }

    const data = event.data;
    const reference = data.reference;
    const metadata = data.metadata || {};

    // 4. Idempotency check — skip if already processed
    const svc = createServiceClient();

    const { data: existing } = await svc
      .from("payments")
      .select("id")
      .eq("transaction_ref", reference)
      .maybeSingle();

    if (existing) {
      return NextResponse.json({ success: true, data: { handled: true, existing: true } });
    }

    // 5. Extract metadata
    const invoiceId = metadata.invoice_id;
    const patientId = metadata.patient_id;
    const amountNaira = data.amount / 100; // kobo → Naira

    if (!invoiceId || !patientId) {
      console.error("[Paystack Webhook] Missing invoice_id or patient_id in metadata", { reference, metadata });
      return NextResponse.json({ success: false, error: "Missing metadata" }, { status: 400 });
    }

    // 6. Insert payment record
    const { error: payError } = await svc.from("payments").insert({
      invoice_id: invoiceId,
      patient_id: patientId,
      amount: amountNaira,
      payment_method: data.channel === "card" ? "card" : "transfer",
      status: "completed",
      transaction_ref: reference,
      payment_date: data.paid_at || new Date().toISOString(),
      notes: JSON.stringify({
        channel: data.channel,
        card_type: data.authorization?.card_type,
        last4: data.authorization?.last4,
        bank: data.authorization?.bank,
        fees: data.fees,
        paid_at: data.paid_at,
      }),
    });

    if (payError) {
      console.error("[Paystack Webhook] Failed to insert payment:", payError);
      return NextResponse.json({ success: false, error: payError.message }, { status: 500 });
    }

    // 7. Update invoice paid_amount and status
    const { data: invoice } = await svc
      .from("invoices")
      .select("paid_amount, total_amount")
      .eq("id", invoiceId)
      .single();

    if (invoice) {
      const newPaid = (invoice.paid_amount || 0) + amountNaira;
      const newStatus = newPaid >= invoice.total_amount ? "paid" : "partially_paid";
      await svc.from("invoices").update({ paid_amount: newPaid, status: newStatus }).eq("id", invoiceId);
    }

    return NextResponse.json({ success: true, data: { handled: true } });
  } catch (err: any) {
    console.error("[Paystack Webhook] Error:", err);
    return NextResponse.json({ success: false, error: err.message || "Webhook error" }, { status: 500 });
  }
}
