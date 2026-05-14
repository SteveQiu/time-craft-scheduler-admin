#!/usr/bin/env node
/**
 * Generate TTS audio for 3 new slide scenes (SlideA, SlideB, SlideC)
 * Uses Google Translate TTS (same pattern as generate-premium-audio.js)
 */
import https from 'https';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outputDir = path.join(__dirname, '..', 'public', 'audio', 'premium-product-demo');

const slides = [
  {
    id: 'slide-a-features',
    text: "Everything you need to run your service business — smart scheduling, premium visibility, and real-time analytics.",
  },
  {
    id: 'slide-b-stats',
    text: "Over five hundred providers, ten thousand bookings, and a four point nine star rating. Join the fastest-growing scheduling community.",
  },
  {
    id: 'slide-c-pricing',
    text: "Start free, or go Premium for just nine ninety-nine a month. Unlimited bookings, crown badge, priority visibility, and analytics.",
  },
];

function downloadTTS(text) {
  return new Promise((resolve, reject) => {
    const encoded = encodeURIComponent(text);
    const url = `https://translate.google.com/translate_tts?ie=UTF-8&q=${encoded}&tl=en&client=tw-ob`;
    https.get(url, {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36' }
    }, (res) => {
      const chunks = [];
      res.on('data', (c) => chunks.push(c));
      res.on('end', () => resolve(Buffer.concat(chunks)));
    }).on('error', reject);
  });
}

fs.mkdirSync(outputDir, { recursive: true });

for (const slide of slides) {
  const out = path.join(outputDir, `${slide.id}.mp3`);
  console.log(`Generating ${slide.id}.mp3...`);
  try {
    const buf = await downloadTTS(slide.text);
    fs.writeFileSync(out, buf);
    console.log(`  ✅ ${slide.id}.mp3 (${(buf.length / 1024).toFixed(1)} KB)`);
  } catch (e) {
    console.error(`  ❌ ${slide.id}: ${e.message}`);
  }
  await new Promise(r => setTimeout(r, 1500));
}
console.log('Done.');
