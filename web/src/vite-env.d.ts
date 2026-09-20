/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_USE_CACHE?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

declare module "lottie-web/build/player/lottie_light" {
  import type { LottiePlayer } from "lottie-web";
  const lottie: LottiePlayer;
  export default lottie;
}
