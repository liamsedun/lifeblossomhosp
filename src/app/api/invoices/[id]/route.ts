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
      .from("invoices")
      .select("*, patient:patients(*, user:users(*)), appointment:appointments(*), items:invoice_items(*), payments:payments(*)")
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
      .from("invoices")
      .select("id")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    const updatableFields = [
      "patient_id", "appointment_id", "status", "due_date", "notes", "subtotal", "tax", "total",
    ];
    for (const field of updatableFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    if (body.items && Array.isArray(body.items)) {
      if (body.items.length > 0) {
        const lineItems = body.items.map((item: any) => ({
          description: item.description,
          quantity: item.quantity || 1,
          unit_price: item.unit_price,
          total: (item.quantity || 1) * item.unit_price,
        }));

        updateData.subtotal = lineItems.reduce((sum: number, item: any) => sum + item.total, 0);
        updateData.tax = body.tax !== undefined ? body.tax : (updateData.tax || existing.tax || 0);
        updateData.total = updateData.subtotal + updateData.tax;
      }
    }

    const { data, error } = await serviceClient
      .from("invoices")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .select("*, patient:patients(*, user:users(*)), appointment:appointments(*), items:invoice_items(*), payments:payments(*)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      await serviceClient
        .from("invoice_items")
        .delete()
        .eq("invoice_id", id);

      const newItems = body.items.map((item: any) => {
        const qty = item.quantity || 1;
        return {
          invoice_id: id,
          description: item.description,
          quantity: qty,
          unit_price: item.unit_price,
          total: qty * item.unit_price,
        };
      });

      const { data: updatedItems } = await serviceClient
        .from("invoice_items")
        .insert(newItems)
        .select();

      return NextResponse.json({ success: true, data: { ...data, items: updatedItems } });
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
      .from("invoices")
      .select("id, status")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const { error } = await serviceClient
      .from("invoices")
      .update({ status: "cancelled" })
      .eq("id", id)
      .eq("org_id", currentUser.org_id);

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
