import { connection } from "next/server";
import { createListCafes } from "@/composition/cafes";

// next dev has no native Worker entrypoint. Production requests use worker/fast-path.mjs.
export async function GET() {
  await connection();
  const cafes = await createListCafes().execute();
  return Response.json({ cafes }, { headers: { "Cache-Control": "private, no-store, max-age=0" } });
}
