import { useState, useEffect, useCallback, useRef } from 'react'
import { presets } from './data/presets.js'
import { useLUT } from './hooks/useLUT.js'
import { useWebGL } from './hooks/useWebGL.js'
import { generateGrainCanvas } from './utils/grain.js'
import { downloadComposite } from './utils/download.js'
import { DropZone } from './components/DropZone/DropZone.jsx'
import { SplitSlider } from './components/SplitSlider/SplitSlider.jsx'
import { PresetList } from './components/PresetList/PresetList.jsx'
import { Controls } from './components/Controls/Controls.jsx'
import { DownloadButton } from './components/DownloadButton/DownloadButton.jsx'
import { defaults, initialPreset } from './config.js'
import styles from './App.module.css'

export default function App() {
  const [image, setImage] = useState(null)
  const [imageSrc, setImageSrc] = useState(null)
  const [expanded, setExpanded] = useState(false)
  const [activePresetId, setActivePresetId] = useState(initialPreset)
  const [exposure, setExposure] = useState(defaults.exposure)
  const [intensity, setIntensity] = useState(defaults.intensity)
  const [grain, setGrain] = useState(defaults.grain)
  const [vignette, setVignette] = useState(defaults.vignette)

  // Escape schließt Expanded-Mode
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') setExpanded(false) }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  // ResizeObserver: berechnet die größtmögliche Darstellung des Bildes
  // im imageArea (object-fit: contain Verhalten für Container)
  const imageAreaRef = useRef(null)
  const [frameSize, setFrameSize] = useState(null)

  useEffect(() => {
    if (!image || !imageAreaRef.current) return
    const aspect = image.naturalWidth / image.naturalHeight
    const obs = new ResizeObserver(([entry]) => {
      const { width: aW, height: aH } = entry.contentRect
      const fitByWidth = { w: aW, h: aW / aspect }
      const fitByHeight = { w: aH * aspect, h: aH }
      const { w, h } = fitByHeight.w <= aW ? fitByHeight : fitByWidth
      setFrameSize({ width: Math.floor(w), height: Math.floor(h) })
    })
    obs.observe(imageAreaRef.current)
    return () => obs.disconnect()
  }, [image])

  // Callback ref: stores the actual canvas DOM element in state so
  // useWebGL re-runs its setup effect when the canvas mounts/unmounts.
  const [webglCanvas, setWebglCanvas] = useState(null)
  const webglCanvasCallback = useCallback((node) => setWebglCanvas(node), [])

  // Grain canvas as state so SplitSlider re-renders when it changes
  const [grainCanvas, setGrainCanvas] = useState(() => generateGrainCanvas(20 / 100))

  useEffect(() => {
    setGrainCanvas(generateGrainCanvas(grain / 100))
  }, [grain])

  const activePreset = presets.find((p) => p.id === activePresetId)
  const { lutData, loading } = useLUT(activePreset.lutFile, activePresetId)

  const redraw = useWebGL(webglCanvas, image, lutData, activePresetId, exposure, intensity / 100)

  function handleFileChange(e) {
    const file = e.target.files[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => handleImageLoad(img, url)
    img.src = url
  }

  function handleImageLoad(img, src) {
    if (imageSrc && imageSrc.startsWith('blob:')) URL.revokeObjectURL(imageSrc)
    setImage(img)
    setImageSrc(src)
  }

  const handleControlChange = useCallback((values) => {
    if (values.exposure !== undefined) setExposure(values.exposure)
    if (values.intensity !== undefined) setIntensity(values.intensity)
    if (values.grain !== undefined) setGrain(values.grain)
    if (values.vignette !== undefined) setVignette(values.vignette)
  }, [])

  function handleDownload() {
    if (!webglCanvas) return
    redraw?.() // Sicherstellen dass Canvas-Inhalt aktuell ist
    downloadComposite(webglCanvas, grainCanvas, vignette / 100, activePresetId)
  }

  return (
    <div className={styles.app}>
      <main className={styles.main}>
        <header className={styles.header}>
          <h1 className={styles.title}>Film Simulation</h1>
          {image && (
            <label className={styles.replaceBtn} title="Neues Bild laden" aria-label="Neues Bild laden">
              <input type="file" accept="image/*" aria-label="Bild ersetzen" style={{ display: 'none' }} onChange={handleFileChange} />
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                <path d="M3 16.5v.75A.75.75 0 003.75 18h12.5a.75.75 0 00.75-.75v-.75M16 6.5l-6-6m0 0L4 6.5m6-6v13" />
              </svg>
              Bild wechseln
            </label>
          )}
        </header>

        <div className={`${styles.imageArea} ${expanded ? styles.imageAreaExpanded : ''}`} ref={imageAreaRef}>
          {image && (
            <button
              className={styles.expandBtn}
              onClick={() => setExpanded(v => !v)}
              title={expanded ? 'Schließen (Esc)' : 'Vollbild'}
              aria-label={expanded ? 'Vollbild schließen' : 'Vollbild öffnen'}
            >
              {expanded
                ? /* X schließen */
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" width="16" height="16">
                    <line x1="4" y1="4" x2="16" y2="16"/>
                    <line x1="16" y1="4" x2="4" y2="16"/>
                  </svg>
                : /* Ecken aufmachen */
                  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" width="16" height="16">
                    <path d="M3 8V3h5M3 3l5.5 5.5M17 8V3h-5m5 0l-5.5 5.5M3 12v5h5m-5 0l5.5-5.5M17 12v5h-5m5 0l-5.5-5.5"/>
                  </svg>
              }
            </button>
          )}
          {image ? (
            <SplitSlider
              imageSrc={imageSrc}
              webglCanvasRef={webglCanvasCallback}
              grainCanvas={grainCanvas}
              vignetteStrength={vignette / 100}
              presetName={activePreset.name}
              frameSize={frameSize}
              onNewImage={handleImageLoad}
              loading={loading}
            />
          ) : (
            <DropZone onImageLoad={handleImageLoad} />
          )}
        </div>

        {image && (
          <>
            <Controls
              exposure={exposure}
              intensity={intensity}
              grain={grain}
              vignette={vignette}
              onChange={handleControlChange}
            />
            <DownloadButton disabled={!image} onDownload={handleDownload} />
          </>
        )}
      </main>

      <aside className={styles.sidebar}>
        <p className={styles.sidebarLabel}>Filmstil</p>
        <PresetList
          presets={presets}
          activeId={activePresetId}
          loadingId={loading ? activePresetId : null}
          onSelect={setActivePresetId}
        />
      </aside>
    </div>
  )
}
