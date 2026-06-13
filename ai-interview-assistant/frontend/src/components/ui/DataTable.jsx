export function DataTable({ columns = [], children, className = "" }) {
  return (
    <section className={`ds-table-wrap ${className}`.trim()}>
      <div className="ds-table-scroll">
        <table className="ds-table">
          <thead>
            <tr>
              {columns.map((column) => (
                <th key={column.key || column.label} className={column.className || ""}>
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </section>
  );
}

export function DataTableState({ colSpan, children, className = "" }) {
  return (
    <tr>
      <td colSpan={colSpan} className={`text-center text-[var(--color-text-muted)] ${className}`.trim()}>
        {children}
      </td>
    </tr>
  );
}
