export function getRequestOrigin(request: Request) {
  const configuredSite = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configuredSite) {
    try {
      return new URL(configuredSite).origin;
    } catch {
      // Fall back to trusted proxy headers for local or incomplete deployments.
    }
  }

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host");
  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol = forwardedProtocol === "http" || forwardedProtocol === "https"
    ? forwardedProtocol
    : host?.startsWith("localhost")
      ? "http"
      : "https";

  return host ? `${protocol}://${host}` : new URL(request.url).origin;
}
