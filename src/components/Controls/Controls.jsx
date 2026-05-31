import styles from './Controls.module.css'

/**
 * @param {{
 *   exposure: number,
 *   grain: number,
 *   vignette: number,
 *   onChange: (values: {exposure?: number, grain?: number, vignette?: number}) => void
 * }} props
 */
export function Controls({ exposure, intensity, grain, vignette, onChange }) {
  return (
    <div className={styles.controls}>
      <Slider
        label="Belichtung"
        value={exposure}
        min={-50}
        max={50}
        format={(v) => (v > 0 ? `+${v}` : `${v}`)}
        onChange={(v) => onChange({ exposure: v })}
      />
      <Slider
        label="Intensität"
        value={intensity}
        min={0}
        max={100}
        format={(v) => `${v}%`}
        onChange={(v) => onChange({ intensity: v })}
      />
      <Slider
        label="Korn"
        value={grain}
        min={0}
        max={100}
        format={(v) => `${v}%`}
        onChange={(v) => onChange({ grain: v })}
      />
      <Slider
        label="Vignette"
        value={vignette}
        min={0}
        max={100}
        format={(v) => `${v}%`}
        onChange={(v) => onChange({ vignette: v })}
      />
    </div>
  )
}

function Slider({ label, value, min, max, format, onChange }) {
  return (
    <label className={styles.row}>
      <span className={styles.label}>{label}</span>
      <input
        type="range"
        className={styles.range}
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
      />
      <span className={styles.value}>{format(value)}</span>
    </label>
  )
}
