import { ImageResponse } from "next/og";
import { getSetting } from "@/lib/settings";

export const runtime = "edge";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const requested = Number(url.searchParams.get("size") || 512);
  const size = requested === 192 ? 192 : 512;
  const logo = await getSetting<string>("store.logo", "");

  return new ImageResponse(
    (
      <div style={{
        width: "100%",
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        borderRadius: "50%",
        background: "#263b2b",
        border: `${Math.round(size * 0.035)}px solid #e9dfcc`,
      }}>
        {logo ? (
          <div style={{
            width: "78%",
            height: "78%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            overflow: "hidden",
            borderRadius: "50%",
            background: "#ffffff",
          }}>
            <img
              src={logo}
              width={Math.round(size * 0.72)}
              height={Math.round(size * 0.72)}
              style={{ objectFit: "contain", borderRadius: "50%" }}
            />
          </div>
        ) : (
          <div style={{ color: "#f7f5f0", fontSize: Math.round(size * 0.48), fontWeight: 800 }}>
            خ
          </div>
        )}
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "no-store, max-age=0" } }
  );
}
