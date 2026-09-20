/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_USE_CACHE?: string;
  readonly VITE_ALLOW_OPTIMIZE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
