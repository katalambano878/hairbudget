/** Bump when replacing files in /public so Next.js image cache refreshes. */
export const PUBLIC_ASSET_VERSION = '20260918c';

export function publicAsset(path: string): string {
  if (!path.startsWith('/')) return path;
  const sep = path.includes('?') ? '&' : '?';
  return `${path}${sep}v=${PUBLIC_ASSET_VERSION}`;
}
