#!/usr/bin/env node

/**
 * Premium Product Demo TTS Generator
 * Creates audio for premium subscription promotional video
 * 
 * Usage:
 *   node generate-premium-audio.js
 */

import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Premium product demo script
const scenes = [
  {
    id: 'scene-01-hook',
    text: 'Service providers work hard. But customers don\'t see them.',
    timing: '0-5s'
  },
  {
    id: 'scene-02-solution',
    text: 'Premium changes that. Enhanced visibility, professional profiles, and a premium badge.',
    timing: '5-25s'
  },
  {
    id: 'scene-03-benefits',
    text: 'Get more bookings. Build your brand. Stand out with Premium.',
    timing: '25-50s'
  },
  {
    id: 'scene-04-cta',
    text: 'Upgrade today at time-craft-scheduler dot com slash premium',
    timing: '50-60s'
  },
];

const outputDir = path.join(__dirname, '..', 'audio', 'premium-product-demo');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
  console.log(`✅ Created directory: ${outputDir}`);
}

/**
 * Generate audio using Google Translate TTS (unofficial, no API key needed)
 * Returns MP3 buffer
 */
async function generateAudioFromGoogle(text, lang = 'en') {
  return new Promise((resolve, reject) => {
    // Encode text for URL
    const encoded = encodeURIComponent(text);
    
    // Google Translate TTS endpoint (unofficial but stable)
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=${lang}&client=tw-ob`;
    
    https.get(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      }
    }, (res) => {
      const chunks = [];
      res.on('data', (chunk) => chunks.push(chunk));
      res.on('end', () => {
        resolve(Buffer.concat(chunks));
      });
    }).on('error', reject);
  });
}

/**
 * Generate all audio files
 */
async function generateAll() {
  console.log('\n🎙️  Generating Premium Product Demo TTS audio...\n');

  let successCount = 0;
  let failureCount = 0;

  for (const scene of scenes) {
    const outputPath = path.join(outputDir, `${scene.id}.mp3`);
    
    try {
      console.log(`  Generating ${scene.id}.mp3 [${scene.timing}]...`);
      const audioBuffer = await generateAudioFromGoogle(scene.text);
      fs.writeFileSync(outputPath, audioBuffer);
      console.log(`  ✅ ${scene.id}.mp3 (${(audioBuffer.length / 1024).toFixed(1)} KB)`);
      successCount++;
      
      // Rate limit: wait 1 second between requests
      await new Promise(r => setTimeout(r, 1000));
    } catch (error) {
      console.error(`  ❌ ${scene.id}.mp3 failed: ${error.message}`);
      failureCount++;
    }
  }

  console.log(`\n✅ Audio generation complete!`);
  console.log(`   Generated: ${successCount} files`);
  if (failureCount > 0) {
    console.log(`   Failed: ${failureCount} files`);
  }
  console.log(`   Output dir: ${outputDir}\n`);

  return failureCount === 0;
}

// Run
generateAll().then((success) => {
  process.exit(success ? 0 : 1);
}).catch((err) => {
  console.error(`\n❌ Error: ${err.message}\n`);
  process.exit(1);
});
