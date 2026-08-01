import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("image") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const fileName = `doctor-${Date.now()}-${Math.round(Math.random() * 1e6)}.${ext}`;

    const admin = createServiceClient();
    const { error: uploadError } = await admin.storage
      .from("doctor-images")
      .upload(fileName, file, {
        upsert: true,
        contentType: file.type || "application/octet-stream",
      });

    if (uploadError) {
      return NextResponse.json({ success: false, error: uploadError.message }, { status: 500 });
    }

    const { data: { publicUrl } } = admin.storage.from("doctor-images").getPublicUrl(fileName);

    return NextResponse.json({ success: true, data: { image_url: publicUrl } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
