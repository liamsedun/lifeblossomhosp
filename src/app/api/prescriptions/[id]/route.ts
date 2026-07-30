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
      .from("prescriptions")
      .select("*, patient:patients(*, user:users(*)), doctor:staff!doctor_id(*, user:users(*)), appointment:appointments(*), items:prescription_items(*)")
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
      .from("prescriptions")
      .select("id")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const updateData: Record<string, any> = {};
    const updatableFields = [
      "patient_id", "doctor_id", "appointment_id", "diagnosis", "notes", "status",
    ];
    for (const field of updatableFields) {
      if (body[field] !== undefined) updateData[field] = body[field];
    }

    const { data, error } = await serviceClient
      .from("prescriptions")
      .update(updateData)
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .select("*, patient:patients(*, user:users(*)), doctor:staff!doctor_id(*, user:users(*)), appointment:appointments(*), items:prescription_items(*)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    if (body.items && Array.isArray(body.items)) {
      await serviceClient
        .from("prescription_items")
        .delete()
        .eq("prescription_id", id);

      const newItems = body.items.map((item: any) => ({
        prescription_id: id,
        medication_name: item.medication_name,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration || null,
        route: item.route || "oral",
        quantity: item.quantity || null,
        refills_remaining: item.refills_remaining || 0,
        instructions: item.instructions || null,
      }));

      const { data: updatedItems } = await serviceClient
        .from("prescription_items")
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
      .from("prescriptions")
      .select("id")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const { error } = await serviceClient
      .from("prescriptions")
      .delete()
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
