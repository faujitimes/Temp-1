import { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { format } from "date-fns";
import { FileText, Search, Download, ArrowRight } from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Pagination } from "../components/Pagination";
import { SEOHead } from "../components/SEOHead";

interface CombinedCircularRow {
  id: string;
  title: string;
  date: string;
  issuingAuthority?: string;
  orderNumber?: string;
  fileUrl: string | null;
  slug?: string;
  isNew: boolean;
}

const PAGE_SIZE = 12;

export function Circulars() {
  const { circulars, publishedContent, contentLoading: loading } = useContent();
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  const combinedRows = useMemo<CombinedCircularRow[]>(() => {
    const fromPortal: CombinedCircularRow[] = publishedContent
      .filter(
        (item) =>
          item.contentType === "circular" ||
          item.contentType === "order" ||
          item.categorySlug === "circulars"
      )
      .map((item) => ({
        id: `pc_${item.id}`,
        title: item.title,
        date: item.issueDate || item.publicationDate,
        issuingAuthority: item.issuingAuthority,
        orderNumber: item.orderNumber,
        fileUrl: item.pdfAttachments[0]?.url || item.officialSourceUrl || null,
        slug: item.slug,
        isNew: false,
      }));

    const seenTitles = new Set(fromPortal.map((r) => r.title.trim().toLowerCase()));
    const fromLegacy: CombinedCircularRow[] = circulars
      .filter((c) => !seenTitles.has(c.title.trim().toLowerCase()))
      .map((c) => ({
        id: `leg_${c.id}`,
        title: c.title,
        date: c.date,
        fileUrl: c.fileUrl,
        isNew: c.isNew,
      }));

    return [...fromLegacy, ...fromPortal].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [circulars, publishedContent]);

  const filteredCirculars = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return combinedRows;
    return combinedRows.filter(
      (c) =>
        c.title.toLowerCase().includes(q) ||
        (c.orderNumber || "").toLowerCase().includes(q) ||
        (c.issuingAuthority || "").toLowerCase().includes(q)
    );
  }, [combinedRows, search]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const paginatedRows = filteredCirculars.slice(
    (page - 1) * PAGE_SIZE,
    page * PAGE_SIZE
  );

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-8">
      <SEOHead
        title="Circulars & Government Orders"
        description="Browse, search, and download official government circulars, policies, and orders issued by DESW, KSB, PCDA, and Armed Forces Headquarters."
      />

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-veteran-navy flex items-center gap-3 border-b-2 border-veteran-gold pb-3 inline-flex pr-8">
          <FileText className="w-8 h-8 text-veteran-olive" />
          Circulars & Orders
        </h1>
        <p className="text-gray-600 mt-4 max-w-3xl">
          Browse, search, and download official government circulars, policies, and orders issued by the Department of Ex-Servicemen Welfare, KSB, and Army Headquarters.
        </p>
      </div>

      <div className="bg-white p-4 rounded-lg shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search circulars by keyword, order number, or authority..."
            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-veteran-olive focus:border-veteran-olive outline-none"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="bg-white shadow rounded-lg overflow-hidden border border-gray-200">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-veteran-navy text-white">
                <th className="p-4 font-semibold text-sm">Issue Date</th>
                <th className="p-4 font-semibold text-sm w-3/5">Subject / Title</th>
                <th className="p-4 font-semibold text-sm text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    Loading circulars...
                  </td>
                </tr>
              ) : paginatedRows.length > 0 ? (
                paginatedRows.map((circular) => {
                  const parsedDate = new Date(circular.date);
                  const dateText = Number.isNaN(parsedDate.getTime())
                    ? circular.date
                    : format(parsedDate, "dd MMM yyyy");
                  return (
                    <tr key={circular.id} className="hover:bg-gray-50 transition-colors">
                      <td className="p-4 text-sm text-gray-600 whitespace-nowrap tabular-nums">
                        {dateText}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2 flex-wrap">
                          {circular.slug ? (
                            <Link
                              to={`/article/${circular.slug}`}
                              className="font-medium text-gray-900 hover:text-veteran-navy hover:underline"
                            >
                              {circular.title}
                            </Link>
                          ) : (
                            <span className="font-medium text-gray-900">
                              {circular.title}
                            </span>
                          )}
                          {circular.isNew && (
                            <span className="text-[10px] font-bold bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                              NEW
                            </span>
                          )}
                        </div>
                        {(circular.orderNumber || circular.issuingAuthority) && (
                          <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2">
                            {circular.orderNumber && <span>{circular.orderNumber}</span>}
                            {circular.orderNumber && circular.issuingAuthority && (
                              <span aria-hidden="true">·</span>
                            )}
                            {circular.issuingAuthority && (
                              <span>{circular.issuingAuthority}</span>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="p-4 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {circular.fileUrl ? (
                            <a
                              href={circular.fileUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 text-veteran-navy hover:text-veteran-olive font-medium text-sm border border-veteran-navy/20 px-3 py-1.5 rounded bg-white hover:bg-veteran-sand"
                            >
                              <Download className="w-4 h-4" /> Download PDF
                            </a>
                          ) : circular.slug ? (
                            <Link
                              to={`/article/${circular.slug}`}
                              className="inline-flex items-center gap-1 text-veteran-navy hover:text-veteran-olive font-medium text-sm border border-veteran-navy/20 px-3 py-1.5 rounded bg-white hover:bg-veteran-sand"
                            >
                              View Details <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          ) : (
                            <span className="text-gray-400 text-sm italic">Not applicable</span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-gray-500">
                    No matching circulars found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination
        currentPage={page}
        totalItems={filteredCirculars.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
