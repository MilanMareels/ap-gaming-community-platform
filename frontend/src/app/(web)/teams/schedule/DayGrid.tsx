'use client';

import type { PointerEvent } from 'react';
import type { TeamScheduleBlock, TeamSchedulePlayer } from '@/api';
import { BLOCK_STYLE, STATUS_STYLE, blockAt, cellKey, dayLabel, hourLabel, type Cell } from './schedule';

interface DayGridProps {
  date: string;
  hours: number[];
  players: TeamSchedulePlayer[];
  cells: Record<string, Cell>;
  blocks: TeamScheduleBlock[];
  isToday: boolean;
  canEdit: (player: TeamSchedulePlayer) => boolean;
  onCellPointerDown: (event: PointerEvent, player: TeamSchedulePlayer, date: string, hour: number) => void;
  onBlockClick?: (block: TeamScheduleBlock) => void;
}

/** One day of the team grid: a column per player, a row per hour, like the team's spreadsheet. */
export function DayGrid({ date, hours, players, cells, blocks, isToday, canEdit, onCellPointerDown, onBlockClick }: DayGridProps) {
  return (
    <section className={`overflow-hidden rounded-xl border bg-[#0a0f25]/80 ${isToday ? 'border-[#d42422]' : 'border-white/10'}`}>
      <h2 className="border-b border-white/10 px-3 py-2 text-center text-sm font-bold capitalize text-white">
        {dayLabel(date)}
        {isToday && <span className="ml-2 text-xs font-semibold uppercase text-[#ff4444]">vandaag</span>}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-14 border-b border-r border-white/10 bg-black/20" />
              {players.map((player) => (
                <th
                  key={player.rosterEntryId}
                  title={player.name ?? undefined}
                  className={`min-w-14 truncate border-b border-r border-white/10 px-1 py-1.5 font-semibold last:border-r-0 ${player.isMe ? 'bg-[#d42422]/20 text-white' : 'text-gray-300'}`}
                >
                  {player.handle}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hours.map((hour) => {
              const block = blockAt(blocks, date, hour);
              return (
                <tr key={hour}>
                  <th scope="row" className="border-b border-r border-white/10 bg-black/20 px-1 py-1.5 text-left font-mono font-medium text-gray-400">
                    {hourLabel(hour)}
                  </th>
                  {block ? (
                    <td colSpan={players.length} className={`border-b border-white/10 p-0 ${BLOCK_STYLE[block.type].cell}`}>
                      <button
                        type="button"
                        disabled={!onBlockClick}
                        onClick={() => onBlockClick?.(block)}
                        className="block h-full w-full truncate px-2 py-1.5 text-left font-semibold enabled:cursor-pointer"
                      >
                        {block.startHour === hour ? (block.title || BLOCK_STYLE[block.type].label) : ' '}
                      </button>
                    </td>
                  ) : (
                    players.map((player) => {
                      const cell = cells[cellKey(player.rosterEntryId, date, hour)];
                      const editable = canEdit(player);
                      return (
                        <td
                          key={player.rosterEntryId}
                          data-entry={player.rosterEntryId}
                          data-date={date}
                          data-hour={hour}
                          title={cell?.note ?? (cell ? STATUS_STYLE[cell.status].label : undefined)}
                          onPointerDown={editable ? (event) => onCellPointerDown(event, player, date, hour) : undefined}
                          style={editable ? { touchAction: 'none' } : undefined}
                          className={`h-7 truncate border-b border-r border-white/10 px-1 text-center font-semibold last:border-r-0 ${
                            cell ? STATUS_STYLE[cell.status].cell : editable ? 'bg-white/[0.06]' : 'bg-transparent'
                          } ${editable ? 'cursor-pointer select-none hover:brightness-125' : ''}`}
                        >
                          {cell?.note ?? ''}
                        </td>
                      );
                    })
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
