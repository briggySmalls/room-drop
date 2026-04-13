function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function optional(name: string): string | undefined {
  return process.env[name] || undefined;
}

export function validateEnv() {
  required("NEXT_PUBLIC_SUPABASE_URL");
  required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  required("SERPAPI_KEY");
  required("ANTHROPIC_API_KEY");
  required("RESEND_API_KEY");
  required("RESEND_FROM_EMAIL");
}

export const env = {
  get supabaseUrl() {
    return required("NEXT_PUBLIC_SUPABASE_URL");
  },
  get supabaseAnonKey() {
    return required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
  },
  get serpApiKey() {
    return required("SERPAPI_KEY");
  },
  get anthropicApiKey() {
    return required("ANTHROPIC_API_KEY");
  },
  get resendApiKey() {
    return required("RESEND_API_KEY");
  },
  get resendFromEmail() {
    return required("RESEND_FROM_EMAIL");
  },
  get supabaseServiceRoleKey() {
    return required("SUPABASE_SERVICE_ROLE_KEY");
  },
  get cronSecret() {
    return optional("CRON_SECRET");
  },
};
