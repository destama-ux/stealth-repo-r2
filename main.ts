// LAMPBLACK: The Gilded Vault — hand-in program (Node 22, standard library only).
//
// The game itself is the static, offline browser game in game/ (open
// game/index.html in a desktop browser to play it). This program hands the
// entry in: it copies game/ and screenshots/ from beside this file into the
// output directory and writes dossier.json there, using buildDossier from
// the vendored make.fun library in vendor/makefun-game.ts.
//
// Outside the grader, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// The gate's caps: at most 4 screenshots of 256 KiB each, at most 993 files
// and 48 MiB under game/, no game/ path over 1000 bytes, dossier text capped
// at 160 KiB. buildDossier throws when a cap is exceeded, so a bad entry
// fails here instead of at the gate. Declared before use (const is not
// hoisted), and frozen so the two grader runs see identical values.
const DOSSIER_CAPS = Object.freeze({
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
});

const repoRoot = fileURLToPath(new URL('.', import.meta.url));
const outputDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

const gameDir = join(repoRoot, 'game');
if (!existsSync(join(gameDir, 'index.html'))) {
  throw new Error('game/index.html is missing: the playable game must live in game/');
}

mkdirSync(outputDir, { recursive: true });
cpSync(gameDir, join(outputDir, 'game'), { recursive: true });

const screenshotsDir = join(repoRoot, 'screenshots');
mkdirSync(join(outputDir, 'screenshots'), { recursive: true });
if (existsSync(screenshotsDir)) {
  cpSync(screenshotsDir, join(outputDir, 'screenshots'), { recursive: true });
}

writeFileSync(join(outputDir, 'dossier.json'), buildDossier(outputDir, DOSSIER_CAPS));
