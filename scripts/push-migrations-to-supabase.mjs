#!/usr/bin/env node

/**
 * SUPABASE MIGRATION PUSHER
 * 
 * This script links the local project to Supabase and pushes all migrations.
 * Uses: supabase link --project-ref <ref>
 *       supabase db push
 */

import { spawnSync } from 'child_process';
import * as fs from 'fs';

const envContent = fs.readFileSync('.env', 'utf-8');
const env = {};
envContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('#')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      let value = rest.join('=').trim();
      value = value.replace(/^"(.*)"$/, '$1');
      env[key] = value;
    }
  }
});

const secretContent = fs.readFileSync('.secret', 'utf-8');
const secret = {};
secretContent.split('\n').forEach(line => {
  const trimmed = line.trim();
  if (trimmed && !trimmed.startsWith('=')) {
    const [key, ...rest] = trimmed.split('=');
    if (key && rest.length > 0) {
      secret[key] = rest.join('=');
    }
  }
});

const SUPABASE_URL = env.VITE_SUPABASE_URL;
const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)\.supabase\.co/)?.[1];
const SERVICE_KEY = secret.SUPABASE_KEY;

console.log('🚀 SUPABASE MIGRATION PUSHER\n');
console.log('='.repeat(70));
console.log(`\n📍 Project Details:`);
console.log(`   URL: ${SUPABASE_URL}`);
console.log(`   Project Ref: ${PROJECT_REF}`);
console.log(`   Migrations: supabase/migrations/\n`);

if (!PROJECT_REF) {
  console.log('❌ Could not extract project ref from URL');
  process.exit(1);
}

console.log('='.repeat(70));
console.log('\n📋 STEP 1: Linking local project to Supabase\n');

// Link the project
const linkResult = spawnSync('npx', [
  'supabase',
  'link',
  '--project-ref',
  PROJECT_REF,
  '--yes'
], {
  stdio: ['pipe', 'pipe', 'pipe'],
  encoding: 'utf-8'
});

if (linkResult.status === 0) {
  console.log('✅ Project linked successfully');
  if (linkResult.stdout) {
    console.log(linkResult.stdout);
  }
} else {
  console.log('⚠️  Link result:', linkResult.status);
  if (linkResult.stderr) {
    console.log('Error output:', linkResult.stderr);
  }
  // Continue anyway - might already be linked
}

console.log('\n='.repeat(70));
console.log('\n📋 STEP 2: Pushing migrations to remote\n');

// Push migrations
const pushResult = spawnSync('npx', [
  'supabase',
  'db',
  'push'
], {
  stdio: 'inherit',
  encoding: 'utf-8'
});

console.log('\n='.repeat(70));

if (pushResult.status === 0) {
  console.log('\n✅ MIGRATION PUSHED SUCCESSFULLY!\n');
  console.log('Next steps:');
  console.log('1. Verify: node tests/verify-opening-lock.mjs');
  console.log('2. Test in UI: Book an appointment');
  console.log('3. Confirm: Opening disappears from browse list\n');
} else {
  console.log('\n⚠️  Migration push completed with status:', pushResult.status);
  console.log('\nPossible issues:');
  console.log('1. Project ref is incorrect');
  console.log('2. Migrations folder structure is wrong');
  console.log('3. Supabase credentials are not set up\n');
  console.log('Try running manually:');
  console.log(`  npx supabase link --project-ref ${PROJECT_REF}`);
  console.log(`  npx supabase db push\n`);
}

console.log('='.repeat(70));
