// GTA 6 Trophy Guide — entrypoint (Node 22, standard library only).
//
// The guide itself is plain static files in app/ (HTML, CSS, ES modules and
// the trophy data in app/data/trophies.json): a browser opens app/index.html
// and everything works with the network off. This program hands the guide in:
// it stages app/ and screenshots/ into the output directory and writes
// dossier.json there with the vendored make.fun library, plus a small
// deterministic BUILD.txt. Leave vendor/makefun-frontend.ts untouched: the
// scorer rebuilds the dossier with its own copy and compares byte for byte.
//
// The output directory is sacred. The grader mounts it as a Docker volume,
// so deleting the directory itself fails with "Device or resource busy".
// This program therefore never removes the output directory: it creates it,
// then clears only the entries inside it, one by one, before copying in the
// fresh files. Run locally with:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output.

import { createHash } from 'node:crypto';
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-frontend.ts';

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const appDir = join(repoRoot, 'app');
const shotsDir = join(repoRoot, 'screenshots');

// Create the output directory if it is missing, then empty it without ever
// removing the directory itself: each child entry goes, the mount point stays.
function clearOutputContents(dir: string): void {
  mkdirSync(dir, { recursive: true });
  for (const entry of readdirSync(dir)) {
    rmSync(join(dir, entry), { recursive: true, force: true });
  }
}

function countFiles(dir: string): number {
  let total = 0;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    total += entry.isDirectory() ? countFiles(path) : 1;
  }
  return total;
}

function sha256Hex(text: string): string {
  return createHash('sha256').update(text, 'utf8').digest('hex');
}

// Stage the guide, build its dossier, and record a deterministic build note.
function handIn(): void {
  clearOutputContents(outDir);
  cpSync(appDir, join(outDir, 'app'), { recursive: true });
  mkdirSync(join(outDir, 'screenshots'), { recursive: true });
  if (existsSync(shotsDir)) {
    cpSync(shotsDir, join(outDir, 'screenshots'), { recursive: true });
  }

  // Sanity check the trophy data before the dossier is built: the guide is
  // only complete when it names all 55 trophies with a guide each.
  const data = JSON.parse(readFileSync(join(appDir, 'data', 'trophies.json'), 'utf8'));
  const list = data.trophies as Array<{ guide?: string }>;
  if (!Array.isArray(list) || list.length !== 55) {
    throw new Error(`trophies.json must hold 55 trophies, found ${Array.isArray(list) ? list.length : 'none'}`);
  }
  const unguided = list.filter((t) => typeof t.guide !== 'string' || t.guide.trim().length === 0);
  if (unguided.length > 0) {
    throw new Error(`${unguided.length} trophies have no guide`);
  }

  // The scorer's own caps: only text_max_bytes shapes the bytes; the rest
  // refuse an entry the scorer would refuse (more than 4 screenshots or one
  // over 256 KiB; more than 993 files and directories in app/ or 48 MiB of
  // app files: app/ counts beside /output's own 1000-entry cap, its
  // screenshots/ and dossier.json).
  const dossier = buildDossier(outDir, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    app_max_files: 993,
    app_max_bytes: 50331648,
  });
  writeFileSync(join(outDir, 'dossier.json'), dossier);

  // BUILD.txt is a deterministic note about this hand-in: no timestamps, no
  // paths that vary between machines, so two runs produce identical bytes.
  const appFiles = countFiles(join(outDir, 'app'));
  const shotFiles = readdirSync(join(outDir, 'screenshots')).length;
  const buildNote = [
    'gta6-trophy-guide-01',
    `trophies: ${list.length}`,
    `app files: ${appFiles}`,
    `screenshots: ${shotFiles}`,
    `dossier bytes: ${Buffer.byteLength(dossier, 'utf8')}`,
    `dossier sha256: ${sha256Hex(dossier)}`,
  ].join('\n') + '\n';
  writeFileSync(join(outDir, 'BUILD.txt'), buildNote);

  console.log(`handed in ${list.length} trophies, ${appFiles} app files, ${shotFiles} screenshots`);
  console.log(`dossier: ${Buffer.byteLength(dossier, 'utf8')} bytes -> ${join(outDir, 'dossier.json')}`);
}

handIn();
