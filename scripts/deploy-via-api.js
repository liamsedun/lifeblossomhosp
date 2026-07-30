// Deploy schema via Supabase REST API + service_role key
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env.local") });

const SUPABASE_URL = "https://hkqhsgdutaaufqqrekdx.supabase.co";
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Try multiple approaches to execute SQL
async function tryExecuteViaPostgrest(sql) {
  // Approach 1: Call via PostgREST with raw SQL (requires rpc/pg_query)
  try {
    const res = await fetch(
      `${SUPABASE_URL}/rest/v1/rpc/pg_query`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: SERVICE_KEY,
          Authorization: `Bearer ${SERVICE_KEY}`,
        },
        body: JSON.stringify({ query: sql }),
      }
    );
    if (res.ok) return { ok: true, method: "rpc/pg_query" };
    console.log("  rpc/pg_query failed:", res.status, await res.text().catch(()=>""));
  } catch (e) {
    console.log("  rpc/pg_query error:", e.message);
  }

  // Approach 2: Try executing via database REST API (graphql endpoint)
  try {
    const res = await fetch(`${SUPABASE_URL}/graphql/v1`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apiKey: SERVICE_KEY,
        Authorization: `Bearer ${SERVICE_KEY}`,
      },
      body: JSON.stringify({
        query: `mutation { executeSql(sql: ${JSON.stringify(sql)}) }`,
      }),
    });
    if (res.ok) return { ok: true, method: "graphql" };
    console.log("  graphql failed:", res.status);
  } catch (e) {
    console.log("  graphql error:", e.message);
  }

  return { ok: false };
}

async function deploy() {
  const resetSql = fs.readFileSync(
    path.join(__dirname, "..", "database", "reset.sql"),
    "utf8"
  );
  const schemaSql = fs.readFileSync(
    path.join(__dirname, "..", "database", "schema.sql"),
    "utf8"
  );

  console.log("Step 1: Resetting...");
  let r = await tryExecuteViaPostgrest(resetSql);
  if (!r.ok) {
    console.log("Reset approach failed, continuing to schema anyway...");
  } else {
    console.log("Reset ok via", r.method);
  }

  console.log("\nStep 2: Deploying schema...");
  r = await tryExecuteViaPostgrest(schemaSql);
  if (r.ok) {
    console.log("\nSchema deployed successfully via", r.method);
  } else {
    console.log("\nCould not deploy via API. Please paste the SQL manually.");
    console.log("Go to https://supabase.com/dashboard/project/hkqhsgdutaaufqqrekdx/sql/new");
    console.log("Open database/reset.sql, paste and run FIRST.");
    console.log("Then open database/schema.sql, paste and run SECOND.");
  }
}

deploy().catch((e) => console.error("Deploy failed:", e.message));
