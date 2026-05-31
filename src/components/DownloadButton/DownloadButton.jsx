import { useState, useRef } from 'react'
import styles from './DownloadButton.module.css'

/**
 * @param {{ disabled: boolean, onDownload: () => void }} props
 */
export function DownloadButton({ disabled, onDownload }) {
  const [saved, setSaved] = useState(false)
  const timerRef = useRef(null)

  function handleClick() {
    onDownload()
    setSaved(true)
    clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => setSaved(false), 2000)
  }

  return (
    <button
      className={`${styles.btn} ${saved ? styles.saved : ''}`}
      disabled={disabled}
      onClick={handleClick}
    >
      {saved ? 'GESPEICHERT ✓' : 'BILD SPEICHERN'}
    </button>
  )
}
