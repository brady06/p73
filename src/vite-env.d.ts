/// <reference types="vite/client" />

interface ImportMetaEnv {
  /**
   * Optional API origin (no trailing slash). Leave unset on Netlify so requests use the same site:
   * `/.netlify/functions/bias-score`. Set only if the frontend is hosted separately from the API.
   */
  readonly VITE_API_BASE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
