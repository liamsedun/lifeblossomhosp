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
    const staffId = searchParams.get("staff_id");
    const status = searchParams.get("status");
    const date = searchParams.get("date");

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("appointments")
      .select("*, patient:patients(*, user:users(*)), staff:staff(*, user:users(*))")
      .eq("org_id", currentUser.org_id);

    if (patientId) query = query.eq("patient_id", patientId);
    if (staffId) query = query.eq("staff_id", staffId);
    if (status) query = query.eq("status", status);
    if (date) query = query.eq("appointment_date", date);

    query = query.order("appointment_date", { ascending: false });
    query = query.order("start_time", { ascending: false });

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
    const { patient_id, staff_id, appointment_date, start_time, end_time, type, reason, notes } = body;

    if (!patient_id || !staff_id || !appointment_date || !start_time || !end_time) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: patient_id, staff_id, appointment_date, start_time, end_time",
      }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data: staff } = await serviceClient
      .from("staff")
      .select("id, is_available, available_from, available_until")
      .eq("id", staff_id)
      .eq("org_id", currentUser.org_id)
      .single();

    if (!staff) {
      return NextResponse.json({ success: false, error: "Staff not found" }, { status: 404 });
    }

    if (!staff.is_available) {
      return NextResponse.json({ success: false, error: "Staff is not available for appointments" }, { status: 409 });
    }

    if (staff.available_from && staff.available_until) {
      if (start_time < staff.available_from || end_time > staff.available_until) {
        return NextResponse.json({
          success: false,
          error: `Staff availability is ${staff.available_from} to ${staff.available_until}`,
        }, { status: 409 });
      }
    }

    const { data: conflicting, error: conflictError } = await serviceClient
      .from("appointments")
      .select("id, start_time, end_time")
      .eq("staff_id", staff_id)
      .eq("appointment_date", appointment_date)
      .neq("status", "cancelled")
      .or(`and(start_time.lte.${end_time},end_time.gt.${start_time})`);

    if (conflictError) {
      return NextResponse.json({ success: false, error: conflictError.message }, { status: 500 });
    }

    if (conflicting && conflicting.length > 0) {
      return NextResponse.json({ success: false, error: "Staff has a conflicting appointment at this time" }, { status: 409 });
    }

    const { data, error } = await serviceClient
      .from("appointments")
      .insert({
        org_id: currentUser.org_id,
        patient_id,
        staff_id,
        appointment_date,
        start_time,
        end_time,
        type: type || "in_person",
        reason: reason || null,
        notes: notes || null,
        status: "scheduled",
      })
      .select("*, patient:patients(*, user:users(*)), staff:staff(*, user:users(*))")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
