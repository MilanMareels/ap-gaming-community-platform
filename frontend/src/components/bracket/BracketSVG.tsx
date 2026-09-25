'use client';

import { useMemo, useState, useRef, useCallback } from 'react';
import { ArrowLeftRight } from 'lucide-react';
import type {
  BracketMatch,
  BracketMatchParticipant,
  BracketParticipant,
} from '@/api';

// --- Types ---

export interface BracketData {
  id: number;
  eventId: number;
  format: string;
  playersPerMatch: number;
  advancingPerMatch: number;
  thirdPlaceMatch: boolean;
  status: string;
  totalRounds: number;
  participants: (BracketParticipant & {
    user?: { id: number; name: string | null; email: string } | null;
  })[];
  matches: (BracketMatch & {
    participants: (BracketMatchParticipant & {
      participant: BracketParticipant | null;
    })[];
  })[];
}

export interface BracketSVGProps {
  bracket: BracketData;
  onMatchClick?: (matchId: number) => void;
  onSwapParticipants?: (participantAId: number, participantBId: number) => void;
  mode?: 'admin' | 'public' | 'kiosk';
  className?: string;
}

// --- Layout Constants ---

function getConfig(mode: 'admin' | 'public' | 'kiosk') {
  const base = {
    matchWidth: 228,
    seedWidth: 24,
    scoreWidth: 32,
    nameWidth: 140,
    playerHeight: 22,
    matchPadding: 2,
    roundGap: 300,
    identifierGap: 36,
    matchGapY: 16,
    fontSize: 12,
    seedFontSize: 10,
    identifierFontSize: 10,
    connectorOffset: 8,
    cornerRadius: 3,
    wrapperPadding: 2,
  };
  if (mode === 'kiosk') {
    return {
      ...base,
      matchWidth: 300,
      nameWidth: 192,
      playerHeight: 28,
      roundGap: 400,
      identifierGap: 44,
      matchGapY: 24,
      fontSize: 16,
      seedFontSize: 13,
      identifierFontSize: 13,
    };
  }
  return base;
}

// --- Helpers ---

function getMatchHeight(playersPerMatch: number, cfg: ReturnType<typeof getConfig>) {
  return cfg.playerHeight * playersPerMatch + cfg.wrapperPadding * 2;
}

// --- SVG Match Card ---

function MatchCard({
  match,
  x,
  y,
  matchIndex,
  cfg,
  playersPerMatch,
  onMatchClick,
  mode,
}: {
  match: BracketData['matches'][0];
  x: number;
  y: number;
  matchIndex: number;
  cfg: ReturnType<typeof getConfig>;
  playersPerMatch: number;
  onMatchClick?: (matchId: number) => void;
  mode: string;
}) {
  const matchHeight = getMatchHeight(playersPerMatch, cfg);
  const isClickable = mode === 'admin' && onMatchClick && match.status !== 'BYE';

  // Fill participant slots up to playersPerMatch
  const slots: (typeof match.participants)[0][] = [];
  for (let i = 0; i < playersPerMatch; i++) {
    slots.push(match.participants[i] || null);
  }

  const clipId = `match-clip-${match.id}`;

  return (
    <g
      transform={`translate(${x}, ${y})`}
      className={isClickable ? 'cursor-pointer' : ''}
      onClick={isClickable ? () => onMatchClick(match.id) : undefined}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
    >
      {/* Match identifier */}
      <text
        x={-8}
        y={matchHeight / 2 + 1}
        textAnchor="end"
        className="fill-gray-600"
        fontSize={cfg.identifierFontSize}
        fontWeight="bold"
      >
        {matchIndex}
      </text>

      {/* Wrapper background (slightly larger for border effect) */}
      <rect
        x={0}
        y={0}
        width={cfg.matchWidth}
        height={matchHeight}
        rx={cfg.cornerRadius}
        ry={cfg.cornerRadius}
        className={
          match.status === 'COMPLETED'
            ? 'fill-slate-700/80'
            : match.status === 'IN_PROGRESS'
              ? 'fill-red-900/30'
              : match.status === 'BYE'
                ? 'fill-slate-800/40'
                : 'fill-slate-800/60'
        }
        stroke={
          match.status === 'IN_PROGRESS'
            ? '#dc2626'
            : match.status === 'COMPLETED'
              ? '#475569'
              : '#334155'
        }
        strokeWidth={1}
      />

      <defs>
        <clipPath id={clipId}>
          <rect
            x={cfg.seedWidth + cfg.wrapperPadding}
            y={cfg.wrapperPadding}
            width={cfg.nameWidth}
            height={matchHeight - cfg.wrapperPadding * 2}
            rx={cfg.cornerRadius}
          />
        </clipPath>
      </defs>

      {/* Player slots */}
      {slots.map((slot, idx) => {
        const slotY = cfg.wrapperPadding + idx * cfg.playerHeight;
        const participant = slot?.participant;
        const isEmpty = !participant && !slot?.isBye;
        const isBye = slot?.isBye ?? false;
        const isWinner = slot?.isWinner ?? false;
        const score = slot?.score;
        const seedNum = participant
          ? (match.participants.findIndex(
              (p) => p.participantId === participant.id,
            ) + 1) || ''
          : '';

        // Find seed from bracket participant
        const participantSeed = participant?.seed;

        return (
          <g key={idx}>
            {/* Divider between players */}
            {idx > 0 && (
              <line
                x1={cfg.seedWidth}
                y1={slotY}
                x2={cfg.matchWidth - cfg.wrapperPadding}
                y2={slotY}
                className="stroke-slate-600/50"
                strokeWidth={0.5}
              />
            )}

            {/* Seed background */}
            <rect
              x={cfg.wrapperPadding}
              y={slotY}
              width={cfg.seedWidth}
              height={cfg.playerHeight}
              className={
                isWinner ? 'fill-red-600/30' : 'fill-slate-900/40'
              }
            />

            {/* Seed number */}
            <text
              x={cfg.wrapperPadding + cfg.seedWidth / 2}
              y={slotY + cfg.playerHeight / 2 + 1}
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={cfg.seedFontSize}
              fontWeight="bold"
              className={isWinner ? 'fill-red-400' : 'fill-gray-500'}
            >
              {participantSeed ?? ''}
            </text>

            {/* Name background */}
            <rect
              x={cfg.seedWidth + cfg.wrapperPadding}
              y={slotY}
              width={cfg.nameWidth}
              height={cfg.playerHeight}
              className={
                isEmpty
                  ? 'fill-transparent'
                  : isBye
                    ? 'fill-slate-800/20'
                    : isWinner
                      ? 'fill-red-600/10'
                      : 'fill-transparent'
              }
            />

            {/* Player name */}
            <text
              clipPath={`url(#${clipId})`}
              x={cfg.seedWidth + cfg.wrapperPadding + 5}
              y={slotY + cfg.playerHeight / 2 + 1}
              dominantBaseline="middle"
              fontSize={cfg.fontSize}
              fontWeight={isWinner ? 'bold' : 'normal'}
              className={
                isEmpty
                  ? 'fill-gray-600'
                  : isBye
                    ? 'fill-gray-600 italic'
                    : isWinner
                      ? 'fill-white'
                      : 'fill-gray-300'
              }
            >
              {participant
                ? participant.name
                : isBye
                  ? 'BYE'
                  : isEmpty && match.status === 'PENDING'
                    ? getPlaceholderText(match, idx)
                    : ''}
            </text>

            {/* Score background + score */}
            {score !== null && score !== undefined && (
              <>
                <rect
                  x={cfg.matchWidth - cfg.scoreWidth - cfg.wrapperPadding}
                  y={slotY}
                  width={cfg.scoreWidth}
                  height={cfg.playerHeight}
                  className={isWinner ? 'fill-red-600/20' : 'fill-slate-900/30'}
                />
                <text
                  x={
                    cfg.matchWidth -
                    cfg.wrapperPadding -
                    cfg.scoreWidth / 2
                  }
                  y={slotY + cfg.playerHeight / 2 + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={cfg.fontSize}
                  fontWeight="bold"
                  className={isWinner ? 'fill-white' : 'fill-gray-400'}
                >
                  {score}
                </text>
              </>
            )}
          </g>
        );
      })}

      {/* Hover overlay for admin */}
      {isClickable && (
        <rect
          x={0}
          y={0}
          width={cfg.matchWidth}
          height={matchHeight}
          rx={cfg.cornerRadius}
          ry={cfg.cornerRadius}
          className="fill-transparent hover:fill-white/5 transition-colors"
        />
      )}
    </g>
  );
}

function getPlaceholderText(
  match: BracketData['matches'][0],
  slotIndex: number,
): string {
  // For unfilled slots in later rounds, show where the participant will come from
  if (match.round > 1) {
    return `TBD`;
  }
  return '';
}

// --- Connecting Lines ---

function ConnectorLine({
  fromX,
  fromY,
  toX,
  toY,
  completed,
  cfg,
}: {
  fromX: number;
  fromY: number;
  toX: number;
  toY: number;
  completed: boolean;
  cfg: ReturnType<typeof getConfig>;
}) {
  const midX = fromX + (toX - fromX) / 2;

  const d = `M ${fromX} ${fromY} L ${midX} ${fromY} L ${midX} ${toY} L ${toX} ${toY}`;

  return (
    <path
      d={d}
      fill="none"
      stroke={completed ? '#dc2626' : '#334155'}
      strokeWidth={completed ? 1.5 : 1}
      strokeDasharray={completed ? undefined : '4 2'}
      className="transition-colors"
    />
  );
}

// --- Main Component ---

// --- Drag-and-drop slot info ---

interface DragSlot {
  participantId: number;
  participantName: string;
  matchId: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function BracketSVG({
  bracket,
  onMatchClick,
  onSwapParticipants,
  mode = 'public',
  className = '',
}: BracketSVGProps) {
  const cfg = getConfig(mode);
  const containerRef = useRef<HTMLDivElement>(null);
  const [dragSourceId, setDragSourceId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);

  const swapEnabled =
    mode === 'admin' &&
    bracket.status === 'GENERATED' &&
    !!onSwapParticipants;

  const handleDragStart = useCallback(
    (participantId: number) => (e: React.DragEvent) => {
      setDragSourceId(participantId);
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', String(participantId));
    },
    [],
  );

  const handleDragOver = useCallback(
    (participantId: number) => (e: React.DragEvent) => {
      if (dragSourceId !== null && dragSourceId !== participantId) {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
        setDragOverId(participantId);
      }
    },
    [dragSourceId],
  );

  const handleDragLeave = useCallback(() => {
    setDragOverId(null);
  }, []);

  const handleDrop = useCallback(
    (participantId: number) => (e: React.DragEvent) => {
      e.preventDefault();
      const sourceId = parseInt(e.dataTransfer.getData('text/plain'));
      if (sourceId && sourceId !== participantId && onSwapParticipants) {
        onSwapParticipants(sourceId, participantId);
      }
      setDragSourceId(null);
      setDragOverId(null);
    },
    [onSwapParticipants],
  );

  const handleDragEnd = useCallback(() => {
    setDragSourceId(null);
    setDragOverId(null);
  }, []);

  const layout = useMemo(() => {
    if (!bracket.matches.length) return null;

    const matchHeight = getMatchHeight(bracket.playersPerMatch, cfg);
    const { totalRounds } = bracket;

    // Group matches by round
    const matchesByRound = new Map<number, BracketData['matches']>();
    const thirdPlaceMatches: BracketData['matches'] = [];

    for (const match of bracket.matches) {
      // 3rd place match: same round as finals but position > 0
      if (
        bracket.thirdPlaceMatch &&
        match.round === totalRounds &&
        match.position > 0
      ) {
        thirdPlaceMatches.push(match);
        continue;
      }

      const existing = matchesByRound.get(match.round) || [];
      existing.push(match);
      matchesByRound.set(match.round, existing);
    }

    // Calculate positions for each match
    const positions = new Map<
      number,
      { x: number; y: number; centerY: number }
    >();

    // First round: stack matches evenly
    const round1Matches = matchesByRound.get(1) || [];
    const round1Height =
      round1Matches.length * matchHeight +
      (round1Matches.length - 1) * cfg.matchGapY;

    const identifierOffset = cfg.identifierGap;

    for (let round = 1; round <= totalRounds; round++) {
      const roundMatches = matchesByRound.get(round) || [];
      const x = identifierOffset + (round - 1) * cfg.roundGap;

      if (round === 1) {
        roundMatches.forEach((match, idx) => {
          const y = idx * (matchHeight + cfg.matchGapY);
          positions.set(match.id, {
            x,
            y,
            centerY: y + matchHeight / 2,
          });
        });
      } else {
        // Later rounds: center vertically between source matches
        roundMatches.forEach((match) => {
          const sourceMatches = bracket.matches.filter(
            (m) => m.nextMatchId === match.id,
          );

          if (sourceMatches.length > 0) {
            const sourceCenters = sourceMatches
              .map((sm) => positions.get(sm.id)?.centerY ?? 0)
              .sort((a, b) => a - b);

            const centerY =
              (sourceCenters[0] +
                sourceCenters[sourceCenters.length - 1]) /
              2;

            positions.set(match.id, {
              x,
              y: centerY - matchHeight / 2,
              centerY,
            });
          } else {
            // Fallback: stack
            const idx = roundMatches.indexOf(match);
            const y = idx * (matchHeight + cfg.matchGapY * Math.pow(2, round));
            positions.set(match.id, {
              x,
              y,
              centerY: y + matchHeight / 2,
            });
          }
        });
      }
    }

    // 3rd place match position: below the finals
    const thirdPlacePositions: Array<{
      match: BracketData['matches'][0];
      x: number;
      y: number;
    }> = [];

    if (thirdPlaceMatches.length > 0) {
      const finalsMatch = (matchesByRound.get(totalRounds) || [])[0];
      const finalsPos = finalsMatch ? positions.get(finalsMatch.id) : null;
      const semiMatches = matchesByRound.get(totalRounds - 1) || [];
      const lastSemiPos =
        semiMatches.length > 0
          ? positions.get(semiMatches[semiMatches.length - 1].id)
          : null;

      const thirdY = Math.max(
        (finalsPos?.y ?? 0) + matchHeight + cfg.matchGapY * 4,
        (lastSemiPos?.y ?? 0) + matchHeight + cfg.matchGapY * 4,
      );

      for (const match of thirdPlaceMatches) {
        const x = finalsPos?.x ?? identifierOffset + (totalRounds - 1) * cfg.roundGap;
        thirdPlacePositions.push({ match, x, y: thirdY });
      }
    }

    // Determine winner position (always shown) and name (if finals completed)
    const finalsMatch = (matchesByRound.get(totalRounds) || [])[0];
    const finalsPos = finalsMatch ? positions.get(finalsMatch.id) : null;
    let winner: { name: string | null; x: number; y: number; centerY: number; fromX: number; fromY: number } | null = null;

    if (finalsMatch && finalsPos) {
      const winnerX = finalsPos.x + cfg.matchWidth + cfg.roundGap * 0.4;
      const winnerCenterY = finalsPos.centerY;
      let winnerName: string | null = null;

      if (finalsMatch.status === 'COMPLETED') {
        const winnerSlot = finalsMatch.participants.find(
          (p) => p.isWinner && p.participant,
        );
        if (winnerSlot?.participant) {
          winnerName = winnerSlot.participant.name;
        }
      }

      // Center the winner group so the name card's center aligns with the connector line.
      // Name card center is at offset 39 (normal) or 49 (kiosk) within the group.
      const nameCardCenterOffset = mode === 'kiosk' ? 49 : 39;

      winner = {
        name: winnerName,
        x: winnerX,
        y: winnerCenterY - nameCardCenterOffset,
        centerY: winnerCenterY,
        fromX: finalsPos.x + cfg.matchWidth,
        fromY: finalsPos.centerY,
      };
    }

    // Calculate SVG dimensions
    let maxX = 0;
    let maxY = 0;
    positions.forEach((pos) => {
      maxX = Math.max(maxX, pos.x + cfg.matchWidth);
      maxY = Math.max(maxY, pos.y + matchHeight);
    });
    thirdPlacePositions.forEach(({ x, y }) => {
      maxX = Math.max(maxX, x + cfg.matchWidth);
      maxY = Math.max(maxY, y + matchHeight);
    });
    if (winner) {
      // Name card bottom: y=54 (normal), y=68 (kiosk)
      const cardBottom = mode === 'kiosk' ? 68 : 54;
      maxX = Math.max(maxX, winner.x + cfg.matchWidth);
      maxY = Math.max(maxY, winner.y + cardBottom);
    }

    const svgWidth = maxX + identifierOffset + 20;
    const svgHeight = maxY + 40;

    // Build connector lines
    const connectors: Array<{
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      completed: boolean;
    }> = [];

    for (const match of bracket.matches) {
      if (!match.nextMatchId) continue;
      const fromPos = positions.get(match.id);
      const toPos = positions.get(match.nextMatchId);
      if (!fromPos || !toPos) continue;

      connectors.push({
        fromX: fromPos.x + cfg.matchWidth,
        fromY: fromPos.centerY,
        toX: toPos.x,
        toY: toPos.centerY,
        completed: match.status === 'COMPLETED' || match.status === 'BYE',
      });
    }

    // Compute draggable slot positions for round 1 participants
    const dragSlots: DragSlot[] = [];
    if (bracket.status === 'GENERATED') {
      const r1Matches = matchesByRound.get(1) || [];
      for (const match of r1Matches) {
        const pos = positions.get(match.id);
        if (!pos) continue;
        for (let slotIdx = 0; slotIdx < match.participants.length; slotIdx++) {
          const mp = match.participants[slotIdx];
          if (mp?.participant && !mp.isBye && mp.participantId) {
            dragSlots.push({
              participantId: mp.participantId,
              participantName: mp.participant.name,
              matchId: match.id,
              x: pos.x,
              y: pos.y + cfg.wrapperPadding + slotIdx * cfg.playerHeight,
              width: cfg.matchWidth,
              height: cfg.playerHeight,
            });
          }
        }
      }
    }

    return {
      positions,
      thirdPlacePositions,
      connectors,
      svgWidth,
      svgHeight,
      matchesByRound,
      winner,
      dragSlots,
    };
  }, [bracket, cfg]);

  if (!layout || !bracket.matches.length) {
    return (
      <div className="text-center text-gray-500 py-8">
        Geen bracket gegenereerd.
      </div>
    );
  }

  // Number matches sequentially by round then position
  let matchCounter = 1;
  const matchNumbers = new Map<number, number>();
  for (let round = 1; round <= bracket.totalRounds; round++) {
    const roundMatches = layout.matchesByRound.get(round) || [];
    for (const match of roundMatches) {
      matchNumbers.set(match.id, matchCounter++);
    }
  }
  // 3rd place match
  for (const { match } of layout.thirdPlacePositions) {
    matchNumbers.set(match.id, matchCounter++);
  }

  return (
    <div className={`overflow-x-auto overflow-y-auto ${className}`} ref={containerRef}>
      <div className="relative" style={{ width: layout.svgWidth, height: layout.svgHeight }}>
        <svg
          width={layout.svgWidth}
          height={layout.svgHeight}
          viewBox={`0 0 ${layout.svgWidth} ${layout.svgHeight}`}
          className="bracket-svg absolute inset-0"
        >
          {/* Connector lines (behind matches) */}
          {layout.connectors.map((conn, idx) => (
            <ConnectorLine key={idx} {...conn} cfg={cfg} />
          ))}

          {/* 3rd place label */}
          {layout.thirdPlacePositions.length > 0 && (
            <text
              x={
                layout.thirdPlacePositions[0].x +
                cfg.matchWidth / 2
              }
              y={layout.thirdPlacePositions[0].y - 8}
              textAnchor="middle"
              className="fill-gray-500"
              fontSize={cfg.identifierFontSize}
              fontWeight="bold"
            >
              3e Plaats
            </text>
          )}

          {/* Regular matches */}
          {bracket.matches
            .filter(
              (m) =>
                !(
                  bracket.thirdPlaceMatch &&
                  m.round === bracket.totalRounds &&
                  m.position > 0
                ),
            )
            .map((match) => {
              const pos = layout.positions.get(match.id);
              if (!pos) return null;
              return (
                <MatchCard
                  key={match.id}
                  match={match}
                  x={pos.x}
                  y={pos.y}
                  matchIndex={matchNumbers.get(match.id) ?? 0}
                  cfg={cfg}
                  playersPerMatch={bracket.playersPerMatch}
                  onMatchClick={onMatchClick}
                  mode={mode}
                />
              );
            })}

          {/* 3rd place matches */}
          {layout.thirdPlacePositions.map(({ match, x, y }) => (
            <MatchCard
              key={match.id}
              match={match}
              x={x}
              y={y}
              matchIndex={matchNumbers.get(match.id) ?? 0}
              cfg={cfg}
              playersPerMatch={bracket.playersPerMatch}
              onMatchClick={onMatchClick}
              mode={mode}
            />
          ))}

          {/* Winner display */}
          {layout.winner && (
            <>
              {/* Connector line from finals to winner */}
              <path
                d={`M ${layout.winner.fromX} ${layout.winner.fromY} L ${layout.winner.x} ${layout.winner.fromY}`}
                fill="none"
                stroke={layout.winner.name ? '#dc2626' : '#374151'}
                strokeWidth={2}
                strokeDasharray={layout.winner.name ? undefined : '6 4'}
              />

              {/* Winner card */}
              <g transform={`translate(${layout.winner.x}, ${layout.winner.y})`}>
                {/* Trophy icon area */}
                <text
                  x={cfg.matchWidth / 2}
                  y={0}
                  textAnchor="middle"
                  fontSize={mode === 'kiosk' ? 28 : 20}
                  className={layout.winner.name ? 'fill-yellow-400' : 'fill-gray-600'}
                >
                  &#x1F3C6;
                </text>

                {/* Label */}
                <text
                  x={cfg.matchWidth / 2}
                  y={mode === 'kiosk' ? 22 : 18}
                  textAnchor="middle"
                  fontSize={cfg.identifierFontSize}
                  fontWeight="bold"
                  className="fill-gray-500"
                  letterSpacing="0.1em"
                >
                  WINNAAR
                </text>

                {/* Winner name card */}
                <rect
                  x={0}
                  y={mode === 'kiosk' ? 30 : 24}
                  width={cfg.matchWidth}
                  height={mode === 'kiosk' ? 38 : 30}
                  rx={cfg.cornerRadius + 1}
                  ry={cfg.cornerRadius + 1}
                  fill="none"
                  stroke={layout.winner.name ? '#dc2626' : '#374151'}
                  strokeWidth={2}
                  strokeDasharray={layout.winner.name ? undefined : '6 4'}
                />
                <rect
                  x={1}
                  y={mode === 'kiosk' ? 31 : 25}
                  width={cfg.matchWidth - 2}
                  height={mode === 'kiosk' ? 36 : 28}
                  rx={cfg.cornerRadius}
                  ry={cfg.cornerRadius}
                  className={layout.winner.name ? 'fill-red-600/15' : 'fill-gray-800/30'}
                />
                <text
                  x={cfg.matchWidth / 2}
                  y={mode === 'kiosk' ? 54 : 43}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize={mode === 'kiosk' ? cfg.fontSize + 2 : cfg.fontSize + 1}
                  fontWeight="bold"
                  className={layout.winner.name ? 'fill-white' : 'fill-gray-600'}
                >
                  {layout.winner.name ?? 'TBD'}
                </text>
              </g>
            </>
          )}
        </svg>

        {/* Drag-and-drop overlays for round 1 participant swapping */}
        {swapEnabled &&
          layout.dragSlots.map((slot) => {
            const isDragSource = dragSourceId === slot.participantId;
            const isDragOver = dragOverId === slot.participantId;

            return (
              <div
                key={slot.participantId}
                draggable
                onDragStart={handleDragStart(slot.participantId)}
                onDragOver={handleDragOver(slot.participantId)}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop(slot.participantId)}
                onDragEnd={handleDragEnd}
                onClick={() => onMatchClick?.(slot.matchId)}
                className={`absolute cursor-grab active:cursor-grabbing transition-all rounded-sm ${
                  isDragSource
                    ? 'ring-2 ring-red-500 bg-red-500/20 z-10'
                    : isDragOver
                      ? 'ring-2 ring-amber-400 bg-amber-400/20 z-10'
                      : 'hover:bg-white/5'
                }`}
                style={{
                  left: slot.x,
                  top: slot.y,
                  width: slot.width,
                  height: slot.height,
                }}
                title={`${slot.participantName} — sleep om te wisselen`}
              >
                {isDragOver && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <ArrowLeftRight size={14} className="text-amber-400" />
                  </div>
                )}
              </div>
            );
          })}
      </div>
    </div>
  );
}
