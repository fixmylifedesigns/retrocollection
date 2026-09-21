import { getLibrary } from "@/lib/library";

export const revalidate = 300;

export async function GET() {
  return Response.json(await getLibrary());
}
