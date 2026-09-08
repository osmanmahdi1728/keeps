type Rgb = { r: number; g: number; b: number };

function toHex({ r, g, b }: Rgb): string {
  return `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`;
}

function luminance({ r, g, b }: Rgb): number {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255;
}

function saturation({ r, g, b }: Rgb): number {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  return max === 0 ? 0 : (max - min) / max;
}

export async function paletteFromImage(file: File): Promise<{
  primaryColor: string;
  backgroundColor: string;
  accentColor: string;
  gradientEnd: string;
}> {
  const bitmap = await createImageBitmap(file);
  const canvas = document.createElement("canvas");
  const size = 64;
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    throw new Error("Could not read colors from that image.");
  }
  ctx.drawImage(bitmap, 0, 0, size, size);
  const { data } = ctx.getImageData(0, 0, size, size);
  const buckets = new Map<string, { count: number; color: Rgb }>();

  for (let i = 0; i < data.length; i += 4) {
    const alpha = data[i + 3];
    if (alpha < 80) {
      continue;
    }
    const color = {
      r: Math.round(data[i] / 24) * 24,
      g: Math.round(data[i + 1] / 24) * 24,
      b: Math.round(data[i + 2] / 24) * 24,
    };
    const key = toHex(color);
    const current = buckets.get(key);
    if (current) {
      current.count += 1;
    } else {
      buckets.set(key, { count: 1, color });
    }
  }

  const ranked = [...buckets.values()].sort((a, b) => b.count - a.count);
  const light = ranked.find((item) => luminance(item.color) > 0.72)?.color;
  const dark = ranked.find((item) => luminance(item.color) < 0.35)?.color;
  const punch = ranked.find((item) => saturation(item.color) > 0.28)?.color;
  const mid = ranked[0]?.color ?? { r: 244, g: 239, b: 230 };

  const background = light ?? { r: 244, g: 239, b: 230 };
  const primary = dark ?? { r: 28, g: 25, b: 20 };
  const accent = punch ?? { r: 196, g: 92, b: 38 };
  const gradient = {
    r: Math.round((background.r + accent.r) / 2),
    g: Math.round((background.g + accent.g) / 2),
    b: Math.round((background.b + accent.b) / 2),
  };

  return {
    primaryColor: toHex(primary),
    backgroundColor: toHex(background),
    accentColor: toHex(accent),
    gradientEnd: toHex(gradient),
  };
}
