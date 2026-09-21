import { openRom } from "@/lib/library";

export const dynamic = "force-dynamic";

export async function GET(req: Request, ctx: { params: Promise<{ id: string }> }) {
  const { id } = await ctx.params;
  const rom = await openRom(id, req.headers.get("range"));
  if (!rom) return new Response("This game isn't in your library.", { status: 404 });

  if ("redirect" in rom) {
    return new Response(null, { status: 302, headers: { location: rom.redirect } });
  }

  const upstream = rom.stream;
  if (!upstream.ok) {
    return new Response(
      `Google Drive refused the download (HTTP ${upstream.status}). Check the folder is shared as "Anyone with the link".`,
      { status: 502 },
    );
  }
  const headers = new Headers({
    "content-type": "application/octet-stream",
    "cache-control": "private, max-age=3600",
  });
  for (const h of ["content-length", "content-range", "accept-ranges"]) {
    const v = upstream.headers.get(h);
    if (v) headers.set(h, v);
  }
  return new Response(upstream.body, { status: upstream.status, headers });
}
