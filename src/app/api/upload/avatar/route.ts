import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { writeFile, mkdir } from "fs/promises";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) {
      return NextResponse.json({ success: false, error: "Not authenticated" }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get("avatar") as File | null;
    if (!file) {
      return NextResponse.json({ success: false, error: "No file provided" }, { status: 400 });
    }

    const ext = file.name.split(".").pop() || "png";
    const fileName = `avatar-${authUser.id}-${Date.now()}.${ext}`;

    // Save to a private directory outside public/
    const uploadDir = path.join(process.cwd(), "uploads", "avatars");
    await mkdir(uploadDir, { recursive: true });

    const buffer = Buffer.from(await file.arrayBuffer());
    const filePath = path.join(uploadDir, fileName);
    await writeFile(filePath, buffer);

    // Store URL pointing to our API serving route
    const avatarUrl = `/api/uploads/avatars/${fileName}`;

    const { error: updateError } = await supabase
      .from("users")
      .update({ avatar_url: avatarUrl })
      .eq("id", authUser.id);

    if (updateError) {
      return NextResponse.json({ success: false, error: updateError.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, data: { avatar_url: avatarUrl } });
  } catch {
    return NextResponse.json({ success: false, error: "Internal server error" }, { status: 500 });
  }
}
