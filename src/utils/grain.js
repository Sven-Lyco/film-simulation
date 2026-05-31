/**
 * Generates a tileable 512x512 noise canvas for grain overlay.
 * Uses mid-grey base so overlay blend mode is neutral at zero intensity.
 * @param {number} intensity 0–1
 * @returns {HTMLCanvasElement}
 */
export function generateGrainCanvas(intensity) {
  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size

  const ctx = canvas.getContext('2d')
  const imageData = ctx.createImageData(size, size)
  const buf = imageData.data

  const range = Math.round(intensity * 120)
  const base = 128

  // crypto.getRandomValues is limited to 65536 bytes per call
  const noise = new Uint8Array(size * size)
  const CHUNK = 65536
  for (let offset = 0; offset < noise.length; offset += CHUNK) {
    crypto.getRandomValues(noise.subarray(offset, offset + CHUNK))
  }

  for (let i = 0; i < noise.length; i++) {
    const v = base + Math.round((noise[i] / 255 - 0.5) * 2 * range)
    const clamped = Math.max(0, Math.min(255, v))
    const p = i * 4
    buf[p] = clamped
    buf[p + 1] = clamped
    buf[p + 2] = clamped
    buf[p + 3] = 255
  }

  ctx.putImageData(imageData, 0, 0)
  return canvas
}
