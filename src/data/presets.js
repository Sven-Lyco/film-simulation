/** @type {{ id: string, name: string, brand: string, lutFile: string|null, brandColor: string }[]} */
export const presets = [
  { id: 'original',      name: 'Original',      brand: '—',        lutFile: null,                  brandColor: '#888888' },

  // Fujifilm — Farb-Simulationen
  { id: 'velvia-50',     name: 'Velvia 50',      brand: 'Fujifilm', lutFile: 'velvia-50.cube',      brandColor: '#00a0e3' },
  { id: 'classic-chrome',name: 'Classic Chrome', brand: 'Fujifilm', lutFile: 'classic-chrome.cube', brandColor: '#00a0e3' },
  { id: 'classic-neg',   name: 'Classic Neg',    brand: 'Fujifilm', lutFile: 'classic-neg.cube',    brandColor: '#00a0e3' },
  { id: 'provia-100f',   name: 'Provia 100F',    brand: 'Fujifilm', lutFile: 'provia-100f.cube',    brandColor: '#00a0e3' },
  { id: 'astia',         name: 'Astia',          brand: 'Fujifilm', lutFile: 'astia.cube',           brandColor: '#00a0e3' },
  { id: 'pro-neg-std',   name: 'Pro Neg Std',    brand: 'Fujifilm', lutFile: 'pro-neg-std.cube',    brandColor: '#00a0e3' },
  { id: 'pro-neg-hi',    name: 'Pro Neg Hi',     brand: 'Fujifilm', lutFile: 'pro-neg-hi.cube',     brandColor: '#00a0e3' },
  { id: 'eterna-cinema', name: 'Eterna Cinema',  brand: 'Fujifilm', lutFile: 'eterna-cinema.cube',  brandColor: '#00a0e3' },
  { id: 'fuji-400h',     name: 'Fuji 400H',      brand: 'Fujifilm', lutFile: 'fuji-400h.cube',      brandColor: '#00a0e3' },
  { id: 'sepia',         name: 'Sepia',          brand: 'Fujifilm', lutFile: 'sepia.cube',           brandColor: '#00a0e3' },

  // Fujifilm — Schwarzweiß
  { id: 'acros',         name: 'Acros',          brand: 'Fujifilm', lutFile: 'acros.cube',           brandColor: '#00a0e3' },
  { id: 'acros-r',       name: 'Acros+R',        brand: 'Fujifilm', lutFile: 'acros-r.cube',         brandColor: '#00a0e3' },
  { id: 'acros-g',       name: 'Acros+G',        brand: 'Fujifilm', lutFile: 'acros-g.cube',         brandColor: '#00a0e3' },
  { id: 'acros-ye',      name: 'Acros+Ye',       brand: 'Fujifilm', lutFile: 'acros-ye.cube',        brandColor: '#00a0e3' },
  { id: 'mono',          name: 'Mono',           brand: 'Fujifilm', lutFile: 'mono.cube',            brandColor: '#00a0e3' },
  { id: 'mono-r',        name: 'Mono+R',         brand: 'Fujifilm', lutFile: 'mono-r.cube',          brandColor: '#00a0e3' },
  { id: 'mono-g',        name: 'Mono+G',         brand: 'Fujifilm', lutFile: 'mono-g.cube',          brandColor: '#00a0e3' },
  { id: 'mono-ye',       name: 'Mono+Ye',        brand: 'Fujifilm', lutFile: 'mono-ye.cube',         brandColor: '#00a0e3' },

  // Kodak
  { id: 'portra-400',    name: 'Portra 400',     brand: 'Kodak',    lutFile: 'portra-400.cube',      brandColor: '#f7a800' },
  { id: 'gold-200',      name: 'Gold 200',       brand: 'Kodak',    lutFile: 'gold-200.cube',        brandColor: '#f7a800' },
  { id: 'ektar-100',     name: 'Ektar 100',      brand: 'Kodak',    lutFile: 'ektar-100.cube',       brandColor: '#f7a800' },

  // Ilford
  { id: 'hp5-plus',      name: 'HP5 Plus',       brand: 'Ilford',   lutFile: 'hp5-plus.cube',        brandColor: '#555555' },
  { id: 'delta-3200',    name: 'Delta 3200',     brand: 'Ilford',   lutFile: 'delta-3200.cube',      brandColor: '#555555' },
]
