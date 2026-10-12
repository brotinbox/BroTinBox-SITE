/**
 * The admin portal lives in app/admin but is only reachable at the secret
 * /<ADMIN_PATH> prefix (proxy.ts rewrites it; direct /admin is a 404).
 */
export function adminPath(): string {
  const p = (process.env.ADMIN_PATH || '').replace(/^\/+|\/+$/g, '');
  if (!/^[a-z0-9-]{6,64}$/.test(p)) {
    throw new Error('ADMIN_PATH must be 6–64 chars of a-z, 0-9 or "-"');
  }
  return p;
}

/** Public URL for an admin route, e.g. adminHref('/customers') → /ops-xxxx/customers */
export function adminHref(route = ''): string {
  const r = route.startsWith('/') || route === '' ? route : `/${route}`;
  return `/${adminPath()}${r}`;
}
