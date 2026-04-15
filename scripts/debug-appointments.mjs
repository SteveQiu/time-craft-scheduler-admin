import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const secretContent = fs.readFileSync(".secret", "utf-8");
const supabaseKey = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient(
  "https://dbabjfydcllqbjpolhym.supabase.co",
  supabaseKey
);

const { data } = await supabase
  .from("appointments")
  .select("*")
  .eq("status", "confirmed")
  .limit(1);

if (data && data.length > 0) {
  console.log("Confirmed appointment fields:");
  console.log(JSON.stringify(data[0], null, 2));
}

const { data: openings } = await supabase
  .from("openings")
  .select("*")
  .limit(1);

if (openings && openings.length > 0) {
  console.log("\nOpening fields:");
  console.log(JSON.stringify(openings[0], null, 2));
}
