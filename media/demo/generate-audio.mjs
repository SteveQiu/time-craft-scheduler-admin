#!/usr/bin/env node

/**
 * Generate TTS audio for PikAppoint Demo video
 *
 * Uses Google Translate TTS (free, no API key required)
 * For production, replace with Google Cloud TTS or ElevenLabs
 *
 * Usage:
 *   node media/demo/generate-audio.mjs
 *
 * Output:
 *   media/public/audio/demo/step-01-opening.mp3
 *   media/public/audio/demo/step-02-booking.mp3
 *   media/public/audio/demo/step-03-confirm.mp3
 *   media/public/audio/demo/step-04-complete.mp3
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const AUDIO_DIR = path.join(__dirname, "..", "public", "audio", "demo");

// Ensure audio directory exists
if (!fs.existsSync(AUDIO_DIR)) {
  fs.mkdirSync(AUDIO_DIR, { recursive: true });
  console.log(`✅ Created directory: ${AUDIO_DIR}`);
}

/**
 * TTS scripts for each scene (from NARRATION.md)
 */
const scripts = [
  {
    id: "step-01-opening",
    text: "Welcome to PikAppoint. Let's see how providers create openings. From the admin dashboard, navigate to the Calendar tab. Click 'Add Opening' to schedule a new time slot. Fill in the date, start time, end time, service type, and worker name. Click Save. Your opening now appears on the calendar grid, ready for customers to book.",
  },
  {
    id: "step-02-booking",
    text: "Customers can browse available openings on the booking page. They can filter by service, date, or location. When they find a slot, they click Book, enter their contact information, and confirm. The reservation is now pending provider approval, and the customer receives a confirmation.",
  },
  {
    id: "step-03-confirm",
    text: "Back on the provider side, navigate to the Appointments tab. Pending reservations show with a yellow badge. Click on the appointment to review customer details. Verify the information, then click Approve. The status changes to Confirmed, and the customer is notified automatically.",
  },
  {
    id: "step-04-complete",
    text: "After the service is delivered, mark the appointment as Complete. Find the confirmed reservation in your Appointments tab, and click 'Mark Complete.' The status updates to Completed with a blue badge. You can optionally upload payment proof for record-keeping. That's the full booking flow in PikAppoint.",
  },
];

/**
 * Generate TTS audio using Google Translate API (unofficial, free)
 * For production, replace with:
 * - Google Cloud TTS: https://cloud.google.com/text-to-speech
 * - ElevenLabs: https://elevenlabs.io
 * - Azure TTS: https://azure.microsoft.com/en-us/services/cognitive-services/text-to-speech/
 */
async function generateAudio(script) {
  const outputPath = path.join(AUDIO_DIR, `${script.id}.mp3`);

  // Check if file already exists
  if (fs.existsSync(outputPath)) {
    console.log(`⏭️  Skipped ${script.id} (already exists)`);
    return;
  }

  console.log(`🎙️  Generating ${script.id}...`);

  try {
    // Google Translate TTS URL (unofficial API, may break)
    const text = encodeURIComponent(script.text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=en&q=${text}`;

    // Fetch audio
    const response = await fetch(url, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Write to file
    const buffer = Buffer.from(await response.arrayBuffer());
    fs.writeFileSync(outputPath, buffer);

    console.log(`✅ Generated ${script.id} (${buffer.length} bytes)`);
  } catch (error) {
    console.error(`❌ Failed to generate ${script.id}:`, error.message);
    console.log(
      `⚠️  Google Translate TTS may be rate-limited or blocked. Consider using:`
    );
    console.log(`   - Google Cloud TTS: https://cloud.google.com/text-to-speech`);
    console.log(`   - ElevenLabs: https://elevenlabs.io`);
  }
}

/**
 * Main
 */
async function main() {
  console.log("🎬 Generating TTS audio for PikAppoint Demo\n");

  for (const script of scripts) {
    await generateAudio(script);
    // Add delay to avoid rate limiting
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  console.log("\n✅ TTS audio generation complete!");
  console.log(`📁 Output: ${AUDIO_DIR}`);
  console.log(
    "\n📌 Next steps:\n   1. Preview: npm run remotion:studio\n   2. Render: npm run remotion:render"
  );
}

main().catch(console.error);
