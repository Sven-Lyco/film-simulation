#!/usr/bin/env node
/**
 * Converts Fujifilm .3dl LUT files (from Stuart Sowerby's pack) to .cube format
 * and downloads RawTherapee HaldCLUT PNGs for Kodak/Ilford presets.
 *
 * Usage:
 *   node scripts/fetch-luts.js [path/to/Fujifilm-XTrans-III-3DL.zip]
 *
 * If no zip path is given, only the RawTherapee download is attempted.
 * Any preset without a real LUT falls back to synthetic at runtime.
 */

import { writeFileSync, readFileSync, readdirSync, mkdirSync, existsSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import AdmZip from 'adm-zip'

const __dirname = dirname(fileURLToPath(import.meta.url))
const OUT_DIR = join(__dirname, '../public/luts')
mkdirSync(OUT_DIR, { recursive: true })

const results = { converted: [], skipped: [], failed: [] }

// ─── Fujifilm 3DL → .cube conversion ─────────────────────────────────────────

// Map our preset IDs to filenames inside the Sowerby zip
const FUJI_MAP = {
  'velvia-50':      'Fuji XTrans III - Velvia.3dl',
  'classic-chrome': 'Fuji XTrans III - Classic Chrome.3dl',
  'provia-100f':    'Fuji XTrans III - Provia.3dl',
  'astia':          'Fuji XTrans III - Astia.3dl',
  'pro-neg-std':    'Fuji XTrans III - Pro Neg Std.3dl',
  'pro-neg-hi':     'Fuji XTrans III - Pro Neg Hi.3dl',
  'sepia':          'Fuji XTrans III - Sepia.3dl',
  'acros':          'Fuji XTrans III - Acros.3dl',
  'acros-r':        'Fuji XTrans III - Acros+R.3dl',
  'acros-g':        'Fuji XTrans III - Acros+G.3dl',
  'acros-ye':       'Fuji XTrans III - Acros+Ye.3dl',
  'mono':           'Fuji XTrans III - Mono.3dl',
  'mono-r':         'Fuji XTrans III - Mono+R.3dl',
  'mono-g':         'Fuji XTrans III - Mono+G.3dl',
  'mono-ye':        'Fuji XTrans III - Mono+Ye.3dl',
}

/**
 * Parses a .3dl file and converts it to .cube text.
 *
 * .3dl format (Assimilate / Affinity / After Effects):
 *   Line 1: optional comment (#...)
 *   Line 2: input shaper — N space-separated integer values (0..maxIn)
 *            N is the LUT size; typical ranges: 0–1023 (10-bit) or 0–4095 (12-bit)
 *   Lines 3…N³+2: RGB output triplets (0..maxOut, typically 0–4095 for 12-bit)
 *   Axis order: B changes fastest, G middle, R slowest
 *               (opposite of .cube where R is fastest)
 *
 * .cube format:
 *   R changes fastest, B slowest
 *   Values normalized to 0.0–1.0
 */
function convert3dlToCube(text) {
  const lines = text.split(/\r?\n/).map(l => l.trim())

  // Skip leading comment lines
  let pos = 0
  while (pos < lines.length && lines[pos].startsWith('#')) pos++

  // Input shaper — determines LUT size N
  const shaper = lines[pos++].split(/\s+/).map(Number)
  const n = shaper.length              // LUT size (e.g. 17 → 17³ = 4913 entries)
  const maxIn = shaper[n - 1]          // max input value (e.g. 1023)

  // Collect data triplets
  const entries = []
  while (pos < lines.length) {
    const parts = lines[pos++].split(/\s+/)
    if (parts.length >= 3) {
      entries.push([Number(parts[0]), Number(parts[1]), Number(parts[2])])
    }
  }

  if (entries.length !== n * n * n) {
    throw new Error(`Expected ${n ** 3} entries, got ${entries.length}`)
  }

  // Determine max output value from actual data
  let maxOut = 0
  for (const [r, g, b] of entries) maxOut = Math.max(maxOut, r, g, b)

  // Write .cube header
  const cubeLines = [`LUT_3D_SIZE ${n}`]

  // Reorder: .3dl is B-fastest (index = b + g*n + r*n²)
  //          .cube is R-fastest (iterate: outer B, middle G, inner R)
  for (let b = 0; b < n; b++) {
    for (let g = 0; g < n; g++) {
      for (let r = 0; r < n; r++) {
        const idx = b + g * n + r * n * n          // B-fastest .3dl index
        const [ro, go, bo] = entries[idx]
        cubeLines.push(
          `${(ro / maxOut).toFixed(6)} ${(go / maxOut).toFixed(6)} ${(bo / maxOut).toFixed(6)}`
        )
      }
    }
  }

  return cubeLines.join('\n') + '\n'
}

// Extract and convert from zip.
// Looks for a zip in: CLI argument first, then any *.zip inside public/luts/.
function findZip() {
  const arg = process.argv[2]
  if (arg && existsSync(arg)) return arg
  // Auto-discover: luts-source/ next to scripts/, then public/luts/
  for (const dir of [join(__dirname, '../luts-source'), OUT_DIR]) {
    try {
      const files = readdirSync(dir).filter(f => f.endsWith('.zip'))
      if (files.length > 0) return join(dir, files[0])
    } catch {}
  }
  return null
}

const zipPath = findZip()

if (zipPath) {
  console.log(`Reading zip: ${zipPath}\n`)
  const zip = new AdmZip(zipPath)


  for (const [presetId, filename] of Object.entries(FUJI_MAP)) {
    const outPath = join(OUT_DIR, `${presetId}.cube`)
    if (existsSync(outPath)) {
      results.converted.push(`${presetId} (already present)`)
      continue
    }

    const entry = zip.getEntries().find(e => e.name === filename)
    if (!entry) {
      results.failed.push(`${presetId} — "${filename}" not found in zip`)
      continue
    }

    try {
      const text = entry.getData().toString('utf8')
      const cube = convert3dlToCube(text)
      writeFileSync(outPath, cube)
      results.converted.push(presetId)
      console.log(`  ✓ ${presetId}`)
    } catch (err) {
      results.failed.push(`${presetId} — ${err.message}`)
      console.warn(`  ✗ ${presetId}: ${err.message}`)
    }
  }
}

// ─── Kodak / Ilford: HaldCLUT aus Zip ───────────────────────────────────────
// Lege HaldCLUT.zip in luts-source/ und führe npm run fetch-luts aus.
// "2" = normale Belichtung (box speed) aus den Belichtungsvarianten 1-/2/3+/4++

const HALD_MAP = {
  'portra-400': 'HaldCLUT/Color/Kodak/Kodak Portra 400 2.png',
  'gold-200':   'HaldCLUT/Color/Kodak/Kodak Elite Color 200.png',   // nächste Annäherung
  'ektar-100':  'HaldCLUT/Color/Kodak/Kodak Ektar 100.png',
  'hp5-plus':   'HaldCLUT/Black-and-White/Ilford/Ilford HP5 Plus 400.png',
  'delta-3200': 'HaldCLUT/Black-and-White/Ilford/Ilford Delta 3200 2.png',
}

const haldZipPath = (() => {
  try {
    const files = readdirSync(join(__dirname, '../luts-source')).filter(f => f.toLowerCase().includes('haldclut') && f.endsWith('.zip'))
    if (files.length > 0) return join(__dirname, '../luts-source', files[0])
  } catch {}
  return null
})()

if (haldZipPath) {
  console.log(`\nReading HaldCLUT zip: ${haldZipPath}\n`)
  const { PNG } = await import('pngjs')
  const haldZip = new AdmZip(haldZipPath)

  for (const [presetId, entryPath] of Object.entries(HALD_MAP)) {
    const outPath = join(OUT_DIR, `${presetId}.cube`)
    if (existsSync(outPath)) {
      results.converted.push(`${presetId} (already present)`)
      continue
    }

    const entry = haldZip.getEntry(entryPath)
    if (!entry) {
      results.failed.push(`${presetId} — "${entryPath}" nicht in zip gefunden`)
      continue
    }

    try {
      const buf = entry.getData()
      const png = PNG.sync.read(buf)
      const cube = haldToCube(png)
      writeFileSync(outPath, cube)
      results.converted.push(presetId)
      console.log(`  ✓ ${presetId}`)
    } catch (err) {
      results.failed.push(`${presetId} — ${err.message}`)
      console.warn(`  ✗ ${presetId}: ${err.message}`)
    }
  }
} else {
  for (const id of Object.keys(HALD_MAP)) {
    results.skipped.push(`${id} — HaldCLUT.zip in luts-source/ ablegen`)
  }
}

// ─── HaldCLUT PNG → .cube ─────────────────────────────────────────────────────
function haldToCube(png) {
  const { width, height, data } = png
  const level = Math.round(Math.cbrt(width * height))
  const size = level

  const cubeLines = [`LUT_3D_SIZE ${size}`]
  for (let b = 0; b < size; b++) {
    for (let g = 0; g < size; g++) {
      for (let r = 0; r < size; r++) {
        const idx = r + g * size + b * size * size
        const px = idx % width
        const py = Math.floor(idx / width)
        const offset = (py * width + px) * 4
        cubeLines.push(
          `${(data[offset] / 255).toFixed(6)} ${(data[offset + 1] / 255).toFixed(6)} ${(data[offset + 2] / 255).toFixed(6)}`
        )
      }
    }
  }
  return cubeLines.join('\n') + '\n'
}

// ─── Summary ──────────────────────────────────────────────────────────────────
console.log('\n─── Summary ────────────────────────────────')
if (results.converted.length) {
  console.log(`\nConverted / ready (${results.converted.length}):`)
  results.converted.forEach(s => console.log(`  ✓ ${s}`))
}
if (results.failed.length) {
  console.log(`\nFailed — synthetic LUT used at runtime (${results.failed.length}):`)
  results.failed.forEach(s => console.log(`  ✗ ${s}`))
}
if (results.skipped.length) {
  console.log(`\nSkipped (${results.skipped.length}):`)
  results.skipped.forEach(s => console.log(`  · ${s}`))
}
