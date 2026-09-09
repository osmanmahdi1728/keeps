import { draftSiteCopy } from "@/lib/site";

export function isSiteAiConfigured(): boolean {
  return Boolean(process.env.OPENAI_API_KEY);
}

export async function polishSiteCopy(input: {
  name: string;
  kind: string;
  neighborhood: string;
  hours: string;
  knownFor: string;
  rewardLabel: string;
  stampsRequired: number;
}): Promise<{ tagline: string; about: string; usedAi: boolean }> {
  const fallback = draftSiteCopy(input);
  const key = process.env.OPENAI_API_KEY;
  if (!key) {
    return { ...fallback, usedAi: false };
  }

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: process.env.OPENAI_MODEL || "gpt-4o-mini",
      temperature: 0.6,
      messages: [
        {
          role: "system",
          content:
            "Write short bilingual-friendly English copy for an independent Montreal shop. Return JSON only: {\"tagline\":\"...\",\"about\":\"...\"}. Tagline max 12 words. About max 60 words. No hashtags.",
        },
        {
          role: "user",
          content: JSON.stringify(input),
        },
      ],
    }),
  });

  if (!response.ok) {
    return { ...fallback, usedAi: false };
  }

  const payload = (await response.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const raw = payload.choices?.[0]?.message?.content ?? "";
  const jsonText = raw.replace(/^```json\s*|\s*```$/g, "").trim();
  try {
    const parsed = JSON.parse(jsonText) as { tagline?: string; about?: string };
    return {
      tagline: parsed.tagline?.trim() || fallback.tagline,
      about: parsed.about?.trim() || fallback.about,
      usedAi: true,
    };
  } catch {
    return { ...fallback, usedAi: false };
  }
}
