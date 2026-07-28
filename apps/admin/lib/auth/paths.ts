export function isSafeInternalPath(path: string | null) {
  return Boolean(path && path.startsWith("/") && !path.startsWith("//"));
}

export function buildSignInPath(nextPath?: string) {
  const target = isSafeInternalPath(nextPath ?? null) ? (nextPath as string) : "/admin";
  const params = new URLSearchParams({ next: target });
  return `/sign-in?${params.toString()}`;
}
