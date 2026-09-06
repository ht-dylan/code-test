import { resolve } from '$app/paths';

const resolvePath = resolve as (path: `/${string}`) => string;

export function appPath(path: string): string {
  const normalized = (path.startsWith('/') ? path : `/${path}`) as `/${string}`;
  return resolvePath(normalized);
}

export function withoutBase(pathname: string): string {
  const home = resolve('/');
  const prefix = home === '/' ? '' : home.replace(/\/$/, '');

  if (prefix && (pathname === prefix || pathname.startsWith(`${prefix}/`))) {
    const stripped = pathname.slice(prefix.length);
    return stripped === '' ? '/' : stripped;
  }

  return pathname;
}
