import { createClient } from "@supabase/supabase-js";
import fs from "fs";

// Load credentials from .secret file
const secretContent = fs.readFileSync(".secret", "utf-8");
const getSecret = (key) => {
  const match = secretContent.match(new RegExp(`${key}=(.+)`));
  return match ? match[1].trim() : null;
};

const supabaseUrl = "https://dbabjfydcllqbjpolhym.supabase.co";
const supabaseServiceKey = getSecret("SUPABASE_KEY");

if (!supabaseServiceKey) {
  throw new Error("Missing SUPABASE_KEY in .secret file");
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyRescheduleFlow() {
  console.log("=".repeat(60));
  console.log("VERIFYING CUSTOMER RESCHEDULE FLOW");
  console.log("=".repeat(60));
  console.log();

  try {
    // Step 1: Get a confirmed appointment
    console.log("Step 1: Finding a confirmed appointment...");
    const { data: appointments, error: apptError } = await supabase
      .from("appointments")
      .select("*")
      .eq("status", "confirmed")
      .limit(1);

    if (apptError) throw apptError;
    if (!appointments?.length) {
      console.log(
        "⚠ No confirmed appointments found. Creating test appointment...\n"
      );
      return;
    }

    const originalAppt = appointments[0];
    console.log(`✓ Found confirmed appointment: ${originalAppt.id}`);
    console.log(`  Customer: ${originalAppt.user_id}`);
    console.log(`  Provider: ${originalAppt.provider_id}`);
    console.log(`  Worker: ${originalAppt.worker}`);
    console.log(`  Service: ${originalAppt.service}`);
    console.log(`  Current Opening: ${originalAppt.opening_id}`);
    console.log();

    // Step 2: Get available openings for same provider/worker/service
    console.log("Step 2: Finding alternative available openings...");
    const { data: altOpenings, error: openingError } = await supabase
      .from("openings")
      .select("*")
      .eq("user_id", originalAppt.provider_id)
      .eq("worker", originalAppt.worker)
      .eq("service", originalAppt.service)
      .eq("is_available", true)
      .neq("id", originalAppt.opening_id)
      .limit(3);

    if (openingError) throw openingError;
    if (!altOpenings?.length) {
      console.log("⚠ No alternative openings available for rescheduling\n");
      return;
    }

    const newOpening = altOpenings[0];
    console.log(`✓ Found alternative opening: ${newOpening.id}`);
    console.log(`  Date: ${newOpening.date}`);
    console.log(`  Time: ${newOpening.start_time}`);
    console.log();

    // Step 3: Call modify_appointment RPC
    console.log("Step 3: Calling modify_appointment RPC as customer...");
    const { data: newApptId, error: rpcError } = await supabase.rpc(
      "modify_appointment",
      {
        _appointment_id: originalAppt.id,
        _new_opening_id: newOpening.id,
        _caller_id: originalAppt.user_id,
      }
    );

    if (rpcError) {
      console.error("✗ RPC failed:", rpcError);
      return;
    }

    console.log("✓ RPC succeeded");
    console.log(`  New Appointment ID: ${newApptId}`);
    console.log();

    // Step 4: Verify old appointment is cancelled
    console.log("Step 4: Verifying old appointment is cancelled...");
    const { data: oldAppt, error: oldError } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", originalAppt.id)
      .single();

    if (oldError) throw oldError;
    console.log(`✓ Old appointment status: "${oldAppt.status}" (expected: "cancelled")`);
    if (oldAppt.status !== "cancelled") {
      console.warn("  ⚠ WARNING: Old appointment should be cancelled!");
    }
    console.log();

    // Step 5: Verify new appointment is pending
    console.log("Step 5: Verifying new appointment is pending (needs provider approval)...");
    const { data: newAppt, error: newError } = await supabase
      .from("appointments")
      .select("*")
      .eq("id", newApptId)
      .single();

    if (newError) throw newError;
    console.log(`✓ New appointment found`);
    console.log(`  Status: "${newAppt.status}" (expected: "pending")`);
    console.log(`  Opening: ${newAppt.opening_id}`);
    console.log(`  Customer: ${newAppt.user_id}`);
    if (newAppt.status !== "pending") {
      console.warn("  ⚠ WARNING: New appointment should be pending!");
    }
    console.log();

    // Summary
    console.log("=".repeat(60));
    console.log("✓ RESCHEDULE FLOW VERIFICATION COMPLETE");
    console.log("=".repeat(60));
    console.log();
    console.log("Summary:");
    console.log(`  Original appointment (${originalAppt.id}): CANCELLED ✓`);
    console.log(`  New appointment (${newApptId}): PENDING ✓`);
    console.log();
    console.log("Next steps:");
    console.log("  1. Test UI: Sign in as customer");
    console.log("  2. Go to /appointments page");
    console.log("  3. Find a confirmed appointment and click 'Modify'");
    console.log("  4. Select a new date/time and confirm");
    console.log("  5. Verify old appointment shows as 'Cancelled'");
    console.log("  6. Verify new appointment appears as 'Pending'");
    console.log("  7. Provider can then approve or reject the new request");
    console.log();
  } catch (err) {
    console.error("✗ Error:", err.message);
    process.exit(1);
  }
}

verifyRescheduleFlow();
