import fs from 'node:fs';
import path from 'node:path';

const secretPath = path.resolve(process.cwd(), '.secret');
const fileSecrets = {};

if (fs.existsSync(secretPath)) {
  for (const line of fs.readFileSync(secretPath, 'utf8').split(/\r?\n/)) {
    const separator = line.indexOf('=');
    if (separator <= 0) continue;
    fileSecrets[line.slice(0, separator).trim()] = line.slice(separator + 1).trim();
  }
}

export function requireTestSecret(name) {
  const value = process.env[name] || fileSecrets[name];
  if (!value) {
    throw new Error(`Missing required test secret: ${name}`);
  }
  return value;
}
