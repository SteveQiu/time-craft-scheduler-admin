import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const secretContent = fs.readFileSync(".secret", "utf-8");
const supabaseKey = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient(
  "https://dbabjfydcllqbjpolhym.supabase.co",
  supabaseKey
);

// Read the migration SQL
const migrationSql = fs.readFileSync(
  "./supabase/migrations/20260415_allow_modify_confirmed_appointments.sql",
  "utf-8"
);

async function applyMigration() {
  console.log("Applying migration to update modify_appointment RPC...\n");
  console.log("Migration SQL:");
  console.log(migrationSql);
  console.log("\n" + "=".repeat(60));
  console.log("Please execute the above SQL in Supabase SQL Editor:");
  console.log("1. Go to https://supabase.com/dashboard");
  console.log("2. Select your project");
  console.log("3. Go to SQL Editor");
  console.log("4. Click 'New Query'");
  console.log("5. Paste the SQL above");
  console.log("6. Click 'Run'");
  console.log("7. Run verify-reschedule-flow.mjs again to test");
  console.log("=".repeat(60));
}

applyMigration();
