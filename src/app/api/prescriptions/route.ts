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

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("prescriptions")
      .select("*, patient:patients(*, user:users(*)), doctor:staff!doctor_id(*, user:users(*)), appointment:appointments(*)")
      .eq("org_id", currentUser.org_id);

    if (patientId) query = query.eq("patient_id", patientId);

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
    const { patient_id, doctor_id, appointment_id, diagnosis, notes, items } = body;

    if (!patient_id || !doctor_id) {
      return NextResponse.json({ success: false, error: "Missing required fields: patient_id, doctor_id" }, { status: 400 });
    }

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ success: false, error: "At least one prescription item is required" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data: prescription, error: prescriptionError } = await serviceClient
      .from("prescriptions")
      .insert({
        org_id: currentUser.org_id,
        patient_id,
        doctor_id,
        appointment_id: appointment_id || null,
        diagnosis: diagnosis || null,
        notes: notes || null,
        status: "active",
      })
      .select("*, patient:patients(*, user:users(*)), doctor:staff!doctor_id(*, user:users(*)), appointment:appointments(*)")
      .single();

    if (prescriptionError) {
      return NextResponse.json({ success: false, error: prescriptionError.message }, { status: 500 });
    }

    const prescriptionItems = items.map((item: any) => ({
      prescription_id: prescription.id,
      medication_name: item.medication_name,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration || null,
      route: item.route || "oral",
      quantity: item.quantity || null,
      refills_remaining: item.refills_remaining || 0,
      instructions: item.instructions || null,
    }));

    const { data: createdItems, error: itemsError } = await serviceClient
      .from("prescription_items")
      .insert(prescriptionItems)
      .select();

    if (itemsError) {
      return NextResponse.json({ success: false, error: itemsError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { ...prescription, items: createdItems } }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
