import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json();
    if (!email || !password) {
      return NextResponse.json({ success: false, error: "Email and password required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      return NextResponse.json({ success: false, error: authError.message }, { status: 401 });
    }

    const { data: user } = await supabase
      .from("users")
      .select("*, organization:organizations(*)")
      .eq("id", authData.user.id)
      .single();

    return NextResponse.json({ success: true, data: { user, session: authData.session } });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
