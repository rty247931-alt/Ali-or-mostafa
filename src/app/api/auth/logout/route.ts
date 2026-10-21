import { json, route } from "@/lib/errors";
import { destroySession } from "@/lib/session";

export const POST = route(async () => {
  destroySession();
  return json({ ok: true });
});
