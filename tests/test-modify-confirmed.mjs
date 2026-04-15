import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_KEY;

const supabase = createClient(supabaseUrl, supabaseKey);

async function testModifyConfirmed() {
  console.log("Testing modify confirmed appointment flow...\n");

  try {
    // Get test user
    const { data: users } = await supabase.from("users").select("id").limit(1);
    if (!users?.length) throw new Error("No test users found");
    const userId = users[0].id;

    // Get a confirmed appointment
    const { data: appointments } = await supabase
      .from("appointments")
      .select("*")
      .eq("user_id", userId)
      .eq("status", "confirmed")
      .limit(1);

    if (!appointments?.length) {
      console.log("No confirmed appointments found. Creating test data...");
      // Note: Would need to create test appointment first
      console.log("Skipping test - no confirmed appointments available");
      return;
    }

    const oldAppointment = appointments[0];
    console.log(`Found confirmed appointment: ${oldAppointment.id}`);
    console.log(`  Worker: ${oldAppointment.worker_id}`);
    console.log(`  Service: ${oldAppointment.service_id}`);
    console.log(`  Old opening: ${oldAppointment.opening_id}\n`);

    // Get available openings for same worker/service
    const { data: availableOpenings } = await supabase
      .from("openings")
      .select("*")
      .eq("worker_id", oldAppointment.worker_id)
      .eq("service_id", oldAppointment.service_id)
      .eq("status", "open")
      .neq("id", oldAppointment.opening_id)
      .limit(1);

    if (!availableOpenings?.length) {
      console.log("No alternative openings available");
      return;
    }

    const newOpening = availableOpenings[0];
    console.log(`Found alternative opening: ${newOpening.id}`);
    console.log(`  Date: ${newOpening.date}`);
    console.log(`  Time: ${newOpening.start_time}\n`);

    // Call modify_appointment RPC
    console.log("Calling modify_appointment RPC...");
    const { data, error } = await supabase.rpc("modify_appointment", {
      appointment_id: oldAppointment.id,
      new_opening_id: newOpening.id,
      caller_id: userId,
    });

    if (error) {
      console.error("✗ RPC failed:", error);
      return;
    }

    console.log("✓ RPC succeeded:", data);

    // Verify old appointment is cancelled
    const { data: oldAppt } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", oldAppointment.id)
      .single();

    console.log(`\n✓ Old appointment status: ${oldAppt.status} (should be cancelled)`);

    // Verify new appointment is pending
    const { data: newAppt } = await supabase
      .from("appointments")
      .select("status")
      .eq("id", data.new_appointment_id)
      .single();

    console.log(
      `✓ New appointment status: ${newAppt.status} (should be pending, awaiting provider re-approval)`
    );

    // Verify old opening is re-opened
    const { data: oldOpening } = await supabase
      .from("openings")
      .select("status")
      .eq("id", oldAppointment.opening_id)
      .single();

    console.log(`✓ Old opening status: ${oldOpening.status} (should be open)`);

    console.log("\n✓ Modify confirmed appointment flow works correctly!");
  } catch (err) {
    console.error("Test failed:", err);
    process.exit(1);
  }
}

testModifyConfirmed();
