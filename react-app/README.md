# Noteflow Frontend (Vite + React)

## Overview
- Frontend UI for Noteflow (dashboard + notes)
- Uses Vite + React + TypeScript-ready project structure

## Run (local)
```
npm ci
npm run dev
```
- Configure backend base URL via `VITE_API_BASE_URL` in `.env` (e.g., `http://localhost:8080`)

## Build
```
npm run build
npm run preview
```

## CI (GitHub Actions)
- This folder includes `.github/workflows/ci.yml` that installs and builds on push/PR.
- Node 20 with npm cache.

## Docker (optional; for later)
- Dockerfile included (NGINX serving built static site).
```
docker build -t noteflow-frontend .
docker run --rm -p 8081:80 noteflow-frontend
```
- GitHub Actions container build:
  - `.github/workflows/docker.yml` pushes to GHCR:
    - `ghcr.io/<owner>/<repo>:frontend-latest`
    - `ghcr.io/<owner>/<repo>:frontend-<sha>`

## Split Repositories
- If you move this folder into its own repository root, the included `.github/workflows/*.yml` will work as-is.
- Ensure `.env` includes `VITE_API_BASE_URL` pointing to your backend.

## Theming
- Primary color is set to `#377b24` for a comfortable contrast.
- Dark mode available; transitions for color/background are smoothed.
