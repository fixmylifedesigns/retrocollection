const API = "https://www.googleapis.com/drive/v3";

export interface DriveFile {
  id: string;
  name: string;
  size?: string;
  parents?: string[];
}

function apiKey(): string {
  const key = process.env.GOOGLE_DRIVE_API_KEY;
  if (!key) throw new Error("GOOGLE_DRIVE_API_KEY is not set");
  return key;
}

export async function listDriveFolder(folderId: string): Promise<DriveFile[]> {
  const files: DriveFile[] = [];
  let pageToken: string | undefined;
  do {
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and trashed = false and mimeType != 'application/vnd.google-apps.folder'`,
      fields: "nextPageToken, files(id, name, size)",
      pageSize: "1000",
      key: apiKey(),
    });
    if (pageToken) params.set("pageToken", pageToken);
    const res = await fetch(`${API}/files?${params}`, { next: { revalidate: 300 } });
    if (!res.ok) throw new Error(`Google Drive returned ${res.status} for folder ${folderId}`);
    const data = (await res.json()) as { files: DriveFile[]; nextPageToken?: string };
    files.push(...data.files);
    pageToken = data.nextPageToken;
  } while (pageToken);
  return files;
}

export async function getDriveFileMeta(fileId: string): Promise<DriveFile | null> {
  const params = new URLSearchParams({ fields: "id, name, size, parents", key: apiKey() });
  const res = await fetch(`${API}/files/${encodeURIComponent(fileId)}?${params}`, { cache: "no-store" });
  return res.ok ? ((await res.json()) as DriveFile) : null;
}

export function fetchDriveFile(fileId: string, range: string | null): Promise<Response> {
  const params = new URLSearchParams({ alt: "media", key: apiKey() });
  return fetch(`${API}/files/${encodeURIComponent(fileId)}?${params}`, {
    headers: range ? { range } : undefined,
    cache: "no-store",
  });
}
