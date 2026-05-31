import { useRef, useState, useCallback } from 'react'
import styles from './SplitSlider.module.css'

/**
 * Before/after split comparison component.
 * Left side: original image. Right side: WebGL-processed output with grain/vignette.
 *
 * @param {{
 *   imageSrc: string,
 *   webglCanvasRef: (node: HTMLCanvasElement|null) => void,
 *   grainCanvas: HTMLCanvasElement|null,
 *   vignetteStrength: number,
 *   presetName: string
 * }} props
 */
export function SplitSlider({ imageSrc, webglCanvasRef, grainCanvas, vignetteStrength, presetName, frameSize, onNewImage, loading }) {
  const [sliderX, setSliderX] = useState(50)
  const [isDraggingFile, setIsDraggingFile] = useState(false)
  const containerRef = useRef(null)
  const dragging = useRef(false)

  function onDragOver(e) {
    if (e.dataTransfer.types.includes('Files')) {
      e.preventDefault()
      setIsDraggingFile(true)
    }
  }

  function onDragLeave() { setIsDraggingFile(false) }

  function onDrop(e) {
    e.preventDefault()
    setIsDraggingFile(false)
    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/') && onNewImage) {
      const url = URL.createObjectURL(file)
      const img = new Image()
      img.onload = () => onNewImage(img, url)
      img.src = url
    }
  }

  const updateSlider = useCallback((clientX) => {
    const rect = containerRef.current.getBoundingClientRect()
    const x = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width))
    setSliderX(x * 100)
  }, [])

  function onPointerDown(e) {
    dragging.current = true
    containerRef.current.setPointerCapture(e.pointerId)
    updateSlider(e.clientX)
  }

  function onPointerMove(e) {
    if (!dragging.current) return
    updateSlider(e.clientX)
  }

  function onPointerUp() {
    dragging.current = false
  }

  const innerStop = Math.max(0, (1 - vignetteStrength) * 80)
  const alpha = (vignetteStrength * 0.85).toFixed(3)
  const vignetteGradient = vignetteStrength > 0
    ? `radial-gradient(ellipse at center, transparent ${innerStop}%, rgba(0,0,0,${alpha}) 100%)`
    : 'none'

  // Convert grain canvas to CSS background URL, caching per canvas instance
  const grainBg = grainCanvas ? canvasToDataUrl(grainCanvas) : null

  return (
    <div
      ref={containerRef}
      className={`${styles.container} ${isDraggingFile ? styles.dropping : ''}`}
      style={frameSize ? { width: frameSize.width, height: frameSize.height } : undefined}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
    >
      {/* Original image — always full width underneath */}
      <img src={imageSrc} className={styles.original} alt="Original" draggable={false} />

      {/* Processed layers, clipped to the right portion */}
      <div
        className={styles.processed}
        style={{ clipPath: `inset(0 0 0 ${sliderX}%)` }}
      >
        <canvas ref={webglCanvasRef} className={styles.canvas} />
        {grainBg && (
          <div
            className={styles.grain}
            style={{ backgroundImage: `url(${grainBg})` }}
          />
        )}
        {vignetteStrength > 0 && (
          <div className={styles.vignette} style={{ background: vignetteGradient }} />
        )}
      </div>

      {/* Divider line + handle */}
      <div className={styles.divider} style={{ left: `${sliderX}%` }}>
        <div className={styles.handle}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" width="16" height="16">
            <path d="M8 4L4 10L8 16M12 4L16 10L12 16" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>

      {/* Loading overlay */}
      {loading && (
        <div className={styles.loadingOverlay}>
          <div className={styles.spinner} />
        </div>
      )}

      {/* Labels */}
      <span className={styles.labelLeft}>ORIGINAL</span>
      <span className={styles.labelRight}>{presetName.toUpperCase()}</span>
    </div>
  )
}

// Cache data URLs per canvas instance to avoid repeated toDataURL calls
const dataUrlCache = new WeakMap()
function canvasToDataUrl(canvas) {
  if (!dataUrlCache.has(canvas)) {
    dataUrlCache.set(canvas, canvas.toDataURL())
  }
  return dataUrlCache.get(canvas)
}
