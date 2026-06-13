import { ChevronLeft, ChevronRight } from "lucide-react";

export function Pagination({ page = 1, totalPages = 1, onPageChange, className = "" }) {
  const safeTotal = Math.max(1, Number(totalPages) || 1);
  const safePage = Math.min(Math.max(1, Number(page) || 1), safeTotal);
  const pages = Array.from({ length: safeTotal }, (_, index) => index + 1).slice(0, 5);

  return (
    <nav className={`pagination ${className}`.trim()} aria-label="Phân trang">
      <button type="button" disabled={safePage <= 1} onClick={() => onPageChange?.(safePage - 1)} aria-label="Trang trước">
        <ChevronLeft size={16} />
      </button>
      {pages.map((item) => (
        <button
          key={item}
          type="button"
          className={item === safePage ? "active" : ""}
          onClick={() => onPageChange?.(item)}
          aria-current={item === safePage ? "page" : undefined}
        >
          {item}
        </button>
      ))}
      <button type="button" disabled={safePage >= safeTotal} onClick={() => onPageChange?.(safePage + 1)} aria-label="Trang sau">
        <ChevronRight size={16} />
      </button>
    </nav>
  );
}
