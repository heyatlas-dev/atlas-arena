export interface ReleaseInfo {
  tagName: string;
  name: string;
  body: string;
  downloadUrl: string;
  publishedAt: string;
}

export const CURRENT_APP_VERSION = '1.2.0';

export async function checkForAppUpdates(): Promise<ReleaseInfo | null> {
  try {
    const res = await fetch('https://api.github.com/repos/heyatlas-dev/atlas-arena/releases/latest', {
      headers: {
        Accept: 'application/vnd.github.v3+json',
      },
    });

    if (!res.ok) return null;

    const data = await res.json();
    const latestTag = (data.tag_name || '').replace(/^v/, '');

    // Compare versions (semver: 1.1.0 vs 1.2.0)
    if (isNewerVersion(latestTag, CURRENT_APP_VERSION)) {
      const apkAsset = (data.assets || []).find(
        (a: any) => a.name.endsWith('.apk')
      );

      return {
        tagName: data.tag_name,
        name: data.name || data.tag_name,
        body: data.body || '',
        downloadUrl: apkAsset?.browser_download_url || data.html_url,
        publishedAt: data.published_at,
      };
    }

    return null;
  } catch (e) {
    // Fail silently if offline
    return null;
  }
}

function isNewerVersion(remote: string, current: string): boolean {
  if (!remote || !current) return false;
  const rParts = remote.split('.').map(Number);
  const cParts = current.split('.').map(Number);

  for (let i = 0; i < Math.max(rParts.length, cParts.length); i++) {
    const r = rParts[i] || 0;
    const c = cParts[i] || 0;
    if (r > c) return true;
    if (r < c) return false;
  }
  return false;
}
