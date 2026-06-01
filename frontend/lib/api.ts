const DEFAULT_API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";

export function apiUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const baseUrl = DEFAULT_API_BASE_URL || window.location.origin;

  return `${baseUrl}${normalizedPath}`;
}