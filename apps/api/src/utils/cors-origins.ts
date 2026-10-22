/**
 * Origins allowed to make credentialed cross-origin requests. CORS_ORIGINS
 * replaces the KANEO_CLIENT_URL default entirely, so it must repeat the web
 * origin alongside any extra ones, such as the Capacitor shells'
 * capacitor://localhost (iOS) and https://localhost (Android).
 */
export function getConfiguredCorsOrigins(): string[] | undefined {
  const source = [process.env.CORS_ORIGINS, process.env.KANEO_CLIENT_URL].find(
    (value) => value?.trim(),
  );
  return source
    ?.split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);
}
