import { useState, useEffect } from 'react'
import { parseCube } from '../utils/lutParser.js'
import { generateSyntheticLUT } from '../utils/syntheticLUT.js'

// Module-level cache survives re-renders and preset switches
const cache = new Map()

/**
 * Fetches and caches parsed LUT data for a given preset.
 * Falls back to a synthetic LUT if the .cube file is unavailable.
 * @param {string|null} lutFile - filename in public/luts/, or null for identity
 * @param {string} presetId
 * @returns {{ lutData: {size: number, data: Float32Array}|null, loading: boolean }}
 */
export function useLUT(lutFile, presetId) {
  const [lutData, setLutData] = useState(() => cache.get(presetId) ?? null)
  const [loading, setLoading] = useState(!cache.has(presetId))

  useEffect(() => {
    if (cache.has(presetId)) {
      setLutData(cache.get(presetId))
      setLoading(false)
      return
    }

    if (!lutFile) {
      // Identity preset: generate a 2-point identity LUT
      const identity = generateSyntheticLUT('original')
      cache.set(presetId, identity)
      setLutData(identity)
      setLoading(false)
      return
    }

    let cancelled = false
    setLoading(true)

    fetch(`./luts/${lutFile}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        return res.text()
      })
      .then((text) => parseCube(text))
      .catch((err) => {
        console.warn(`[film-simulation] Could not load ${lutFile}, using synthetic LUT:`, err)
        return generateSyntheticLUT(presetId)
      })
      .then((data) => {
        if (cancelled) return
        cache.set(presetId, data)
        setLutData(data)
        setLoading(false)
      })

    return () => { cancelled = true }
  }, [presetId, lutFile])

  return { lutData, loading }
}
