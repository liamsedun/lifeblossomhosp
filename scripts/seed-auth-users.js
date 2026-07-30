// Create seed users in Supabase Auth
// Run AFTER schema.sql
const { createClient } = require("@supabase/supabase-js");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const supabase = createClient(
  "https://hkqhsgdutaaufqqrekdx.supabase.co",
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const users = [
  { email: "admin@lifeblossom.com", password: "Password123!" },
  { email: "doctor@lifeblossom.com", password: "Password123!" },
  { email: "nurse@lifeblossom.com", password: "Password123!" },
  { email: "patient@lifeblossom.com", password: "Password123!" },
  { email: "accountant@lifeblossom.com", password: "Password123!" },
];

async function seed() {
  for (const u of users) {
    const { data, error } = await supabase.auth.admin.createUser({
      email: u.email,
      password: u.password,
      email_confirm: true,
    });
    if (error) {
      if (error.message.includes("already exists")) {
        console.log(`Skipping ${u.email} — already exists`);
      } else {
        console.error(`Error creating ${u.email}:`, error.message);
      }
    } else {
      console.log(`Created ${u.email} with id ${data.user.id}`);
    }
  }
  console.log("Done. Login should work now.");
}

seed().catch(console.error);
