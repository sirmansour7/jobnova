import { basename, join } from 'path';

/** Normalized storage key: `cv/<filename>` (multer filename only, no path segments). */
export function normalizeApplicationCvStorageKey(
  stored: string | null | undefined,
): string | null {
  if (!stored?.trim()) return null;
  const s = stored.trim();
  if (s.includes('..')) return null;

  if (s.startsWith('http://') || s.startsWith('https://')) {
    const m = s.match(/\/uploads\/cv\/([^?#]+)/);
    if (!m?.[1]) return null;
    return join('cv', basename(m[1])).replace(/\\/g, '/');
  }

  const name = basename(s);
  if (!name) return null;
  if (s.startsWith('cv/') || s.startsWith('cv\\')) {
    return `cv/${name}`;
  }
  return `cv/${name}`;
}

/** Absolute path under `uploads/cv/` for a valid storage key (basename only). */
export function absoluteCvFilePathFromStorageKey(storageKey: string): string {
  const name = basename(storageKey);
  return join(process.cwd(), 'uploads', 'cv', name);
}
