import { ReactNode } from 'react';

interface Column<T> {
  header: string;
  accessor: keyof T | ((row: T) => ReactNode);
  className?: string;
}

interface TableProps<T> {
  data: T[];
  columns: Column<T>[];
  emptyMessage?: string;
}

export function Table<T extends { id?: number | string }>({
  data,
  columns,
  emptyMessage = 'Geen gegevens gevonden',
}: TableProps<T>) {
  return (
    <div className='overflow-x-auto'>
      <table className='w-full text-left text-sm'>
        <thead className='bg-slate-950 text-gray-500 uppercase'>
          <tr>
            {columns.map((col, idx) => (
              <th key={idx} className={`p-4 ${col.className || ''}`}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className='divide-y divide-slate-800'>
          {data.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className='p-8 text-center text-gray-500'
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            data.map((row, rowIdx) => (
              <tr key={row.id ?? rowIdx} className='hover:bg-slate-900/50'>
                {columns.map((col, colIdx) => (
                  <td key={colIdx} className={`p-4 ${col.className || ''}`}>
                    {typeof col.accessor === 'function'
                      ? col.accessor(row)
                      : String(row[col.accessor])}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
