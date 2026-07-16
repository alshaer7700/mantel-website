/// <reference types="vite/client" />

// Vite serves any-case image extensions as asset URLs; vite/client only
// declares the lowercase ones, so cover the uppercase .PNG logo import.
declare module "*.PNG" {
  const src: string;
  export default src;
}
