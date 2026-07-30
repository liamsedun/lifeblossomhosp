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
      .from("patients")
      .select("*, user:users(*)")
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
      .from("patients")
      .select("id, user_id")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!existing) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const { email, password, first_name, last_name, phone, role, ...patientFields } = body;

    if (first_name || last_name || phone) {
      const userUpdate: Record<string, any> = {};
      if (first_name) userUpdate.first_name = first_name;
      if (last_name) userUpdate.last_name = last_name;
      if (phone !== undefined) userUpdate.phone = phone;
      if (Object.keys(userUpdate).length > 0) {
        const { error: userUpdateError } = await serviceClient
          .from("users")
          .update(userUpdate)
          .eq("id", existing.user_id);
        if (userUpdateError) {
          return NextResponse.json({ success: false, error: userUpdateError.message }, { status: 500 });
        }
      }
    }

    const patientUpdate: Record<string, any> = {};
    const patientFieldsList = [
      "date_of_birth", "gender", "blood_group", "address", "city", "state",
      "emergency_contact_name", "emergency_contact_phone",
      "insurance_provider", "insurance_number",
    ];
    for (const field of patientFieldsList) {
      if (body[field] !== undefined) patientUpdate[field] = body[field];
    }

    const { data, error } = await serviceClient
      .from("patients")
      .update(patientUpdate)
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .select("*, user:users(*)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
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

    const { data: patient } = await serviceClient
      .from("patients")
      .select("id, user_id")
      .eq("id", id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!patient) {
      return NextResponse.json({ success: false, error: "Not found" }, { status: 404 });
    }

    const { error: userError } = await serviceClient
      .from("users")
      .update({ is_active: false })
      .eq("id", patient.user_id);

    if (userError) {
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: null });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
