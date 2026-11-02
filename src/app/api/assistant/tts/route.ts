import { z } from "zod";
import { rateLimit } from "@/lib/ratelimit";

const schema = z.object({ text: z.string().trim().min(1).max(1800) });
const VOICE_ID = "I3u6waC588j43py1kDN2";

export async function POST(req: Request) {
  try {
    rateLimit(req, "assistant-tts", 20, 60);
    const parsed = schema.safeParse(await req.json());
    if (!parsed.success) return Response.json({ error: "النص غير صالح." }, { status: 400 });
    const apiKey = process.env.ELEVENLABS_API_KEY;
    if (!apiKey) return Response.json({ error: "صوت ElevenLabs يحتاج إضافة ELEVENLABS_API_KEY في إعدادات Vercel." }, { status: 503 });
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${VOICE_ID}?output_format=mp3_44100_128`, {
      method: "POST",
      headers: { "xi-api-key": apiKey, "content-type": "application/json", accept: "audio/mpeg" },
      body: JSON.stringify({
        text: parsed.data.text,
        model_id: "eleven_multilingual_v2",
        language_code: "ar",
        voice_settings: { stability: 0.5, similarity_boost: 0.8, style: 0.2, use_speaker_boost: true }
      }),
      signal: AbortSignal.timeout(30000)
    });
    if (!response.ok) {
      const detail = await response.text();
      console.error("ElevenLabs TTS error", response.status, detail.slice(0, 500));
      return Response.json({ error: "تعذر توليد الصوت من ElevenLabs. راجع المفتاح أو صلاحية الصوت." }, { status: 502 });
    }
    return new Response(response.body, { headers: { "content-type": "audio/mpeg", "cache-control": "no-store" } });
  } catch (error) {
    console.error("Assistant TTS failed", error);
    return Response.json({ error: "حصل خطأ أثناء تجهيز الصوت." }, { status: 500 });
  }
}
