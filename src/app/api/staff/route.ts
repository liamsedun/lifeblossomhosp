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
    const department = searchParams.get("department");
    const isAvailable = searchParams.get("is_available");

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("staff")
      .select("*, user:users(*)")
      .eq("org_id", currentUser.org_id);

    if (department) {
      query = query.eq("department", department);
    }

    if (isAvailable !== null) {
      query = query.eq("is_available", isAvailable === "true");
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
    const { email, password, first_name, last_name, phone, role, ...staffFields } = body;
    if (!email || !password || !first_name || !last_name || !role) {
      return NextResponse.json({ success: false, error: "Missing required fields: email, password, first_name, last_name, role" }, { status: 400 });
    }

    const validRoles = ["doctor", "nurse", "admin", "accountant"];
    if (!validRoles.includes(role)) {
      return NextResponse.json({ success: false, error: "Invalid role. Must be one of: doctor, nurse, admin, accountant" }, { status: 400 });
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
        role,
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
      .from("staff")
      .select("id", { count: "exact", head: true })
      .eq("org_id", currentUser.org_id);

    const staffNumber = `STF-${String((count || 0) + 1).padStart(4, "0")}`;

    const { data: staff, error: staffError } = await serviceClient
      .from("staff")
      .insert({
        org_id: currentUser.org_id,
        user_id: authData.user.id,
        staff_number: staffNumber,
        specialization: staffFields.specialization || null,
        license_number: staffFields.license_number || null,
        department: staffFields.department || null,
        is_available: staffFields.is_available !== undefined ? staffFields.is_available : true,
        available_from: staffFields.available_from || null,
        available_until: staffFields.available_until || null,
      })
      .select("*, user:users(*)")
      .single();

    if (staffError) {
      return NextResponse.json({ success: false, error: staffError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: staff }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
