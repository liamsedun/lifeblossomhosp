import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password, first_name, last_name, phone, role } = await req.json();
    if (!email || !password || !first_name || !last_name) {
      return NextResponse.json({ success: false, error: "Missing required fields" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 400 });
    }

    const orgId = "a0000000-0000-0000-0000-000000000001";

    const serviceClient = createServiceClient();
    const { data: user, error: userError } = await serviceClient
      .from("users")
      .insert({
        id: authData.user!.id,
        org_id: orgId,
        email,
        role: role || "patient",
        first_name,
        last_name,
        phone,
      })
      .select("*, organization:organizations(*)")
      .single();

    if (userError) {
      return NextResponse.json({ success: false, error: userError.message }, { status: 500 });
    }

    if (role === "patient" || !role) {
      const { data: count } = await serviceClient
        .from("patients")
        .select("id", { count: "exact", head: true })
        .eq("org_id", orgId);

      const patientNumber = `PT-${String((count?.length || 0) + 1).padStart(4, "0")}`;

      await serviceClient.from("patients").insert({
        org_id: orgId,
        user_id: authData.user!.id,
        patient_number: patientNumber,
      });
    }

    return NextResponse.json({ success: true, data: user }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
