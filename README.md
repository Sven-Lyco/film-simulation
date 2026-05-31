# Film Simulation

Web-based photo editor for simulating classic film stocks using real LUT color profiles.

## Features

- **24 film simulations** — Fujifilm (Velvia, Classic Chrome, Acros, …), Kodak (Portra, Ektar, Gold), Ilford (HP5, Delta)
- **WebGL 2.0** — Real-time color grading with 3D LUT textures
- **Split slider** — Before/after comparison, mouse & touch
- **Controls** — Exposure, film strength, grain, vignette
- **Export** — Full-resolution JPEG download

## Development

```bash
npm install
npm run dev       # localhost:5173
npm run build     # Production build → dist/
```

## Setting up LUT files

The `.cube` files for film simulations are stored in `public/luts/`.  
Missing LUTs can be added at any time:

**Fujifilm** — place the Sowerby `.zip` pack into `luts-source/`:
```bash
npm run fetch-luts
```

**Kodak / Ilford** — place `HaldCLUT.zip` (from rawtherapee.com/shared/HaldCLUT.zip) into `luts-source/`:
```bash
npm run fetch-luts
```

The script auto-detects zips and converts them. Presets without a real LUT file fall back to a synthetic approximation.

## Docker / Coolify

```bash
docker build -t film-simulation .
docker run -p 8080:80 film-simulation
```

Multi-stage build: Node.js → nginx. Serves on port 80.

## Tech stack

| | |
|---|---|
| Frontend | React 18 + Vite |
| Color grading | WebGL 2.0, 3D LUT textures |
| Grain | Canvas API |
| Styling | CSS Modules |
| Deployment | Docker + nginx |
