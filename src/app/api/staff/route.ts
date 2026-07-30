import { NextRequest } from "next/server";
import { withAuth, ok, paginated, err, parseBody, getPagination, ValidationError } from "@/lib/api-utils";

export const GET = withAuth(async (req, supabase, authUserId) => {
  const sp = new URL(req.url).searchParams;
  const department = sp.get("department");
  const available = sp.get("is_available");
  const { page, pageSize, from, to } = getPagination(sp);

  // If caller is a patient, return only public fields (name, specialty, department)
  const { data: caller } = await supabase.from("users").select("role").eq("id", authUserId).single();
  const isPatientCaller = caller?.role === "patient";

  if (isPatientCaller) {
    let query = supabase
      .from("staff")
      .select("id, staff_number, specialization, department, is_available, user:users!inner(id, first_name, last_name)",
        { count: "exact" });

    if (department) query = query.eq("department", department);
    if (available !== null) query = query.eq("is_available", available === "true");

    const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
    if (error) return err(error.message, 500);
    return paginated(data, count || 0, page, pageSize);
  }

  let query = supabase
    .from("staff")
    .select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)",
      { count: "exact" });

  if (department) query = query.eq("department", department);
  if (available !== null) query = query.eq("is_available", available === "true");

  const { data, error, count } = await query.order("created_at", { ascending: false }).range(from, to);
  if (error) return err(error.message, 500);
  return paginated(data, count || 0, page, pageSize);
});

export const POST = withAuth(async (req, supabase, authUserId) => {
  const body = await parseBody<{
    email: string; password: string; first_name: string; last_name: string;
    phone?: string; role: string; specialization?: string; license_number?: string;
    department?: string; qualification?: string; employment_type?: string;
  }>(req);

  if (!body.email || !body.password || !body.first_name || !body.last_name || !body.role) {
    throw new ValidationError("Missing required fields: email, password, first_name, last_name, role");
  }
  if (!["doctor", "nurse", "admin", "accountant", "super_admin"].includes(body.role)) {
    throw new ValidationError("Invalid role. Must be: doctor, nurse, admin, accountant, super_admin");
  }

  // Create auth user
  const { data: authData, error: signUpError } = await supabase.auth.signUp({ email: body.email, password: body.password });
  if (signUpError) return err(signUpError.message, 400);
  if (!authData.user) return err("Failed to create auth user", 500);

  // Get org_id
  const { data: profile } = await supabase.from("users").select("org_id").eq("id", authUserId).single();
  if (!profile) return err("Profile not found", 404);

  // Create user record
  const { error: userError } = await supabase.from("users").insert({
    id: authData.user.id, org_id: profile.org_id, email: body.email,
    role: body.role, first_name: body.first_name, last_name: body.last_name,
    phone: body.phone || null, password_hash: "",
  });
  if (userError) return err(userError.message, 500);

  // Generate staff number
  const { count } = await supabase.from("staff").select("id", { count: "exact", head: true });
  const staffNumber = `STF-${String((count || 0) + 1).padStart(4, "0")}`;

  const { data, error } = await supabase.from("staff").insert({
    org_id: profile.org_id, user_id: authData.user.id, staff_number: staffNumber,
    specialization: body.specialization || null, license_number: body.license_number || null,
    department: body.department || null, qualification: body.qualification || null,
    employment_type: body.employment_type || "full_time",
  }).select("*, user:users(id, org_id, email, role, first_name, last_name, phone, avatar_url, is_active)").single();

  if (error) return err(error.message, 500);
  return ok(data, 201);
});
