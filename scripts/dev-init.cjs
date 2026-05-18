#!/usr/bin/env node
'use strict';

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');

const R = '[0m';
const Y = '[33m';
const C = '[36m';
const G = '[32m';
const B = '[1m';

const W = 46;
const border = Y;

function visLen(s) {
  let len = 0;
  for (const ch of [...s]) {
    const cp = ch.codePointAt(0);
    if ((cp >= 0x2600 && cp <= 0x27BF) ||
        (cp >= 0x1F000 && cp <= 0x1FFFF) ||
        (cp >= 0x2300 && cp <= 0x23FF)) {
      len += 2;
    } else {
      len += 1;
    }
  }
  return len;
}

function div() {
  process.stdout.write(border + '\u2560' + '\u2550'.repeat(W + 2) + '\u2563' + R + '\n');
}

function row(plain, colorWrap) {
  const padding = ' '.repeat(Math.max(0, W - visLen(plain)));
  // Reset AFTER padding so Windows terminal won't eat trailing spaces
  const inner = colorWrap ? colorWrap + plain + padding + R : plain + padding;
  process.stdout.write(border + '\u2551' + R + ' ' + inner + ' ' + border + '\u2551' + R + '\n');
}

process.stdout.write('\n' + border + '\u2554' + '\u2550'.repeat(W + 2) + '\u2557' + R + '\n');
row('\uD83E\uDDB4  PikAppoint Dev Session', B + C);
div();
row('CAVEMAN MODE: FULL (all agents)', B + Y);
row('SKILL:  .squad/skills/caveman-mode/SKILL.md', C);
row('SOP:    .github/copilot-instructions.md', C);
div();
row('\u2705  VALIDATOR GATE ACTIVE', G);
row('    Ripley builds \u2192 Ralph verifies', null);
row('    No self-certification', null);
div();
row('\u2705  DECISION SOP', G);
row('    Validate before showing results', null);
row('    Never ask user to test', null);
process.stdout.write(border + '\u255A' + '\u2550'.repeat(W + 2) + '\u255D' + R + '\n\n');

const checks = [
  '.github/copilot-instructions.md',
  '.squad/skills/caveman-mode/SKILL.md',
];

let warned = false;
for (const rel of checks) {
  if (!fs.existsSync(path.join(ROOT, rel))) {
    process.stderr.write('\u26A0\uFE0F  WARNING: missing ' + rel + '\n');
    warned = true;
  }
}

if (!warned) {
  process.stdout.write(G + '\u2713' + R + ' SOP files present\n\n');
}

process.exit(0);