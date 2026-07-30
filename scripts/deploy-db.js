const { Client } = require("pg");
const fs = require("fs");
const path = require("path");
const dns = require("dns");

async function getDbHost() {
  return new Promise((resolve, reject) => {
    dns.resolve6("db.hkqhsgdutaaufqqrekdx.supabase.co", (err, addresses) => {
      if (err) return reject(err);
      resolve(addresses[0]);
    });
  });
}

async function deploy() {
  const ipv6 = await getDbHost();
  console.log("Resolved DB IPv6:", ipv6);

  const client = new Client({
    host: ipv6,
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: process.env.SUPABASE_DB_PASSWORD,
    ssl: { rejectUnauthorized: false, servername: "db.hkqhsgdutaaufqqrekdx.supabase.co" },
    connectionTimeoutMillis: 15000,
  });

  await client.connect();
  console.log("Connected to database.");

  const resetSql = fs.readFileSync(
    path.join(__dirname, "..", "database", "reset.sql"),
    "utf8"
  );
  const schemaSql = fs.readFileSync(
    path.join(__dirname, "..", "database", "schema.sql"),
    "utf8"
  );

  try {
    console.log("Running reset...");
    await client.query(resetSql);
    console.log("Reset complete.");
  } catch (err) {
    console.log("Reset warning (may be OK):", err.message);
  }

  try {
    console.log("Running schema...");
    await client.query(schemaSql);
    console.log("Schema deployed successfully!");
  } catch (err) {
    console.error("Schema error:", err.message);
    process.exit(1);
  }

  await client.end();
}

deploy().catch((err) => {
  console.error("Deploy failed:", err.message);
  process.exit(1);
});
