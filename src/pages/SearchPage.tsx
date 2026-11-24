import { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Search, RotateCcw } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { PortalContentCard } from "../components/PortalContentCard";
import { Pagination } from "../components/Pagination";
import { SEOHead } from "../components/SEOHead";

const PAGE_SIZE = 9;

export function SearchPage() {
  const { categories, publishedContent, contentLoading } = useContent();
  const [searchParams, setSearchParams] = useSearchParams();

  const [keywords, setKeywords] = useState(searchParams.get("q") || "");
  const [orderNumber, setOrderNumber] = useState(searchParams.get("order") || "");
  const [authority, setAuthority] = useState(searchParams.get("authority") || "all");
  const [categorySlug, setCategorySlug] = useState(searchParams.get("category") || "all");
  const [year, setYear] = useState(searchParams.get("year") || "all");
  const [currentPage, setCurrentPage] = useState(1);

  // Sync URL query parameters when arriving from Homepage search bar
  useEffect(() => {
    setKeywords(searchParams.get("q") || "");
    setOrderNumber(searchParams.get("order") || "");
    setAuthority(searchParams.get("authority") || "all");
    setCategorySlug(searchParams.get("category") || "all");
    setYear(searchParams.get("year") || "all");
    setCurrentPage(1);
  }, [searchParams]);

  const updateQueryParam = (key: string, val: string) => {
    const next = new URLSearchParams(searchParams);
    if (!val || val === "all") {
      next.delete(key);
    } else {
      next.set(key, val);
    }
    setSearchParams(next, { replace: true });
    setCurrentPage(1);
  };

  const authorities = useMemo(() => {
    const set = new Set<string>();
    publishedContent.forEach((item) => {
      if (item.issuingAuthority) set.add(item.issuingAuthority);
    });
    return Array.from(set).sort();
  }, [publishedContent]);

  const years = useMemo(() => {
    const set = new Set<number>();
    publishedContent.forEach((item) => set.add(item.publicationYear));
    return Array.from(set).sort((a, b) => b - a);
  }, [publishedContent]);

  const filtered = useMemo(() => {
    const q = keywords.trim().toLowerCase();
    const ord = orderNumber.trim().toLowerCase();

    return publishedContent.filter((item) => {
      if (categorySlug !== "all" && item.categorySlug !== categorySlug) {
        return false;
      }
      if (year !== "all" && String(item.publicationYear) !== year) {
        return false;
      }
      if (authority !== "all" && item.issuingAuthority !== authority) {
        return false;
      }
      if (ord && !item.orderNumber.toLowerCase().includes(ord)) {
        return false;
      }
      if (q) {
        const hay = [
          item.title,
          item.shortDescription,
          item.fullContent,
          item.issuingAuthority,
          item.orderNumber,
          item.categoryName,
          item.subcategory,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [publishedContent, keywords, orderNumber, authority, categorySlug, year]);

  const paginated = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, currentPage]);

  const resetAll = () => {
    setSearchParams({}, { replace: true });
    setKeywords("");
    setOrderNumber("");
    setAuthority("all");
    setCategorySlug("all");
    setYear("all");
    setCurrentPage(1);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-8">
      <SEOHead
        title="Search Circulars, Schemes & Articles"
        description="Search and filter official Ex-Servicemen circulars, orders, pension guidelines, ECHS rules, welfare schemes, and employment updates."
      />

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-veteran-navy flex items-center gap-3 border-b-2 border-veteran-gold pb-3 inline-flex pr-8">
          <Search className="w-8 h-8 text-veteran-olive" />
          Search & Archive Filters
        </h1>
        <p className="text-gray-600 mt-4 max-w-3xl">
          Search across all published government circulars, orders, welfare schemes, employment opportunities, and veteran news by keyword, circular/order number, issuing authority, category, or year.
        </p>
      </div>

      {/* Filter Panel */}
      <div className="bg-white p-5 rounded-lg border border-gray-200 space-y-4 mb-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Keywords
            </label>
            <div className="relative">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={keywords}
                onChange={(e) => {
                  setKeywords(e.target.value);
                  updateQueryParam("q", e.target.value);
                }}
                placeholder="Search title, SPARSH, ECHS, OROP..."
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-veteran-olive outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Circular / Order Number
            </label>
            <input
              type="text"
              value={orderNumber}
              onChange={(e) => {
                setOrderNumber(e.target.value);
                updateQueryParam("order", e.target.value);
              }}
              placeholder="e.g., 668, B/49711, DESW..."
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-veteran-olive outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Category
            </label>
            <select
              value={categorySlug}
              onChange={(e) => {
                setCategorySlug(e.target.value);
                updateQueryParam("category", e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-veteran-olive outline-none"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Issuing Authority
            </label>
            <select
              value={authority}
              onChange={(e) => {
                setAuthority(e.target.value);
                updateQueryParam("authority", e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-veteran-olive outline-none"
            >
              <option value="all">All Issuing Authorities</option>
              {authorities.map((authName) => (
                <option key={authName} value={authName}>
                  {authName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-700 mb-1">
              Year of Publication
            </label>
            <select
              value={year}
              onChange={(e) => {
                setYear(e.target.value);
                updateQueryParam("year", e.target.value);
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-veteran-olive outline-none"
            >
              <option value="all">All Years</option>
              {years.map((yr) => (
                <option key={yr} value={String(yr)}>
                  {yr}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              type="button"
              onClick={resetAll}
              className="w-full min-h-[38px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded border border-gray-300 inline-flex items-center justify-center gap-1.5 transition-colors"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset All Filters
            </button>
          </div>
        </div>
      </div>

      {/* Results Header */}
      <div className="mb-4 flex items-center justify-between text-xs text-gray-600 tabular-nums">
        <span>
          Found <strong className="text-gray-900">{filtered.length}</strong> matching published record(s)
        </span>
      </div>

      {/* Results */}
      {contentLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : paginated.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginated.map((item) => (
              <PortalContentCard
                key={item.id}
                item={item}
                showImage={Boolean(item.featuredImageUrl)}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filtered.length}
            pageSize={PAGE_SIZE}
            onPageChange={(page) => {
              setCurrentPage(page);
              window.scrollTo({ top: 0, behavior: "smooth" });
            }}
          />
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center space-y-3">
          <p className="text-gray-600 font-medium">
            No matching circulars, schemes, or articles found.
          </p>
          <button
            type="button"
            onClick={resetAll}
            className="px-4 py-2 bg-veteran-navy text-white text-xs font-bold uppercase tracking-wider rounded"
          >
            Clear Search Filters
          </button>
        </div>
      )}
    </div>
  );
}
