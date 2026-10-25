import { livingView } from "@/lib/living/service";
import { json } from "@/lib/store";
export const dynamic = "force-dynamic";
export async function GET() {
  return json(await livingView());
}
