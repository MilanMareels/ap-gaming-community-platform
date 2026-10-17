import type { ReactNode } from 'react';

/*
 * Building blocks for the generated link-preview cards (rendered by Satori, not the browser):
 * only flexbox layout, and every element with more than one child needs `display: flex`.
 */

export const WIDTH = 1200;
export const HEIGHT = 630;
const PHOTO_WIDTH = 440;

export const colors = {
  bg: '#020618',
  panel: '#0a0f25',
  border: 'rgba(255,255,255,0.12)',
  brand: '#d42422',
  text: '#ffffff',
  muted: '#9ca3af',
  green: '#22c55e',
  gold: '#facc15',
  silver: '#d1d5db',
  bronze: '#d97706',
};

const upper = (value: string) => value.toLocaleUpperCase('nl-BE');

export function clampText(value: string, max: number): string {
  const clean = value.replace(/\s+/g, ' ').trim();
  return clean.length > max ? `${clean.slice(0, max - 1).trimEnd()}…` : clean;
}

function titleSize(title: string, compact: boolean): number {
  const len = title.length;
  const size = len <= 18 ? 84 : len <= 32 ? 72 : len <= 56 ? 58 : 48;
  return compact ? Math.round(size * 0.82) : size;
}

function GamepadIcon({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={colors.brand}
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="6" x2="10" y1="11" y2="11" />
      <line x1="8" x2="8" y1="9" y2="13" />
      <line x1="15" x2="15.01" y1="12" y2="12" />
      <line x1="18" x2="18.01" y1="10" y2="10" />
      <path d="M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z" />
    </svg>
  );
}

export function TrophyIcon({ size = 40, color = colors.gold }: { size?: number; color?: string }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6" />
      <path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18" />
      <path d="M4 22h16" />
      <path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22" />
      <path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22" />
      <path d="M18 2H6v7a6 6 0 0 0 12 0V2Z" />
    </svg>
  );
}

interface FrameProps {
  host: string;
  title: string;
  eyebrow?: string;
  /** Data URI of a photo shown as a faded panel on the right. */
  photo?: string;
  children?: ReactNode;
}

export function Frame({ host, title, eyebrow, photo, children }: FrameProps) {
  const contentWidth = photo ? WIDTH - PHOTO_WIDTH - 64 : WIDTH - 128;

  return (
    <div
      style={{
        width: WIDTH,
        height: HEIGHT,
        display: 'flex',
        flexDirection: 'column',
        padding: '52px 64px 48px',
        position: 'relative',
        backgroundColor: colors.bg,
        backgroundImage:
          'radial-gradient(circle at 92% 0%, rgba(212,36,34,0.5), rgba(212,36,34,0) 50%), radial-gradient(circle at 0% 100%, rgba(212,36,34,0.2), rgba(212,36,34,0) 45%)',
        color: colors.text,
        fontFamily: 'Inter',
      }}
    >
      {photo && (
        // eslint-disable-next-line @next/next/no-img-element -- rendered by Satori, not the browser
        <img src={photo} width={PHOTO_WIDTH} height={HEIGHT} style={{ position: 'absolute', top: 0, right: 0, objectFit: 'cover' }} alt="" />
      )}
      {photo && (
        <div
          style={{
            position: 'absolute',
            top: 0,
            right: 0,
            width: PHOTO_WIDTH,
            height: HEIGHT,
            backgroundImage: 'linear-gradient(90deg, #020618 0%, rgba(2,6,24,0.55) 30%, rgba(2,6,24,0.05) 100%)',
          }}
        />
      )}

      <div style={{ display: 'flex', alignItems: 'center', fontSize: 34, fontWeight: 800, letterSpacing: -1 }}>
        <GamepadIcon />
        <span style={{ marginLeft: 14 }}>AP</span>
        <span style={{ marginLeft: 10, color: colors.brand }}>Gaming</span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', flexGrow: 1, width: contentWidth }}>
        {eyebrow && (
          <div style={{ display: 'flex', fontSize: 26, fontWeight: 800, color: colors.brand, letterSpacing: 2, marginBottom: 14 }}>
            {upper(eyebrow)}
          </div>
        )}
        <div style={{ display: 'flex', fontSize: titleSize(title, Boolean(children)), fontWeight: 800, lineHeight: 1.05, letterSpacing: -2 }}>
          {clampText(title, 80)}
        </div>
        {children && <div style={{ display: 'flex', flexDirection: 'column', marginTop: 32 }}>{children}</div>}
      </div>

      <div style={{ display: 'flex', fontSize: 22, fontWeight: 500, color: colors.muted }}>
        <span style={{ color: colors.text }}>{host}</span>
        <span style={{ marginLeft: 8 }}>· AP Hogeschool Antwerpen · Campus Ellermanstraat</span>
      </div>
    </div>
  );
}

/** Vertical group. Use instead of fragments: Satori lays fragment children out as a row. */
export function Stack({ children, gap = 0 }: { children: ReactNode; gap?: number }) {
  return <div style={{ display: 'flex', flexDirection: 'column', gap }}>{children}</div>;
}

export function Row({ children, gap = 16 }: { children: ReactNode; gap?: number }) {
  return <div style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap }}>{children}</div>;
}

export function Chip({ children, tone = 'default' }: { children: ReactNode; tone?: 'default' | 'brand' | 'green' }) {
  const toneColor = tone === 'brand' ? colors.brand : tone === 'green' ? colors.green : colors.text;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '10px 20px',
        borderRadius: 999,
        border: `2px solid ${tone === 'default' ? colors.border : toneColor}`,
        backgroundColor: tone === 'default' ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.25)',
        color: toneColor,
        fontSize: 24,
        fontWeight: 800,
      }}
    >
      {children}
    </div>
  );
}

export function Stat({ value, label }: { value: string | number; label: string }) {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        padding: '18px 26px',
        minWidth: 170,
        borderRadius: 20,
        border: `2px solid ${colors.border}`,
        backgroundColor: 'rgba(10,15,37,0.85)',
      }}
    >
      <div style={{ display: 'flex', fontSize: 52, fontWeight: 800, letterSpacing: -1, lineHeight: 1 }}>{String(value)}</div>
      <div style={{ display: 'flex', fontSize: 20, fontWeight: 500, color: colors.muted, marginTop: 8 }}>{label}</div>
    </div>
  );
}

const TIME_ZONE = 'Europe/Brussels';
const part = (date: Date, opts: Intl.DateTimeFormatOptions) => date.toLocaleDateString('nl-BE', { timeZone: TIME_ZONE, ...opts });

/** Calendar-style date block, e.g. NOV / 14 / ZATERDAG. */
export function DateTile({ date, size = 'large' }: { date: string; size?: 'large' | 'small' }) {
  const d = new Date(date);
  const large = size === 'large';
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        width: large ? 150 : 96,
        borderRadius: large ? 22 : 16,
        overflow: 'hidden',
        border: `2px solid ${colors.border}`,
        backgroundColor: colors.panel,
      }}
    >
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          width: '100%',
          padding: large ? '8px 0' : '4px 0',
          backgroundColor: colors.brand,
          fontSize: large ? 24 : 18,
          fontWeight: 800,
          letterSpacing: 2,
        }}
      >
        {upper(part(d, { month: 'short' }).replace('.', ''))}
      </div>
      <div style={{ display: 'flex', fontSize: large ? 72 : 44, fontWeight: 800, lineHeight: 1.1, letterSpacing: -2 }}>
        {part(d, { day: 'numeric' })}
      </div>
      {large && (
        <div style={{ display: 'flex', fontSize: 18, fontWeight: 800, color: colors.muted, letterSpacing: 1, marginBottom: 12 }}>
          {upper(part(d, { weekday: 'long' }))}
        </div>
      )}
    </div>
  );
}

const MEDALS = [colors.gold, colors.silver, colors.bronze];

/** Leaderboard row with a medal-coloured rank. */
export function RankRow({ rank, name, value }: { rank: number; name: string; value: string }) {
  const medal = MEDALS[rank - 1] ?? colors.muted;
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        padding: '9px 22px',
        marginBottom: 10,
        borderRadius: 18,
        border: `2px solid ${rank === 1 ? 'rgba(250,204,21,0.45)' : colors.border}`,
        backgroundColor: 'rgba(10,15,37,0.85)',
        fontSize: 30,
        fontWeight: 800,
      }}
    >
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 48,
          height: 48,
          borderRadius: 999,
          backgroundColor: medal,
          color: colors.bg,
          fontSize: 26,
        }}
      >
        {String(rank)}
      </div>
      <div style={{ display: 'flex', flexGrow: 1, marginLeft: 20 }}>{clampText(name, 28)}</div>
      <div style={{ display: 'flex', marginLeft: 24, color: rank === 1 ? colors.gold : colors.text }}>{value}</div>
    </div>
  );
}

export function Muted({ children, size = 26 }: { children: ReactNode; size?: number }) {
  return <div style={{ display: 'flex', fontSize: size, fontWeight: 500, color: colors.muted, lineHeight: 1.35 }}>{children}</div>;
}
