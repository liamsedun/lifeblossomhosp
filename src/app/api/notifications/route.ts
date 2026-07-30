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
    const userId = searchParams.get("user_id");
    const isRead = searchParams.get("is_read");

    const serviceClient = createServiceClient();
    let query = serviceClient
      .from("notifications")
      .select("*")
      .eq("org_id", currentUser.org_id);

    if (userId) query = query.eq("user_id", userId);
    if (isRead !== null) query = query.eq("is_read", isRead === "true");

    query = query.order("sent_at", { ascending: false });

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
    const { user_id, type, title, message, link } = body;

    if (!user_id || !type || !title) {
      return NextResponse.json({ success: false, error: "Missing required fields: user_id, type, title" }, { status: 400 });
    }

    const serviceClient = createServiceClient();

    const { data, error } = await serviceClient
      .from("notifications")
      .insert({
        org_id: currentUser.org_id,
        user_id,
        type,
        title,
        message: message || null,
        link: link || null,
      })
      .select()
      .single();

    if (error) {
      return NextResponse.json({ success: false, error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data }, { status: 201 });
  } catch (err) {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
