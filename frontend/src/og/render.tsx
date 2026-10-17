import type { ReactElement } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { OG_IMAGE_SIZE } from '@/util/seo';
import { HEIGHT, WIDTH } from './frame';

/** Cards are laid out at 1200×630 and rasterised at OG_IMAGE_SIZE; text and shapes stay vector until then. */
const SCALE = OG_IMAGE_SIZE.width / WIDTH;

type Font = { name: string; data: ArrayBuffer; weight: 500 | 800; style: 'normal' };

let fontsPromise: Promise<Font[]> | null = null;

async function fetchInter(): Promise<Font[]> {
  const css = await fetch('https://fonts.googleapis.com/css2?family=Inter:wght@500;800', {
    signal: AbortSignal.timeout(3000),
    cache: 'no-store',
  }).then((res) => (res.ok ? res.text() : Promise.reject(new Error(`Font CSS ${res.status}`))));

  const faces = [...css.matchAll(/font-weight: (\d+);\s*src: url\((.+?)\) format\('(?:truetype|opentype)'\)/g)];
  if (faces.length < 2) throw new Error('Unexpected font CSS');

  return Promise.all(
    faces.map(async ([, weight, url]) => ({
      name: 'Inter',
      weight: Number(weight) as Font['weight'],
      style: 'normal' as const,
      data: await fetch(url, { signal: AbortSignal.timeout(5000), cache: 'no-store' }).then((res) => res.arrayBuffer()),
    })),
  );
}

/** Inter from Google Fonts, fetched once per process. Null when unreachable (the bundled default font is used). */
async function loadFonts(): Promise<Font[] | null> {
  fontsPromise ??= fetchInter();
  try {
    return await fontsPromise;
  } catch {
    fontsPromise = null;
    return null;
  }
}

export type Photo = 'hub' | 'lounge' | 'setup' | 'play';
const photos = new Map<Photo, Promise<string>>();

/** Pre-cropped panels from public/og-assets (2× the 440×630 layout size), as data URIs. */
export function photo(name: Photo): Promise<string> {
  let uri = photos.get(name);
  if (!uri) {
    uri = readFile(join(process.cwd(), 'public', 'og-assets', `${name}.jpg`)).then((buf) => `data:image/jpeg;base64,${buf.toString('base64')}`);
    uri.catch(() => photos.delete(name));
    photos.set(name, uri);
  }
  return uri;
}

interface Image {
  body: Uint8Array<ArrayBuffer>;
  type: 'image/jpeg' | 'image/png';
}

/** WhatsApp only shows large previews for images up to roughly 300 KB. */
const MAX_IMAGE_BYTES = 280_000;

/** JPEG keeps 2× photo cards within that budget (PNG would be ~2 MB). */
async function encode(png: ArrayBuffer): Promise<Image> {
  try {
    const { default: sharp } = await import('sharp');
    const input = sharp(Buffer.from(png));
    // Step quality down only for detailed (photo) cards that would exceed the size budget
    let jpeg: Buffer = Buffer.alloc(0);
    for (const quality of [90, 85, 80, 75]) {
      jpeg = await input.clone().jpeg({ quality, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
      if (jpeg.length <= MAX_IMAGE_BYTES) break;
    }
    return { body: new Uint8Array(jpeg), type: 'image/jpeg' };
  } catch {
    return { body: new Uint8Array(png), type: 'image/png' };
  }
}

const MAX_CACHED = 150;
const rendered = new Map<string, Image>();
const inFlight = new Map<string, Promise<Image & { complete: boolean }>>();

/**
 * Renders a card, memoised by `key` (path + data version). Renders made without the brand
 * font are served but not cached, so they get replaced once the font loads.
 */
export async function renderCard(key: string, element: () => Promise<ReactElement>): Promise<Image & { complete: boolean }> {
  const hit = rendered.get(key);
  if (hit) {
    rendered.delete(key);
    rendered.set(key, hit);
    return { ...hit, complete: true };
  }

  let job = inFlight.get(key);
  if (!job) {
    job = (async () => {
      const [fonts, tree] = await Promise.all([loadFonts(), element()]);
      const scaled = (
        <div style={{ display: 'flex', width: WIDTH * SCALE, height: HEIGHT * SCALE }}>
          <div style={{ display: 'flex', width: WIDTH, height: HEIGHT, transform: `scale(${SCALE})`, transformOrigin: 'top left' }}>{tree}</div>
        </div>
      );
      const response = new ImageResponse(scaled, { ...OG_IMAGE_SIZE, fonts: fonts ?? undefined });
      const image = await encode(await response.arrayBuffer());
      if (fonts) {
        rendered.set(key, image);
        if (rendered.size > MAX_CACHED) rendered.delete(rendered.keys().next().value!);
      }
      return { ...image, complete: Boolean(fonts) };
    })().finally(() => inFlight.delete(key));
    inFlight.set(key, job);
  }
  return job;
}
