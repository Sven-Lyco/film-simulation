const SIZE = 33

/**
 * Generates an approximate LUT for a given preset ID.
 * Used as fallback when the real .cube file is unavailable.
 * @param {string} presetId
 * @returns {{ size: number, data: Float32Array }}
 */
export function generateSyntheticLUT(presetId) {
  const data = new Float32Array(SIZE * SIZE * SIZE * 3)
  let idx = 0

  for (let b = 0; b < SIZE; b++) {
    for (let g = 0; g < SIZE; g++) {
      for (let r = 0; r < SIZE; r++) {
        const rf = r / (SIZE - 1)
        const gf = g / (SIZE - 1)
        const bf = b / (SIZE - 1)

        let [ro, go, bo] = transform(presetId, rf, gf, bf)

        data[idx++] = Math.max(0, Math.min(1, ro))
        data[idx++] = Math.max(0, Math.min(1, go))
        data[idx++] = Math.max(0, Math.min(1, bo))
      }
    }
  }

  return { size: SIZE, data }
}

function transform(presetId, r, g, b) {
  switch (presetId) {
    case 'velvia-50':
      return velvia(r, g, b)
    case 'classic-chrome':
      return classicChrome(r, g, b)
    case 'classic-neg':
      return classicNeg(r, g, b)
    case 'provia-100f':
      return provia(r, g, b)
    case 'eterna-cinema':
      return eterna(r, g, b)
    case 'fuji-400h':
      return fuji400h(r, g, b)
    case 'portra-400':
      return portra(r, g, b)
    case 'gold-200':
      return gold200(r, g, b)
    case 'ektar-100':
      return ektar(r, g, b)
    case 'hp5-plus':
      return bw(r, g, b, false)
    case 'delta-3200':
      return bw(r, g, b, true)
    default:
      return [r, g, b]
  }
}

function sCurve(v, strength) {
  const s = strength
  if (v < 0.5) return 0.5 * Math.pow(2 * v, 1 + s)
  return 1 - 0.5 * Math.pow(2 * (1 - v), 1 + s)
}

function satBoost(r, g, b, factor) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  return [
    lum + (r - lum) * factor,
    lum + (g - lum) * factor,
    lum + (b - lum) * factor,
  ]
}

function velvia(r, g, b) {
  let [ro, go, bo] = satBoost(r, g, b, 1.5)
  ro = sCurve(ro, 0.3)
  go = sCurve(go, 0.3)
  bo = sCurve(bo, 0.3)
  // Push greens slightly warmer, reds more vivid
  go = go * 0.95 + ro * 0.05
  ro = Math.min(1, ro * 1.05)
  return [ro, go, bo]
}

function classicChrome(r, g, b) {
  // Desaturate midtones, cool shadows
  let [ro, go, bo] = satBoost(r, g, b, 0.75)
  // Slightly cool shadows (reduce red in dark areas)
  const shadow = 1 - Math.max(ro, go, bo)
  ro = ro - shadow * 0.05
  bo = bo + shadow * 0.04
  // Mild fade (lift blacks slightly)
  ro = ro * 0.93 + 0.04
  go = go * 0.93 + 0.04
  bo = bo * 0.93 + 0.04
  return [ro, go, bo]
}

function classicNeg(r, g, b) {
  // Faded, warm shadows, nostalgic
  let [ro, go, bo] = satBoost(r, g, b, 0.85)
  const shadow = Math.max(0, 0.5 - (ro + go + bo) / 3)
  ro = ro + shadow * 0.08
  go = go + shadow * 0.04
  // Lift blacks (faded look)
  ro = ro * 0.88 + 0.06
  go = go * 0.88 + 0.05
  bo = bo * 0.88 + 0.03
  return [ro, go, bo]
}

function provia(r, g, b) {
  // Neutral, faithful, slight warmth
  let [ro, go, bo] = satBoost(r, g, b, 1.05)
  ro = ro * 1.02
  go = go * 1.01
  bo = bo * 0.99
  return [ro, go, bo]
}

function eterna(r, g, b) {
  // Flat, low contrast, film-grade
  let [ro, go, bo] = satBoost(r, g, b, 0.7)
  // Compress tonal range (reduce contrast)
  ro = ro * 0.75 + 0.08
  go = go * 0.75 + 0.08
  bo = bo * 0.75 + 0.08
  return [ro, go, bo]
}

function fuji400h(r, g, b) {
  // Cool, pastel, slightly underexposed feel
  let [ro, go, bo] = satBoost(r, g, b, 0.8)
  ro = ro * 0.92 + 0.03
  go = go * 0.94 + 0.03
  bo = bo * 1.05 + 0.03
  // Gentle S-curve but compressed
  ro = sCurve(ro, -0.1)
  go = sCurve(go, -0.1)
  bo = sCurve(bo, -0.05)
  return [ro, go, bo]
}

function portra(r, g, b) {
  // Warm, excellent skin tones, slightly faded
  let [ro, go, bo] = satBoost(r, g, b, 0.9)
  ro = ro * 1.04 + 0.02
  go = go * 1.01 + 0.02
  bo = bo * 0.94 + 0.02
  return [ro, go, bo]
}

function gold200(r, g, b) {
  // Warm, contrasty, golden cast
  let [ro, go, bo] = satBoost(r, g, b, 1.1)
  ro = sCurve(ro * 1.06, 0.2)
  go = sCurve(go * 1.02, 0.2)
  bo = sCurve(bo * 0.88, 0.2)
  return [ro, go, bo]
}

function ektar(r, g, b) {
  // Vivid, ultra-fine grain, natural
  let [ro, go, bo] = satBoost(r, g, b, 1.3)
  ro = sCurve(ro, 0.15)
  go = sCurve(go, 0.15)
  bo = sCurve(bo, 0.15)
  return [ro, go, bo]
}

function bw(r, g, b, highContrast) {
  const lum = 0.299 * r + 0.587 * g + 0.114 * b
  let out = highContrast ? sCurve(lum, 0.5) : lum
  // Delta 3200: slight warm base tone
  const warm = highContrast ? 0.02 : 0
  return [out + warm, out, out]
}
