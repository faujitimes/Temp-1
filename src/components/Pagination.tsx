import { ChevronLeft, ChevronRight } from "lucide-react";

interface PaginationProps {
  currentPage: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
}

export function Pagination({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
}: PaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  if (totalItems <= pageSize) return null;

  const start = (currentPage - 1) * pageSize + 1;
  const end = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages: (number | "ellipsis")[] = [];
    for (let i = 1; i <= totalPages; i++) {
      if (
        i === 1 ||
        i === totalPages ||
        (i >= currentPage - 1 && i <= currentPage + 1)
      ) {
        pages.push(i);
      } else if (pages[pages.length - 1] !== "ellipsis") {
        pages.push("ellipsis");
      }
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-6 border-t border-gray-200 mt-6">
      <p className="text-xs text-gray-600 tabular-nums">
        Showing <span className="font-semibold text-gray-900">{start}–{end}</span> of{" "}
        <span className="font-semibold text-gray-900">{totalItems}</span> items
      </p>

      <nav aria-label="Pagination" className="flex items-center gap-1.5">
        <button
          type="button"
          disabled={currentPage === 1}
          onClick={() => onPageChange(currentPage - 1)}
          className="min-h-[40px] px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 transition-colors"
        >
          <ChevronLeft className="w-4 h-4" /> Prev
        </button>

        {getPageNumbers().map((p, idx) =>
          p === "ellipsis" ? (
            <span key={`e-${idx}`} className="px-2 text-gray-400 text-xs">
              …
            </span>
          ) : (
            <button
              key={p}
              type="button"
              onClick={() => onPageChange(p)}
              aria-current={p === currentPage ? "page" : undefined}
              className={`min-h-[40px] min-w-[40px] px-3 py-1.5 rounded text-xs font-bold tabular-nums transition-colors border ${
                p === currentPage
                  ? "bg-veteran-navy text-white border-veteran-navy"
                  : "bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
              }`}
            >
              {p}
            </button>
          )
        )}

        <button
          type="button"
          disabled={currentPage === totalPages}
          onClick={() => onPageChange(currentPage + 1)}
          className="min-h-[40px] px-3 py-1.5 rounded border border-gray-300 bg-white text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center gap-1 transition-colors"
        >
          Next <ChevronRight className="w-4 h-4" />
        </button>
      </nav>
    </div>
  );
}
