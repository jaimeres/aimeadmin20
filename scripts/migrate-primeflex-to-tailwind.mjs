#!/usr/bin/env node
/**
 * Dry-run migrator: PrimeFlex grid classes -> Tailwind width utilities.
 * Does NOT modify files (prints proposed diff summary).
 */
import { readFileSync } from 'node:fs';
import globModule from 'glob';
const { glob } = globModule;

const root = process.cwd();
const patterns = ['src/**/*.html', 'src/**/*.scss'];

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

const breakpoints = ['sm', 'md', 'lg', 'xl'];

function buildRegex() {
  // captures optional breakpoint prefix and col-x
  return /(sm:|md:|lg:|xl:)?col-(1|2|3|4|6|8|9|12)\b/g;
}

let totalFiles = 0;
let totalMatches = 0;
const perFile = [];

const files = (await Promise.all(patterns.map(p => new Promise((res, rej) => glob(p, (e, m) => e ? rej(e) : res(m)))))).flat();
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  const re = buildRegex();
  let m; let fileMatches = [];
  while ((m = re.exec(text)) !== null) {
    const bp = m[1]?.slice(0, -1); // remove :
    const col = m[0].replace(m[1] || '', ''); // full match minus bp
    const tw = mapping[col];
    if (!tw) continue;
    const replacement = bp ? `${bp}:${tw}` : tw;
    fileMatches.push({ index: m.index, match: m[0], replacement });
  }
  if (fileMatches.length) {
    totalFiles++;
    totalMatches += fileMatches.length;
    perFile.push({ file, fileMatches });
  }
}

if (!totalMatches) {
  console.log('No se encontraron clases PrimeFlex col-* para migrar.');
  process.exit(0);
}

console.log(`Archivos con coincidencias: ${totalFiles}`);
console.log(`Total coincidencias: ${totalMatches}`);
for (const f of perFile) {
  console.log('\n' + f.file);
  for (const m of f.fileMatches.slice(0, 50)) {
    console.log(`  ${m.match}  ->  ${m.replacement}`);
  }
  if (f.fileMatches.length > 50) console.log('  ...');
}

console.log('\nDry-run completado. Para aplicar, crea una versión que escriba los cambios.');
