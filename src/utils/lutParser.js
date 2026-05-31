/**
 * Parses a .cube LUT file text into structured data.
 * Iteration order in .cube: R is fastest-varying axis (X in TEXTURE_3D).
 * @param {string} text
 * @returns {{ size: number, data: Float32Array }}
 */
export function parseCube(text) {
  const lines = text.split('\n')
  let size = 0
  const values = []

  for (const raw of lines) {
    const line = raw.trim()
    if (!line || line.startsWith('#') || line.startsWith('TITLE')) continue

    if (line.startsWith('LUT_3D_SIZE')) {
      size = parseInt(line.split(/\s+/)[1], 10)
      continue
    }

    if (line.startsWith('DOMAIN_') || line.startsWith('LUT_1D_SIZE')) continue

    const parts = line.split(/\s+/)
    if (parts.length >= 3) {
      values.push(parseFloat(parts[0]), parseFloat(parts[1]), parseFloat(parts[2]))
    }
  }

  if (size === 0) throw new Error('LUT_3D_SIZE not found in .cube file')
  const expected = size * size * size * 3
  if (values.length < expected) throw new Error(`Expected ${expected} values, got ${values.length}`)

  return { size, data: new Float32Array(values.slice(0, expected)) }
}
