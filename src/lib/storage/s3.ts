import { AwsClient } from "aws4fetch";

export interface S3Object {
  key: string;
  size: number;
}

function config() {
  const { S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY } = process.env;
  if (!S3_ENDPOINT || !S3_BUCKET || !S3_ACCESS_KEY_ID || !S3_SECRET_ACCESS_KEY) {
    throw new Error("S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID and S3_SECRET_ACCESS_KEY must all be set");
  }
  const client = new AwsClient({
    accessKeyId: S3_ACCESS_KEY_ID,
    secretAccessKey: S3_SECRET_ACCESS_KEY,
    service: "s3",
    region: process.env.S3_REGION || "auto",
  });
  return { client, base: `${S3_ENDPOINT.replace(/\/$/, "")}/${S3_BUCKET}` };
}

export function s3Prefix(): string {
  const p = process.env.S3_PREFIX ?? "roms/";
  return p && !p.endsWith("/") ? `${p}/` : p;
}

const encodeKey = (key: string) => key.split("/").map(encodeURIComponent).join("/");

const unescapeXml = (s: string) =>
  s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, "&");

export async function listS3(prefix: string): Promise<S3Object[]> {
  const { client, base } = config();
  const objects: S3Object[] = [];
  let token: string | undefined;
  do {
    const params = new URLSearchParams({ "list-type": "2", prefix });
    if (token) params.set("continuation-token", token);
    const res = await client.fetch(`${base}?${params}`);
    if (!res.ok) throw new Error(`Bucket listing failed with ${res.status}`);
    const xml = await res.text();
    for (const block of xml.match(/<Contents>[\s\S]*?<\/Contents>/g) ?? []) {
      const key = unescapeXml(block.match(/<Key>([\s\S]*?)<\/Key>/)?.[1] ?? "");
      const size = Number(block.match(/<Size>(\d+)<\/Size>/)?.[1] ?? 0);
      if (key && !key.endsWith("/")) objects.push({ key, size });
    }
    token = /<IsTruncated>true<\/IsTruncated>/.test(xml)
      ? unescapeXml(xml.match(/<NextContinuationToken>([\s\S]*?)<\/NextContinuationToken>/)?.[1] ?? "")
      : undefined;
  } while (token);
  return objects;
}

export async function s3DownloadUrl(key: string): Promise<string> {
  const publicBase = process.env.S3_PUBLIC_BASE_URL;
  if (publicBase) return `${publicBase.replace(/\/$/, "")}/${encodeKey(key)}`;
  const { client, base } = config();
  const signed = await client.sign(`${base}/${encodeKey(key)}?X-Amz-Expires=3600`, {
    aws: { signQuery: true },
  });
  return signed.url;
}
