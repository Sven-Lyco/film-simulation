# film-simulation

A web-based film simulation photo editor with accurate LUT-based color grading, a before/after split-slider, and export functionality.

---

## Tech Stack

| Layer | Choice |
|---|---|
| Frontend | React 18 + Vite |
| Color grading | WebGL 2.0 with 3D LUT textures |
| Grain | Canvas API (noise tile, overlay blend mode) |
| Styling | CSS Modules |
| Language | JavaScript (ES2022) |

---

## LUT Requirements

Film presets must use real `.cube` LUT files — not CSS filters or matrix math.

### Where to get the LUTs

**Fujifilm simulations (Velvia, Classic Chrome, Classic Neg, Provia, Eterna, Fuji 400H):**
- Stuart Sowerby's free Fujifilm LUT pack:
  https://blog.sowerby.me/fuji-film-simulation-profiles/
- Download the `.cube` versions (not ICC profiles)

**Kodak & Ilford (Portra 400, Gold 200, Ektar 100, HP5 Plus, Delta 3200):**
- RawTherapee HaldCLUT film simulation collection:
  https://rawpedia.rawtherapee.com/Film_Simulation
- These ship as HaldCLUT PNG files — convert to `.cube` using the
  `hald-to-cube` npm package, or write a one-time conversion script

**Fallback (if a specific LUT file is unavailable):**
Generate a synthetic `.cube` programmatically from a color matrix
that approximates the film's known characteristics. Store the generator
in `src/utils/syntheticLUT.js` and document which presets use it.

### LUT file placement

```
public/
└── luts/
    ├── velvia-50.cube
    ├── classic-chrome.cube
    ├── classic-neg.cube
    ├── provia-100f.cube
    ├── eterna-cinema.cube
    ├── portra-400.cube
    ├── gold-200.cube
    ├── ektar-100.cube
    ├── hp5-plus.cube
    ├── delta-3200.cube
    ├── fuji-400h.cube
    └── original.cube        ← identity LUT (no change)
```

All LUT files must be 33x33x33 or 64x64x64. Parse the `LUT_3D_SIZE`
header to determine size at runtime.

---

## Film Presets

| ID | Display Name | Brand | Character |
|---|---|---|---|
| `original` | Original | — | No effect, identity LUT |
| `velvia-50` | Velvia 50 | Fujifilm | Vivid, high contrast, saturated greens and reds |
| `classic-chrome` | Classic Chrome | Fujifilm | Muted, cinematic, slightly cool shadows |
| `classic-neg` | Classic Neg | Fujifilm | Faded, warm shadows, nostalgic |
| `provia-100f` | Provia 100F | Fujifilm | Neutral, faithful, slight warmth |
| `eterna-cinema` | Eterna Cinema | Fujifilm | Flat, low contrast, film-grade |
| `portra-400` | Portra 400 | Kodak | Warm, excellent skin tones, slightly faded |
| `gold-200` | Gold 200 | Kodak | Warm, contrasty, golden cast |
| `ektar-100` | Ektar 100 | Kodak | Vivid, ultra-fine grain, natural |
| `hp5-plus` | HP5 Plus | Ilford | Black & white, classic contrast |
| `delta-3200` | Delta 3200 | Ilford | Black & white, pushed, gritty grain |
| `fuji-400h` | Fuji 400H | Fujifilm | Cool, pastel, slightly underexposed feel |

---

## Architecture

```
film-simulation/
├── CLAUDE.md
├── index.html
├── vite.config.js
├── package.json
├── public/
│   └── luts/                    ← .cube files (see above)
└── src/
    ├── main.jsx
    ├── App.jsx
    ├── App.module.css
    ├── components/
    │   ├── DropZone/             ← Upload area with drag & drop
    │   ├── SplitSlider/          ← Before/after comparison
    │   ├── PresetList/           ← Film preset selector
    │   ├── Controls/             ← Exposure, grain, vignette sliders
    │   └── DownloadButton/       ← Export to JPEG
    ├── hooks/
    │   ├── useWebGL.js           ← WebGL context, texture upload, render loop
    │   └── useLUT.js             ← Fetch + parse .cube files, cache per preset
    ├── utils/
    │   ├── lutParser.js          ← Parse .cube format → Float32Array
    │   ├── grain.js              ← Generate tiled canvas noise
    │   ├── download.js           ← Composite final image and trigger download
    │   └── syntheticLUT.js       ← Fallback LUT generator (if file missing)
    └── data/
        └── presets.js            ← Preset definitions (id, name, brand, lutFile)
```

---

## UI Specification

### Layout

Two-column layout at ≥768px, single column on mobile:
- **Left (main):** image comparison area + controls + download button
- **Right (sidebar):** scrollable film preset list

### Image Comparison Area

- Aspect ratio: 3/2 container, `object-fit: contain` for the image
- **Split slider:** draggable vertical divider
  - Left side: original (no LUT, no effects)
  - Right side: LUT applied + grain + vignette
  - Drag anywhere in the image area (not just the handle)
  - Handle: white circle with ↔ icon at midpoint of divider line
  - Labels: "ORIGINAL" bottom-left, preset name bottom-right
  - Works with mouse and touch
- When no image is loaded: show upload prompt with drag & drop

### Controls

Three sliders below the image:
1. **Belichtung** (Exposure): -50 to +50, default 0
2. **Korn** (Grain): 0–100%, default 20%
3. **Vignette**: 0–100%, default 30%

### Preset List

- Vertical list, scrollable
- Each item: colored dot (brand color) + preset name + brand sub-label
- Active preset: amber border + amber background tint
- Clicking a preset loads its LUT instantly (cached after first load)

### Download

- Button: "BILD SPEICHERN"
- Exports the **full-resolution** processed image as JPEG (quality 0.93)
- Filename: `film-simulation-{preset-id}.jpg`
- Composite order: LUT-processed image → grain → vignette
- After download: button briefly shows "GESPEICHERT ✓"
- Disabled until an image is loaded

---

## WebGL Implementation Notes

### LUT as 3D Texture

```glsl
// Fragment shader (simplified)
uniform sampler2D uImage;
uniform sampler3D uLUT;
uniform float uLUTSize;

void main() {
  vec4 color = texture2D(uImage, vTexCoord);
  float scale = (uLUTSize - 1.0) / uLUTSize;
  float offset = 0.5 / uLUTSize;
  vec3 lutCoord = color.rgb * scale + offset;
  gl_FragColor = vec4(texture(uLUT, lutCoord).rgb, color.a);
}
```

- Upload the LUT Float32Array as a `TEXTURE_3D` with `RGB32F` internal format
- Cache loaded LUTs in a `Map<presetId, WebGLTexture>` to avoid re-uploading
- Apply exposure (brightness uniform) before LUT lookup, not after

### Grain

- Generate a 512×512 noise tile on a Canvas once per grain intensity change
- Tile it across the image using `ctx.globalCompositeOperation = 'overlay'`
- Regenerate only when the grain slider changes, not on every frame

### Vignette

- Render as a radial gradient overlay on a Canvas layer
- `radial-gradient(ellipse at center, transparent X%, rgba(0,0,0,Y) 100%)`
- X and Y derived from the vignette slider value

### Render pipeline order

1. Draw original image → WebGL canvas (apply LUT + exposure)
2. Composite grain canvas on top (overlay blend)
3. Composite vignette canvas on top (normal blend)
4. Split slider clips the processed side via `clip-path: inset(0 0 0 X%)`

---

## Code Conventions

- **Component files:** PascalCase (`SplitSlider.jsx`)
- **Hooks:** camelCase prefixed with `use` (`useWebGL.js`)
- **Utils:** camelCase (`lutParser.js`)
- **CSS:** CSS Modules only — no inline styles, no Tailwind
- **State management:** React `useState` + `useReducer` — no external store
- **LUT loading:** always async with a loading state per preset
- **Error handling:** if a `.cube` file fails to load, fall back to synthetic LUT and log a warning — never crash the app
- **No TypeScript** — plain JavaScript with JSDoc comments on public functions
- **Vite config:** set `base: './'` for portability

---

## Development Commands

```bash
npm install
npm run dev      # localhost:5173
npm run build    # dist/
npm run preview  # preview build
```
