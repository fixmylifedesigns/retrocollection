// Same-origin proxy for cover images, so WebGL can use them as textures
// (Drive thumbnails don't send CORS headers). Only known image hosts are allowed.

const ALLOWED_HOSTS = new Set([
  "raw.githubusercontent.com", // libretro-thumbnails
  "drive.google.com", // your own covers in Drive (thumbnail endpoint)
  "lh3.googleusercontent.com", // where Drive thumbnails redirect
]);

export async function GET(req: Request) {
  const target = new URL(req.url).searchParams.get("u");
  let url: URL;
  try {
    url = new URL(target ?? "");
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
