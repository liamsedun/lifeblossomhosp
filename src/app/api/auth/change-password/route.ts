import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { err } from "@/lib/api-utils";

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();

    const { data: { user: authUser }, error: authError } = await supabase.auth.getUser();
    if (authError || !authUser) return err("Not authenticated", 401);

    const body = await req.json();
    const { current_password, new_password } = body;

    if (!current_password || !new_password) {
      return err("Current password and new password are required", 400);
    }
    if (new_password.length < 6) {
      return err("New password must be at least 6 characters", 400);
    }

    const email = authUser.email;
    if (!email) return err("Cannot identify user email", 400);

    // Verify current password
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email,
      password: current_password,
    });
    if (signInError) return err("Current password is incorrect", 403);

    // Update password
    const { error: updateError } = await supabase.auth.updateUser({
      password: new_password,
    });
    if (updateError) return err(updateError.message, 400);

    return Response.json({ success: true, data: { message: "Password updated successfully" } });
  } catch {
    return err("Internal server error", 500);
  }
}
