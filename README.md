# Cognitive Bias Detector

A frontend-only skeleton for a “Cognitive Bias Detector” site: text analysis, bias score, and neutral position placeholders. Built with React, TypeScript, React Router, and React Bootstrap.

## What’s included

- **Text Analysis** (home): hero, textarea, “Analyze Text” button, and CTAs to Bias Score and Neutral Position.
- **Bias Score**: semicircle gauge and score display.
- **Neutral Position**: placeholder for a neutral rewrite.

No backend, API calls, auth, or persistence — UI only, ready to extend.

## Tech stack

- React 18 + TypeScript
- React Router (HashRouter for GitHub Pages)
- React Bootstrap + Bootstrap 5
- Vite

## Scripts

```bash
npm install
npm run dev      # start dev server (e.g. http://localhost:5173)
npm run build    # production build to dist/
npm run preview  # preview production build locally
npm run deploy   # build and push dist/ to gh-pages branch (see below)
```

---

## Deploying to GitHub Pages

Your app uses **HashRouter**, so routes work on GitHub Pages without any server config. Choose one of the two methods below.

### Option A: Deploy with GitHub Actions (recommended)

1. **Push your code to GitHub**  
   Create a repo (e.g. `Web-Project` or `cognitive-bias-detector`) and push this project.

2. **Turn on GitHub Pages**  
   - Open the repo on GitHub → **Settings** → **Pages**.  
   - Under **Build and deployment**, set **Source** to **GitHub Actions**.

3. **Deploy**  
   - Push to the `main` branch (or run the workflow manually: **Actions** → **Deploy to GitHub Pages** → **Run workflow**).  
   - The workflow builds the app with the correct base path and deploys to Pages.

4. **Open your site**  
   After the workflow finishes:  
   `https://<your-username>.github.io/<repo-name>/`  
   (e.g. `https://jane.github.io/Web-Project/`)

Routes use the hash: `https://.../Web-Project/#/bias-score`, etc.

---

### Option B: Deploy manually with the `deploy` script

1. **Create the repo on GitHub**  
   Note the repo name (e.g. `Web-Project`).

2. **Set the base path for production**  
   - Copy the example env file:
     ```bash
     cp .env.production.example .env.production
     ```
   - Edit `.env.production` and set `VITE_PUBLIC_PATH` to your repo path:
     ```
     VITE_PUBLIC_PATH=/Web-Project/
     ```
     Use your actual repo name. (No trailing slash after the repo name is required; the build adds it.)

3. **Install dependencies and deploy**  
   ```bash
   npm install
   npm run deploy
   ```
   This runs `npm run build` (using `.env.production` for the base path) and then pushes the `dist/` folder to the `gh-pages` branch with the `gh-pages` package.

4. **Enable Pages from the branch**  
   - On GitHub: **Settings** → **Pages**.  
   - Set **Source** to **Deploy from a branch**.  
   - Branch: **gh-pages** (or **main** if you use that for the built site).  
   - Folder: **/ (root)**.  
   - Save.

5. **Open your site**  
   `https://<your-username>.github.io/<repo-name>/`

---

### If the site loads but assets are broken (blank page, no styles)

The app must be built with the correct **base path**.  
- With **Option A**, the workflow sets `VITE_PUBLIC_PATH=/<repo-name>/` automatically.  
- With **Option B**, make sure `.env.production` has `VITE_PUBLIC_PATH=/YourRepoName/` and you run `npm run build` (or `npm run deploy`) after changing it.

---

## Project structure

```
src/
  components/
  pages/
  App.tsx
  main.tsx
  index.css
```

## License

MIT
