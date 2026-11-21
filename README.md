# GitFrame — Visual Git Learning Studio

An interactive, 100% offline-capable visual Git tutorial built with React, TypeScript, Vite, and Tailwind CSS.

## Features
- **16-Step Story-Driven Course**: Learn Git & GitHub from scratch using a CCTV room analogy alongside a live 4-stage repository simulator (`Workspace`, `Staging Area`, `Local Repo`, and `Remote Repo`).
- **Branch Lab & Live Playground**: Compare Fast-Forward, 3-Way Merge, Rebase, and Cherry-Pick in SVG graphs, plus create, commit, switch, merge, and delete branches interactively.
- **4-Stage Flow Matrix**: Visualize every forward and backward Git command across all four stages.
- **Practical Cheat Sheet**: Searchable command reference with shorthands and one-click copy.
- **Single-File Offline HTML Export**: Download the entire interactive studio as a single self-contained `.html` file.

## Run Locally
```bash
npm install
npm run dev
```

## Build for Production
```bash
npm run build
npm run preview
```

## Deploy to GitHub Pages
This repository includes `.github/workflows/deploy.yml` and relative asset paths (`base: './'`) out of the box:
1. Push this repository to GitHub on the `main` branch.
2. Open **Settings → Pages** in your GitHub repository.
3. Under **Build and deployment → Source**, select **GitHub Actions**.
4. Your site will build and deploy automatically on every push to `main`.
