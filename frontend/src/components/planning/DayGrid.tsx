'use client';

import type { PointerEvent, ReactNode } from 'react';
import type { PlanningBlock, PlanningDay, PlanningPlayer } from '@/api';
import { BLOCK_STYLE, STATUS_STYLE, blockAt, cellKey, dayLabel, hourLabel, hoursOf, type Cell } from './planning';

interface DayGridProps {
  day: PlanningDay;
  players: PlanningPlayer[];
  cells: Record<string, Cell>;
  isToday: boolean;
  canEdit: (player: PlanningPlayer) => boolean;
  onCellPointerDown: (event: PointerEvent, player: PlanningPlayer, day: PlanningDay, hour: number) => void;
  onBlockClick?: (block: PlanningBlock, day: PlanningDay) => void;
  actions?: ReactNode;
}

/** One planned day: a column per player and a row per hour, like the team's spreadsheet. */
export function DayGrid({ day, players, cells, isToday, canEdit, onCellPointerDown, onBlockClick, actions }: DayGridProps) {
  return (
    <section className={`overflow-hidden rounded-xl border bg-[#0a0f25]/80 ${isToday ? 'border-[#d42422]' : 'border-white/10'}`}>
      <div className="flex items-center justify-between gap-2 border-b border-white/10 px-3 py-2">
        <h2 className="text-sm font-bold capitalize text-white">
          {dayLabel(day.date)}
          {isToday && <span className="ml-2 text-xs font-semibold uppercase text-[#ff4444]">vandaag</span>}
        </h2>
        {actions}
      </div>
      {day.note && <p className="border-b border-white/10 px-3 py-1.5 text-xs text-gray-400">{day.note}</p>}
      <div className="overflow-x-auto">
        <table className="w-full table-fixed border-collapse text-xs">
          <thead>
            <tr>
              <th className="w-14 border-b border-r border-white/10 bg-black/20" />
              {players.map((player) => (
                <th
                  key={player.memberId}
                  title={player.name ?? undefined}
                  className={`min-w-14 truncate border-b border-r border-white/10 px-1 py-1.5 font-semibold last:border-r-0 ${player.isMe ? 'bg-[#d42422]/20 text-white' : 'text-gray-300'}`}
                >
                  {player.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {hoursOf(day).map((hour) => {
              const block = blockAt(day.blocks, hour);
              return (
                <tr key={hour}>
                  <th scope="row" className="border-b border-r border-white/10 bg-black/20 px-1 py-1.5 text-left font-mono font-medium text-gray-400">
                    {hourLabel(hour)}
                  </th>
                  {block ? (
                    <td colSpan={Math.max(players.length, 1)} className={`border-b border-white/10 p-0 ${BLOCK_STYLE[block.type].cell}`}>
                      <button
                        type="button"
                        disabled={!onBlockClick}
                        onClick={() => onBlockClick?.(block, day)}
                        className="block h-full w-full truncate px-2 py-1.5 text-left font-semibold enabled:cursor-pointer"
                      >
                        {block.startHour === hour ? block.title || BLOCK_STYLE[block.type].label : ' '}
                      </button>
                    </td>
                  ) : (
                    players.map((player) => {
                      const cell = cells[cellKey(player.memberId, day.id, hour)];
                      const editable = canEdit(player);
                      return (
                        <td
                          key={player.memberId}
                          data-member={player.memberId}
                          data-day={day.id}
                          data-hour={hour}
                          title={cell?.note ?? (cell ? STATUS_STYLE[cell.status].label : undefined)}
                          onPointerDown={editable ? (event) => onCellPointerDown(event, player, day, hour) : undefined}
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
