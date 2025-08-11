#!/usr/bin/env node
/**
 * APPLY migrator: Replaces PrimeFlex grid classes with Tailwind width utilities.
 * Creates .bak backup files.
 * Excludes global styles.scss to preserve legacy helper until cleanup.
 */
import { readFileSync, writeFileSync, copyFileSync } from 'node:fs';
import { glob } from 'glob';

const patterns = ['src/**/*.html']; // only HTML replacements
const exclude = ['src/assets/styles.scss'];

const mapping = {
  'col-12': 'w-full',
  'col-9': 'w-3/4',
  'col-8': 'w-2/3',
  'col-6': 'w-1/2',
  'col-4': 'w-1/3',
  'col-3': 'w-1/4',
  'col-2': 'w-1/6',
  'col-1': 'w-1/12'
};

// Matches tokens col-* optionally prefixed (sm: etc) inside class="..." or inside ngClass arrays/objects.
const tokenRegex = /(sm:|md:|lg:|xl:)?col-(1|2|3|4|6|8|9|12)\b/g;

function convertToken(token) {
  const bpMatch = token.match(/^(sm:|md:|lg:|xl:)/);
  const bp = bpMatch ? bpMatch[0].slice(0, -1) : null;
  const col = token.replace(bpMatch ? bpMatch[0] : '', '');
  const tw = mapping[col];
  if (!tw) return token;
  return bp ? `${bp}:${tw}` : tw;
}

function replace(content) {
  // Quick path: replace any standalone tokens
  let updated = content.replace(tokenRegex, t => convertToken(t));
  return updated;
}

async function run() {
  const files = (await Promise.all(patterns.map(p => new Promise((res, rej) => glob(p, (e, m) => e ? rej(e) : res(m)))))).flat();
  let changed = 0;
  for (const f of files) {
    if (exclude.some(ex => f.endsWith(ex))) continue;
    let original = readFileSync(f, 'utf8');
    const updated = replace(original);
    if (updated !== original) {
      copyFileSync(f, f + '.bak');
      writeFileSync(f, updated, 'utf8');
      changed++;
      console.log('Actualizado:', f);
    }
  }
  console.log(`Reemplazos aplicados en ${changed} archivo(s). Respaldos .bak creados.`);
}

run().catch(e => { console.error(e); process.exit(1); });
