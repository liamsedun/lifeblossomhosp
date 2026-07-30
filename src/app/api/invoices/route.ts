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
    const patientId = searchParams.get("patient_id");
    const status = searchParams.get("status");

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("invoices")
      .select("*, patient:patients(*, user:users(*)), appointment:appointments(*), items:invoice_items(*), payments:payments(*)")
      .eq("org_id", currentUser.org_id);

    if (patientId) query = query.eq("patient_id", patientId);
    if (status) query = query.eq("status", status);

    query = query.order("created_at", { ascending: false });

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
    const { patient_id, appointment_id, due_date, notes, items } = body;

    if (!patient_id || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "Missing required fields: patient_id, items (non-empty array)" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { count } = await serviceClient
      .from("invoices")
      .select("id", { count: "exact", head: true })
      .eq("org_id", currentUser.org_id);

    const year = new Date().getFullYear();
    const invoiceNumber = `INV-${year}-${String((count || 0) + 1).padStart(4, "0")}`;

    const lineItems = items.map((item: any) => ({
      description: item.description,
      quantity: item.quantity || 1,
      unit_price: item.unit_price,
      total: (item.quantity || 1) * item.unit_price,
    }));

    const subtotal = lineItems.reduce((sum: number, item: any) => sum + item.total, 0);
    const tax = body.tax || 0;
    const total = subtotal + tax;

    const { data: invoice, error: invoiceError } = await serviceClient
      .from("invoices")
      .insert({
        org_id: currentUser.org_id,
        patient_id,
        appointment_id: appointment_id || null,
        invoice_number: invoiceNumber,
        subtotal,
        tax,
        total,
        status: "draft",
        due_date: due_date || null,
        notes: notes || null,
      })
      .select()
      .single();

    if (invoiceError) {
      return NextResponse.json({ success: false, error: invoiceError.message }, { status: 500 });
    }

    const invoiceItems = lineItems.map((item: any) => ({
      ...item,
      invoice_id: invoice.id,
    }));

    const { data: createdItems, error: itemsError } = await serviceClient
      .from("invoice_items")
      .insert(invoiceItems)
      .select();

    if (itemsError) {
      return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      data: { ...invoice, items: createdItems },
    }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
