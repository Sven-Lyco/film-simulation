import styles from './PresetList.module.css'

/**
 * @param {{
 *   presets: Array<{id:string,name:string,brand:string,brandColor:string}>,
 *   activeId: string,
 *   loadingId: string|null,
 *   onSelect: (id: string) => void
 * }} props
 */
export function PresetList({ presets, activeId, loadingId, onSelect }) {
  return (
    <ul className={styles.list}>
      {presets.map((preset) => (
        <li key={preset.id}>
          <button
            className={`${styles.item} ${preset.id === activeId ? styles.active : ''}`}
            onClick={() => onSelect(preset.id)}
          >
            <span
              className={styles.dot}
              style={{ background: preset.brandColor }}
            />
            <span className={styles.labels}>
              <span className={styles.name}>{preset.name}</span>
              <span className={styles.brand}>{preset.brand}</span>
            </span>
            {preset.id === loadingId && (
              <span className={styles.spinner} aria-label="Lädt" />
            )}
          </button>
        </li>
      ))}
    </ul>
  )
}
