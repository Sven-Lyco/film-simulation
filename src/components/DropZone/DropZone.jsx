import { useRef, useState } from 'react'
import styles from './DropZone.module.css'

/**
 * @param {{ onImageLoad: (img: HTMLImageElement, src: string) => void }} props
 */
export function DropZone({ onImageLoad }) {
  const [isDragging, setIsDragging] = useState(false)
  const inputRef = useRef(null)

  function loadFile(file) {
    if (!file || !file.type.startsWith('image/')) return
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () => onImageLoad(img, url)
    img.src = url
  }

  function onDragOver(e) {
    e.preventDefault()
    setIsDragging(true)
  }

  function onDragLeave() {
    setIsDragging(false)
  }

  function onDrop(e) {
    e.preventDefault()
    setIsDragging(false)
    loadFile(e.dataTransfer.files[0])
  }

  function onChange(e) {
    loadFile(e.target.files[0])
  }

  return (
    <div
      className={`${styles.zone} ${isDragging ? styles.dragging : ''}`}
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      onClick={() => inputRef.current?.click()}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && inputRef.current?.click()}
    >
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className={styles.input}
        onChange={onChange}
      />
      <div className={styles.content}>
        <svg className={styles.icon} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <p className={styles.primary}>Bild hier ablegen</p>
        <p className={styles.secondary}>oder klicken zum Auswählen</p>
      </div>
    </div>
  )
}
