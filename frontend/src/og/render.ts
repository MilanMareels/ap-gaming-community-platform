import type { ReactElement } from 'react';
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { ImageResponse } from 'next/og';
import { HEIGHT, WIDTH } from './frame';

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

/** Pre-cropped 440×630 panels from public/og-assets, as data URIs. */
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

/** JPEG keeps photo cards around 100 KB instead of ~600 KB (WhatsApp drops large previews). */
async function encode(png: ArrayBuffer): Promise<Image> {
  try {
    const { default: sharp } = await import('sharp');
    const jpeg = await sharp(Buffer.from(png)).jpeg({ quality: 86, mozjpeg: true, chromaSubsampling: '4:4:4' }).toBuffer();
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
      const image = await encode(await new ImageResponse(tree, { width: WIDTH, height: HEIGHT, fonts: fonts ?? undefined }).arrayBuffer());
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
