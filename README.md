# Film Simulation

Web-based photo editor for simulating classic film stocks using real LUT color profiles.

## Features

- **12 film simulations** — Fujifilm (Velvia 50, Classic Chrome, Classic Neg, Provia 100F,
  Eterna Cinema, Fuji 400H), Kodak (Portra 400, Gold 200, Ektar 100), Ilford (HP5 Plus, Delta 3200)
- **WebGL 2.0** — Real-time color grading with 3D LUT textures
- **Split slider** — Before/after comparison, mouse & touch
- **Controls** — Exposure, grain, vignette
- **Export** — Full-resolution JPEG download

## Development

```bash
npm install
npm run dev       # localhost:5173
npm run build     # Production build → dist/
```

## LUT files

`.cube` files are **not tracked in Git** (too large for GitHub). Place them in `public/luts/`.

**Fujifilm** (Velvia 50, Classic Chrome, Classic Neg, Provia 100F, Eterna Cinema, Fuji 400H):
Download the free Sowerby LUT pack → https://blog.sowerby.me/fuji-film-simulation-profiles/
Place the zip in `luts-source/`, then run:

```bash
npm run fetch-luts
```

**Kodak & Ilford** (Portra 400, Gold 200, Ektar 100, HP5 Plus, Delta 3200):
Download `HaldCLUT.zip` → https://rawpedia.rawtherapee.com/Film_Simulation
Place in `luts-source/`, then run the same command.

Presets without a `.cube` file fall back to a synthetic approximation automatically.

## Docker / Coolify

```bash
docker build -t film-simulation .
docker run -p 8080:80 film-simulation
```

Multi-stage build: Node.js → nginx. Serves on port 80.

## Tech stack

|               |                            |
| ------------- | -------------------------- |
| Frontend      | React 18 + Vite            |
| Color grading | WebGL 2.0, 3D LUT textures |
| Grain         | Canvas API                 |
| Styling       | CSS Modules                |
| Deployment    | Docker + nginx             |
