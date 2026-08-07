import { cn } from "@/lib/utils";

export type DataTableColumn<T> = {
  key: string;
  header: string;
  className?: string;
  cell: (row: T) => React.ReactNode;
};

export function DataTable<T extends { id?: string } | Record<string, unknown>>({
  columns,
  rows,
  rowKey,
  empty,
  className,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T, index: number) => string;
  empty?: React.ReactNode;
  className?: string;
}) {
  if (rows.length === 0) {
    return <>{empty ?? <p className="text-sm text-fg-muted">No records.</p>}</>;
  }

  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full min-w-[480px] text-left text-sm">
        <thead>
          <tr className="border-b border-border-default text-xs uppercase tracking-wide text-fg-muted">
            {columns.map((col) => (
              <th key={col.key} className={cn("px-2 py-2 font-medium", col.className)}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={rowKey(row, i)} className="border-b border-border-subtle last:border-0">
              {columns.map((col) => (
                <td key={col.key} className={cn("px-2 py-2 align-top text-fg-default", col.className)}>
                  {col.cell(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}