// Same-origin proxy for cover images, so WebGL can use them as textures
// (Drive thumbnails don't send CORS headers). Only known image hosts are allowed.
//
// The image URL is base64url-encoded into the path (/api/art/<encoded>), not a
// query string: Netlify's CDN leaves query strings out of its cache key, so
// ?u=… made every cover share one cached image.

const ALLOWED_HOSTS = new Set([
  "raw.githubusercontent.com", // libretro-thumbnails
  "drive.google.com", // your own covers in Drive (thumbnail endpoint)
  "lh3.googleusercontent.com", // where Drive thumbnails redirect
]);

export async function GET(_req: Request, ctx: { params: Promise<{ src: string }> }) {
  const { src } = await ctx.params;
  let url: URL;
  try {
    url = new URL(Buffer.from(src, "base64url").toString());
  } catch {
    return new Response("Missing or invalid image URL.", { status: 400 });
  }
  if (url.protocol !== "https:" || !ALLOWED_HOSTS.has(url.hostname)) {
    return new Response("That image host isn't allowed.", { status: 403 });
  }

  const upstream = await fetch(url, { redirect: "follow" });
  const type = upstream.headers.get("content-type") ?? "";
  if (!upstream.ok || !type.startsWith("image/")) {
    return new Response("Image not found.", { status: 404, headers: { "cache-control": "public, max-age=3600" } });
  }
  return new Response(upstream.body, {
    headers: {
      "content-type": type,
      "cache-control": "public, max-age=86400, s-maxage=604800",
    },
  });
}
