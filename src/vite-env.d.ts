/// <reference types="vite/client" />

interface ImportMetaEnv extends ImportMetaEnvSupabase {
  readonly PROD: boolean;
}
interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface ImportMetaEnvSupabase {
  readonly VITE_SUPABASE_URL?: string;
  readonly VITE_SUPABASE_PUBLISHABLE_KEY?: string;
}
