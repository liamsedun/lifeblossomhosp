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
    const search = searchParams.get("search");

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("patients")
      .select("*, user:users(*)")
      .eq("org_id", currentUser.org_id);

    if (search) {
      query = query.or(
        `user.first_name.ilike.%${search}%,user.last_name.ilike.%${search}%,patient_number.ilike.%${search}%`
      );
    }

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
    const { email, password, first_name, last_name, phone, role, ...patientFields } = body;
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json({ success: false, error: "Missing required fields: email, password, first_name, last_name" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data: authData, error: signUpError } = await supabase.auth.signUp({ email, password });
    if (signUpError) {
      return NextResponse.json({ success: false, error: signUpError.message }, { status: 400 });
    }
    if (!authData.user) {
      return NextResponse.json({ success: false, error: "Failed to create auth user" }, { status: 500 });
    }

    const { data: user, error: userError } = await serviceClient
      .from("users")
      .insert({
        id: authData.user.id,
        org_id: currentUser.org_id,
        email,
        role: role || "patient",
        first_name,
        last_name,
        phone: phone || null,
      })
      .select("*, organization:organizations(*)")
      .single();

    if (userError) {
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
    }

    const { count } = await serviceClient
      .from("patients")
      .select("id", { count: "exact", head: true })
      .eq("org_id", currentUser.org_id);

    const patientNumber = `PT-${String((count || 0) + 1).padStart(4, "0")}`;

    const { data: patient, error: patientError } = await serviceClient
      .from("patients")
      .insert({
        org_id: currentUser.org_id,
        user_id: authData.user.id,
        patient_number: patientNumber,
        date_of_birth: patientFields.date_of_birth || null,
        gender: patientFields.gender || null,
        blood_group: patientFields.blood_group || null,
        address: patientFields.address || null,
        city: patientFields.city || null,
        state: patientFields.state || null,
        emergency_contact_name: patientFields.emergency_contact_name || null,
        emergency_contact_phone: patientFields.emergency_contact_phone || null,
        insurance_provider: patientFields.insurance_provider || null,
        insurance_number: patientFields.insurance_number || null,
      })
      .select("*, user:users(*)")
      .single();

    if (patientError) {
      return NextResponse.json({ success: false, error: patientError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: patient }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
