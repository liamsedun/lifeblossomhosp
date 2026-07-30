import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", authUser.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const { searchParams } = new URL(req.url);
    const invoiceId = searchParams.get("invoice_id");
    const patientId = searchParams.get("patient_id");

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("payments")
      .select("*, invoice:invoices(*), patient:patients(*, user:users(*))")
      .eq("org_id", currentUser.org_id);

    if (invoiceId) query = query.eq("invoice_id", invoiceId);
    if (patientId) query = query.eq("patient_id", patientId);

    query = query.order("payment_date", { ascending: false });

    const { data, error } = await query;
    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const { data: currentUser } = await supabase
      .from("users")
      .select("org_id")
      .eq("id", authUser.id)
      .single();

    if (!currentUser) {
      return NextResponse.json({ success: false, error: "User not found" }, { status: 404 });
    }

    const body = await req.json();
    const { invoice_id, patient_id, amount, payment_method, reference_number, notes } = body;

    if (!invoice_id || !patient_id || !amount || !payment_method) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: invoice_id, patient_id, amount, payment_method",
      }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data: invoice, error: invoiceError } = await serviceClient
      .from("invoices")
      .select("id, total, status, org_id")
      .eq("id", invoice_id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (invoiceError || !invoice) {
      return NextResponse.json({ success: false, error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.status === "paid" || invoice.status === "cancelled" || invoice.status === "refunded") {
      return NextResponse.json({ success: false, error: `Cannot add payment to invoice with status '${invoice.status}'` }, { status: 400 });
    }

    const { data: payment, error: paymentError } = await serviceClient
      .from("payments")
      .insert({
        org_id: currentUser.org_id,
        invoice_id,
        patient_id,
        amount,
        payment_method,
        reference_number: reference_number || null,
        status: "completed",
        notes: notes || null,
      })
      .select("*, invoice:invoices(*), patient:patients(*, user:users(*))")
      .single();

    if (paymentError) {
      return NextResponse.json({ success: false, error: paymentError.message }, { status: 500 });
    }

    const { data: totalPayments } = await serviceClient
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoice_id)
      .eq("status", "completed");

    const paidAmount = (totalPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

    let newStatus = invoice.status;
    if (paidAmount >= invoice.total) {
      newStatus = "paid";
    } else if (paidAmount > 0) {
      newStatus = "partially_paid";
    }

    if (newStatus !== invoice.status) {
      await serviceClient
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", invoice_id)
        .eq("org_id", currentUser.org_id);
    }

    return NextResponse.json({ success: true, data: payment }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
