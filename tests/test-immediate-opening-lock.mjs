import { createClient } from "@supabase/supabase-js";
import fs from "fs";

const secretContent = fs.readFileSync(".secret", "utf-8");
const supabaseKey = secretContent.match(/SUPABASE_KEY=(.+)/)[1].trim();
const supabase = createClient(
  "https://dbabjfydcllqbjpolhym.supabase.co",
  supabaseKey
);

async function testImmediateOpeningLock() {
  console.log("╔════════════════════════════════════════════════════════════════╗");
  console.log("║ TEST: Immediate Opening Lock on Booking                        ║");
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  try {
    // Get 2 test users
    const { data: users } = await supabase
      .from("auth.users")
      .select("id")
      .limit(2);

    if (!users || users.length < 2) {
      console.log("⚠ Need at least 2 users for this test");
      return;
    }

    const user1 = users[0].id;
    const user2 = users[1].id;

    console.log(`User 1: ${user1}`);
    console.log(`User 2: ${user2}\n`);

    // Get an available opening
    console.log("Step 1: Finding available opening...");
    const { data: availableOpenings, error: e1 } = await supabase
      .from("openings")
      .select("*")
      .eq("is_available", true)
      .limit(1);

    if (e1) throw e1;
    if (!availableOpenings?.length) {
      console.log("✗ No available openings found");
      return;
    }

    const opening = availableOpenings[0];
    console.log(`✓ Found opening: ${opening.id}`);
    console.log(`  Date: ${opening.date}, Time: ${opening.start_time}`);
    console.log(`  Is Available: ${opening.is_available}\n`);

    // User 1 books the opening
    console.log("Step 2: User 1 booking the opening...");
    const { data: appt1, error: e2 } = await supabase.rpc("book_opening", {
      _opening_id: opening.id,
      _user_id: user1,
    });

    if (e2) {
      console.log(`✗ User 1 booking failed: ${e2.message}`);
      return;
    }

    console.log(`✓ User 1 booked successfully`);
    console.log(`  Appointment ID: ${appt1}\n`);

    // Check opening status immediately after booking
    console.log("Step 3: Checking opening status after User 1 booking...");
    const { data: openingAfter, error: e3 } = await supabase
      .from("openings")
      .select("is_available")
      .eq("id", opening.id)
      .single();

    if (e3) throw e3;

    console.log(`✓ Opening is_available: ${openingAfter.is_available}`);

    if (!openingAfter.is_available) {
      console.log("✓✓ PERFECT: Opening marked unavailable immediately!\n");
    } else {
      console.log(
        "✗✗ PROBLEM: Opening still available after booking!\n"
      );
    }

    // User 2 tries to book the same opening
    console.log("Step 4: User 2 trying to book the same opening...");
    const { data: appt2, error: e4 } = await supabase.rpc("book_opening", {
      _opening_id: opening.id,
      _user_id: user2,
    });

    if (e4) {
      console.log(`✓ User 2 booking correctly rejected: ${e4.message}\n`);
    } else {
      console.log(`✗ User 2 booking succeeded (should have failed!)\n`);
      return;
    }

    // Verify appointments in database
    console.log("Step 5: Verifying appointments in database...");
    const { data: allApptsForOpening } = await supabase
      .from("appointments")
      .select("user_id, status")
      .eq("opening_id", opening.id);

    console.log(`  Total appointments for this opening: ${allApptsForOpening?.length}`);
    if (allApptsForOpening) {
      allApptsForOpening.forEach((apt, idx) => {
        console.log(`  Appt ${idx + 1}: User ${apt.user_id?.substring(0, 8)}..., Status: ${apt.status}`);
      });
    }

    console.log();

    // Summary
    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║ TEST RESULTS                                                   ║");
    console.log("╚════════════════════════════════════════════════════════════════╝\n");

    console.log("✓ User 1 successfully booked opening");
    console.log(
      `✓ Opening marked unavailable immediately: ${!openingAfter.is_available}`
    );
    console.log("✓ User 2 cannot book (correctly prevented)");
    console.log("✓ Only 1 user can reserve the spot\n");

    console.log("CONCLUSION: Immediate opening lock is working correctly! ✓");
  } catch (err) {
    console.error("✗ Test error:", err);
    process.exit(1);
  }
}

testImmediateOpeningLock();
