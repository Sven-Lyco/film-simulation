/**
 * Composites all render layers and triggers a JPEG download.
 * @param {HTMLCanvasElement} webglCanvas - LUT-processed image
 * @param {HTMLCanvasElement|null} grainCanvas - grain noise tile
 * @param {number} vignetteStrength 0–1
 * @param {string} presetId
 */
export function downloadComposite(webglCanvas, grainCanvas, vignetteStrength, presetId) {
  const w = webglCanvas.width
  const h = webglCanvas.height

  const offscreen = document.createElement('canvas')
  offscreen.width = w
  offscreen.height = h
  const ctx = offscreen.getContext('2d')

  // Layer 1: LUT-processed image
  ctx.drawImage(webglCanvas, 0, 0)

  // Layer 2: grain (overlay blend)
  if (grainCanvas && vignetteStrength !== undefined) {
    ctx.globalCompositeOperation = 'overlay'
    const pattern = ctx.createPattern(grainCanvas, 'repeat')
    ctx.fillStyle = pattern
    ctx.fillRect(0, 0, w, h)
    ctx.globalCompositeOperation = 'source-over'
  }

  // Layer 3: vignette (radial gradient)
  if (vignetteStrength > 0) {
    const x = w / 2
    const y = h / 2
    const r = Math.sqrt(x * x + y * y)
    const innerStop = Math.max(0, 1 - vignetteStrength * 0.7)
    const alpha = vignetteStrength * 0.85

    const gradient = ctx.createRadialGradient(x, y, r * innerStop, x, y, r)
    gradient.addColorStop(0, 'rgba(0,0,0,0)')
    gradient.addColorStop(1, `rgba(0,0,0,${alpha})`)

    ctx.globalCompositeOperation = 'source-over'
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, w, h)
  }

  offscreen.toBlob(
    (blob) => {
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `film-simulation-${presetId}.jpg`
      a.click()
      URL.revokeObjectURL(url)
    },
    'image/jpeg',
    0.93
  )
}
