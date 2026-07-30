import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const serviceClient = createServiceClient();
    const { data, error } = await serviceClient
      .from("payments")
      .select("*, invoice:invoices(*), patient:patients(*, user:users(*))")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (error) {
      if (error.code === "PGRST116") {
        return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
      }
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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
    const serviceClient = createServiceClient();

    const { data: existing } = await serviceClient
      .from("payments")
      .select("id, invoice_id")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    const updatableFields = [
      "amount", "payment_method", "reference_number", "status", "notes", "payment_date",
    ];
    for (const field of updatableFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const { data, error } = await serviceClient
      .from("payments")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .select("*, invoice:invoices(*), patient:patients(*, user:users(*))")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: invoice } = await serviceClient
      .from("invoices")
      .select("id, total")
      .eq("id", existing.invoice_id)
      .single();

    if (invoice) {
      const { data: totalPayments } = await serviceClient
        .from("payments")
        .select("amount")
        .eq("invoice_id", existing.invoice_id)
        .eq("status", "completed");

      const paidAmount = (totalPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

      let newStatus = "pending";
      if (paidAmount >= invoice.total) {
        newStatus = "paid";
      } else if (paidAmount > 0) {
        newStatus = "partially_paid";
      }

      await serviceClient
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", existing.invoice_id);
    }

    return NextResponse.json({ success: true, data });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
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

    const serviceClient = createServiceClient();

    const { data: existing } = await serviceClient
      .from("payments")
      .select("id, invoice_id")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const { error } = await serviceClient
      .from("payments")
      .delete()
      .eq("id", id)
      .eq("org_id", currentUser.org_id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    const { data: invoice } = await serviceClient
      .from("invoices")
      .select("id, total")
      .eq("id", existing.invoice_id)
      .single();

    if (invoice) {
      const { data: totalPayments } = await serviceClient
        .from("payments")
        .select("amount")
        .eq("invoice_id", existing.invoice_id)
        .eq("status", "completed");

      const paidAmount = (totalPayments || []).reduce((sum: number, p: any) => sum + p.amount, 0);

      let newStatus = "pending";
      if (paidAmount >= invoice.total) {
        newStatus = "paid";
      } else if (paidAmount > 0) {
        newStatus = "partially_paid";
      }

      await serviceClient
        .from("invoices")
        .update({ status: newStatus })
        .eq("id", existing.invoice_id);
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
