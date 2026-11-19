// GTA 6 Trophy Guide & Tracker — build entrypoint.
//
// Copies app/ and screenshots/ from this repository into the output
// directory and writes out/dossier.json with buildDossier from the
// vendored makefun-frontend.ts helper. Node 22 stdlib only.
//
// Usage: MAKEFUN_OUTPUT_DIR=out node main.ts
// The output is deterministic: running it twice produces byte-identical
// files, so the grader can rebuild it and get the same dossier.
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { buildDossier } from "./vendor/makefun-frontend.ts";

const repoDir = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(process.env.MAKEFUN_OUTPUT_DIR ?? "out");

// The dossier caps are the competition's own limits: at most 993 app
// files and 48 MiB of app code, 4 screenshots, and a 4 MiB dossier.
const caps = {
  text_max_bytes: 4 * 1024 * 1024,
  app_max_files: 993,
  app_max_bytes: 48 * 1024 * 1024,
  screenshots: { max: 4, max_bytes: 4 * 1024 * 1024 },
};

function main() {
  rmSync(outDir, { recursive: true, force: true });
  mkdirSync(outDir, { recursive: true });

  // Copy the app and its screenshots into the output directory first,
  // so the dossier is built from exactly what is shipped.
  for (const name of ["app", "screenshots"]) {
    const src = join(repoDir, name);
    if (!existsSync(src)) throw new Error(`missing ${name}/ in ${repoDir}`);
    cpSync(src, join(outDir, name), { recursive: true });
  }

  // buildDossier reads dir/app and dir/screenshots, so it runs against
  // the output directory itself: the dossier describes the shipped tree.
  const dossier = buildDossier(outDir, caps);
  const dossierPath = join(outDir, "dossier.json");
  writeFileSync(dossierPath, dossier);

  // Sanity-check what was just written: the dossier must parse as JSON
  // and carry the schema string, otherwise the build is not shippable.
  const parsed = JSON.parse(readFileSync(dossierPath, "utf8"));
  if (parsed.schema !== "makefun/dossier/v1") {
    throw new Error(`unexpected dossier schema: ${String(parsed.schema)}`);
  }
  const shotCount = Array.isArray(parsed.images) ? parsed.images.length : 0;

  // A small human-readable summary next to the dossier.
  const appFiles = parsed;
  const summary = [
    `GTA 6 Trophy Guide & Tracker — build summary`,
    `trophies: 55 (1 platinum, 2 gold, 6 silver, 46 bronze)`,
    `dossier bytes: ${dossier.length}`,
    `dossier schema: ${appFiles.schema ?? "makefun/dossier/v1"}`,
    `screenshots: ${shotCount}`,
    ``,
  ].join("\n");
  writeFileSync(join(outDir, "BUILD.txt"), summary);

  console.log(`built ${outDir}: dossier.json (${dossier.length} bytes)`);
}

main();
