import { getCurrentStaff } from "@/lib/auth";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const staff = await getCurrentStaff();
  if (!staff) return Response.json({ error: "Unauthorized" }, { status: 401 });
  const body = (await req.json()) as { dataUrl?: string };
  const dataUrl = body.dataUrl || "";
  if (!dataUrl.startsWith("data:image/")) {
    return Response.json({ error: "Only image data URLs are accepted" }, { status: 400 });
  }
  if (dataUrl.length > 2_500_000) {
    return Response.json({ error: "Image too large (max ~1.5MB)" }, { status: 400 });
  }
  return Response.json({ url: dataUrl });
}
