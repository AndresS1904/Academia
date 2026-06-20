interface PaginationProps {
  page: number;
  pages: number;
  total: number;
  limit: number;
  onPageChange: (p: number) => void;
}

export function Pagination({ page, pages, total, limit, onPageChange }: PaginationProps) {
  if (pages <= 1) return null;

  const from = (page - 1) * limit + 1;
  const to = Math.min(page * limit, total);

  const btn: React.CSSProperties = {
    padding: "7px 16px",
    border: "1px solid #e2eaf7",
    borderRadius: 8,
    background: "#fff",
    color: "#475569",
    fontSize: "0.82rem",
    fontWeight: 600,
    cursor: "pointer",
    transition: "all 0.15s",
  };
  const btnDisabled: React.CSSProperties = {
    ...btn,
    opacity: 0.4,
    cursor: "not-allowed",
  };

  // Generar páginas visibles: siempre 1, ..., current-1, current, current+1, ..., last
  const pageNums: (number | "...")[] = [];
  if (pages <= 7) {
    for (let i = 1; i <= pages; i++) pageNums.push(i);
  } else {
    pageNums.push(1);
    if (page > 3) pageNums.push("...");
    for (let i = Math.max(2, page - 1); i <= Math.min(pages - 1, page + 1); i++) pageNums.push(i);
    if (page < pages - 2) pageNums.push("...");
    pageNums.push(pages);
  }

  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "14px 20px", borderTop: "1px solid #f1f5f9" }}>
      <span style={{ fontSize: "0.8rem", color: "#94a3b8" }}>
        Mostrando {from}–{to} de {total}
      </span>
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        <button
          style={page === 1 ? btnDisabled : btn}
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
        >
          ← Anterior
        </button>
        {pageNums.map((n, i) =>
          n === "..." ? (
            <span key={`ellipsis-${i}`} style={{ padding: "0 6px", color: "#94a3b8", fontSize: "0.82rem" }}>…</span>
          ) : (
            <button
              key={n}
              onClick={() => onPageChange(n as number)}
              style={{
                ...btn,
                background: n === page ? "#004aad" : "#fff",
                color: n === page ? "#fff" : "#475569",
                border: n === page ? "1px solid #004aad" : "1px solid #e2eaf7",
                minWidth: 36,
              }}
            >
              {n}
            </button>
          )
        )}
        <button
          style={page === pages ? btnDisabled : btn}
          disabled={page === pages}
          onClick={() => onPageChange(page + 1)}
        >
          Siguiente →
        </button>
      </div>
    </div>
  );
}
