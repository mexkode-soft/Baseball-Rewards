const hasUrl = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL
);

const hasAnonKey = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

const hasPublishableKey = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
);

console.log("Configuración Supabase para el build:", {
  hasUrl,
  hasAnonKey,
  hasPublishableKey,
});

if (
  !hasUrl ||
  (!hasAnonKey && !hasPublishableKey)
) {
  throw new Error(
    "Vercel no recibió las variables públicas de Supabase."
  );
}