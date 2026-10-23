import { json, route } from "@/lib/errors";
import { getSettings, getSetting } from "@/lib/settings";

export const GET = route(async () => {
  const [online, wallet] = await Promise.all([
    getSetting("payments.online.enabled", false),
    getSetting("payments.wallet.enabled", false),
  ]);
  const values = await getSettings(["payments.wallet.vodafone", "payments.wallet.orange", "payments.wallet.etisalat", "payments.wallet.instructions"]);
  const wallets = {
    vodafone: typeof values["payments.wallet.vodafone"] === "string" ? values["payments.wallet.vodafone"] : "",
    orange: typeof values["payments.wallet.orange"] === "string" ? values["payments.wallet.orange"] : "",
    etisalat: typeof values["payments.wallet.etisalat"] === "string" ? values["payments.wallet.etisalat"] : "",
  };
  return json({ cod: true, online, wallet: wallet && Object.values(wallets).some(Boolean), wallets: wallet ? wallets : {}, instructions: wallet ? String(values["payments.wallet.instructions"] ?? "") : "" });
});
