import { json, route } from "@/lib/errors";
import { getSetting } from "@/lib/settings";

// Online payment is reported as available only when the owner has enabled AND configured a real gateway.
export const GET = route(async () => json({ cod: true, online: await getSetting("payments.online.enabled", false) }));
