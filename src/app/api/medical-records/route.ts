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
    const recordType = searchParams.get("record_type");

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("medical_records")
      .select("*, patient:patients(*, user:users(*)), staff:staff(*, user:users(*)), appointment:appointments(*)")
      .eq("org_id", currentUser.org_id);

    if (patientId) query = query.eq("patient_id", patientId);
    if (recordType) query = query.eq("record_type", recordType);

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
    const { patient_id, staff_id, appointment_id, record_type, title, description, diagnosis, notes, attachments, is_confidential } = body;

    if (!patient_id || !staff_id || !record_type || !title) {
      return NextResponse.json({
        success: false,
        error: "Missing required fields: patient_id, staff_id, record_type, title",
      }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("medical_records")
      .insert({
        org_id: currentUser.org_id,
        patient_id,
        staff_id,
        appointment_id: appointment_id || null,
        record_type,
        title,
        description: description || null,
        diagnosis: diagnosis || null,
        notes: notes || null,
        attachments: attachments || [],
        is_confidential: is_confidential || false,
      })
      .select("*, patient:patients(*, user:users(*)), staff:staff(*, user:users(*)), appointment:appointments(*)")
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
