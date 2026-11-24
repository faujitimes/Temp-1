import { useState, useMemo, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { FolderOpen, Search, ArrowLeft } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { PortalContentCard } from "../components/PortalContentCard";
import { Pagination } from "../components/Pagination";
import { SEOHead } from "../components/SEOHead";

const PAGE_SIZE = 9;

export function CategoryPage() {
  const { slug } = useParams<{ slug: string }>();
  const { categories, publishedContent, contentLoading } = useContent();

  const [selectedSubcategory, setSelectedSubcategory] = useState<string>("all");
  const [keyword, setKeyword] = useState("");
  const [selectedYear, setSelectedYear] = useState<string>("all");
  const [currentPage, setCurrentPage] = useState(1);

  const category = categories.find((c) => c.slug === slug);

  // Reset filters when navigating between categories
  useEffect(() => {
    setSelectedSubcategory("all");
    setKeyword("");
    setSelectedYear("all");
    setCurrentPage(1);
  }, [slug]);

  const categoryItems = useMemo(() => {
    return publishedContent.filter((item) => item.categorySlug === slug);
  }, [publishedContent, slug]);

  const availableYears = useMemo(() => {
    const yrs = new Set<number>();
    categoryItems.forEach((item) => yrs.add(item.publicationYear));
    return Array.from(yrs).sort((a, b) => b - a);
  }, [categoryItems]);

  const filteredItems = useMemo(() => {
    const q = keyword.trim().toLowerCase();
    return categoryItems.filter((item) => {
      if (
        selectedSubcategory !== "all" &&
        item.subcategory.toLowerCase() !== selectedSubcategory.toLowerCase()
      ) {
        return false;
      }
      if (selectedYear !== "all" && String(item.publicationYear) !== selectedYear) {
        return false;
      }
      if (q) {
        const hay = [
          item.title,
          item.shortDescription,
          item.orderNumber,
          item.issuingAuthority,
          item.subcategory,
        ]
          .join(" ")
          .toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [categoryItems, selectedSubcategory, selectedYear, keyword]);

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredItems.slice(start, start + PAGE_SIZE);
  }, [filteredItems, currentPage]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  if (!contentLoading && !category) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-16 text-center space-y-4">
        <SEOHead
          title="Category Not Found"
          description="The requested veteran welfare category could not be found."
        />
        <h1 className="text-3xl font-serif font-bold text-veteran-navy">
          Category Not Found
        </h1>
        <p className="text-sm text-gray-600">
          The category you requested does not exist or is currently inactive.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-veteran-navy text-white text-xs font-bold uppercase tracking-wider rounded"
        >
          <ArrowLeft className="w-4 h-4" /> Return Home
        </Link>
      </div>
    );
  }

  const pageTitle = category?.name || "Portal Category";
  const pageDescription =
    category?.description ||
    "Browse verified circulars, orders, schemes, and articles for Indian Ex-Servicemen.";

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-8">
      <SEOHead
        title={pageTitle}
        description={pageDescription}
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "CollectionPage",
          name: pageTitle,
          description: pageDescription,
        }}
      />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 text-xs text-gray-500 mb-3">
          <Link to="/" className="hover:text-veteran-navy font-medium">
            Home
          </Link>
          <span aria-hidden="true">/</span>
          <span className="text-gray-800 font-semibold">{pageTitle}</span>
        </div>

        <h1 className="text-3xl font-serif font-bold text-veteran-navy flex items-center gap-3 border-b-2 border-veteran-gold pb-3 inline-flex pr-8">
          <FolderOpen className="w-8 h-8 text-veteran-olive shrink-0" />
          <span>{pageTitle}</span>
        </h1>
        <p className="text-gray-600 mt-4 max-w-3xl leading-relaxed">
          {pageDescription}
        </p>
      </div>

      {/* Subcategory Tabs & Inline Search/Year Controls */}
      <div className="bg-white p-4 rounded-lg border border-gray-200 space-y-4 mb-8">
        {category && category.subcategories.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setSelectedSubcategory("all");
                setCurrentPage(1);
              }}
              className={`min-h-[36px] px-3.5 py-1.5 rounded text-xs font-bold transition-colors border whitespace-nowrap ${
                selectedSubcategory === "all"
                  ? "bg-veteran-navy text-white border-veteran-navy"
                  : "bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100"
              }`}
            >
              All Topics ({categoryItems.length})
            </button>
            {category.subcategories.map((sub) => (
              <button
                key={sub}
                type="button"
                onClick={() => {
                  setSelectedSubcategory(sub);
                  setCurrentPage(1);
                }}
                className={`min-h-[36px] px-3.5 py-1.5 rounded text-xs font-bold transition-colors border whitespace-nowrap ${
                  selectedSubcategory.toLowerCase() === sub.toLowerCase()
                    ? "bg-veteran-navy text-white border-veteran-navy"
                    : "bg-slate-50 text-gray-700 border-gray-200 hover:bg-slate-100"
                }`}
              >
                {sub}
              </button>
            ))}
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={keyword}
              onChange={(e) => {
                setKeyword(e.target.value);
                setCurrentPage(1);
              }}
              placeholder="Filter within this category by keyword, circular no., or authority..."
              className="w-full pl-9 pr-4 py-2 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-veteran-olive focus:border-veteran-olive outline-none"
            />
          </div>

          <select
            value={selectedYear}
            onChange={(e) => {
              setSelectedYear(e.target.value);
              setCurrentPage(1);
            }}
            aria-label="Filter by year"
            className="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-2 focus:ring-veteran-olive outline-none min-w-[140px]"
          >
            <option value="all">All Years</option>
            {availableYears.map((yr) => (
              <option key={yr} value={String(yr)}>
                Year {yr}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {contentLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-56 bg-gray-200 animate-pulse rounded-lg" />
          ))}
        </div>
      ) : paginatedItems.length > 0 ? (
        <>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedItems.map((item) => (
              <PortalContentCard
                key={item.id}
                item={item}
                showImage={Boolean(item.featuredImageUrl)}
              />
            ))}
          </div>
          <Pagination
            currentPage={currentPage}
            totalItems={filteredItems.length}
            pageSize={PAGE_SIZE}
            onPageChange={handlePageChange}
          />
        </>
      ) : (
        <div className="bg-white border border-gray-200 rounded-lg p-12 text-center space-y-3">
          <p className="text-gray-600 font-medium">
            No published entries matched your current filter in {pageTitle}.
          </p>
          {(selectedSubcategory !== "all" || keyword || selectedYear !== "all") && (
            <button
              type="button"
              onClick={() => {
                setSelectedSubcategory("all");
                setKeyword("");
                setSelectedYear("all");
                setCurrentPage(1);
              }}
              className="px-4 py-2 bg-veteran-navy text-white text-xs font-bold uppercase tracking-wider rounded"
            >
              Reset Category Filters
            </button>
          )}
        </div>
      )}
    </div>
  );
}
