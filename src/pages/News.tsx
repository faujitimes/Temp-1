import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Newspaper, ArrowRight } from "lucide-react";
import { format } from "date-fns";
import { useContent } from "../context/ContentContext";
import { Pagination } from "../components/Pagination";
import { SEOHead } from "../components/SEOHead";

interface CombinedNewsItem {
  id: string;
  title: string;
  summary: string;
  date: string;
  author: string;
  imageUrl?: string | null;
  slug?: string;
}

const PAGE_SIZE = 9;

export function News() {
  const { news, publishedContent, contentLoading: loading } = useContent();
  const [page, setPage] = useState(1);

  const combinedNews = useMemo<CombinedNewsItem[]>(() => {
    const portalNews: CombinedNewsItem[] = publishedContent
      .filter((item) => item.contentType === "news" || item.categorySlug === "news")
      .map((item) => ({
        id: `pc_${item.id}`,
        title: item.title,
        summary: item.shortDescription || item.fullContent,
        date: item.publicationDate,
        author: item.issuingAuthority || "Faujitimes Editorial",
        imageUrl: item.featuredImageUrl,
        slug: item.slug,
      }));

    const seenTitles = new Set(portalNews.map((n) => n.title.trim().toLowerCase()));
    const legacyItems: CombinedNewsItem[] = news
      .filter((n) => !seenTitles.has(n.title.trim().toLowerCase()))
      .map((n) => ({
        id: `leg_${n.id}`,
        title: n.title,
        summary: n.content,
        date: n.date,
        author: n.author,
        imageUrl: n.imageUrl,
      }));

    return [...portalNews, ...legacyItems].sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
  }, [news, publishedContent]);

  const paginatedNews = combinedNews.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-8">
      <SEOHead
        title="News & Veteran Updates"
        description="Stay informed with the latest veteran news, policy announcements, and defense events curated on Faujitimes."
      />

      <div className="mb-8">
        <h1 className="text-3xl font-serif font-bold text-veteran-navy flex items-center gap-3 border-b-2 border-veteran-gold pb-3 inline-flex pr-8">
          <Newspaper className="w-8 h-8 text-veteran-olive" />
          News & Updates
        </h1>
        <p className="text-gray-600 mt-4 max-w-3xl">
          Stay informed with the latest news, announcements, and events curated by the board administration specifically for ex-servicemen and their dependents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          [1, 2, 3].map((i) => (
            <div key={i} className="h-64 bg-gray-200 animate-pulse rounded-lg"></div>
          ))
        ) : paginatedNews.length > 0 ? (
          paginatedNews.map((item) => {
            const parsedDate = new Date(item.date);
            const dateText = Number.isNaN(parsedDate.getTime())
              ? item.date
              : format(parsedDate, "dd MMM yyyy");
            return (
              <article
                key={item.id}
                className="bg-white rounded-lg shadow border border-gray-200 flex flex-col hover:border-veteran-olive transition-colors h-full overflow-hidden"
              >
                {item.imageUrl && (
                  <div className="h-48 w-full overflow-hidden border-b border-gray-100 bg-slate-100">
                    <img
                      src={item.imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                )}
                <div className="p-6 flex-1 flex flex-col">
                  <div className="flex-1">
                    <h2 className="text-xl font-bold text-veteran-navy mb-3 leading-tight">
                      {item.slug ? (
                        <Link
                          to={`/article/${item.slug}`}
                          className="hover:text-veteran-olive transition-colors"
                        >
                          {item.title}
                        </Link>
                      ) : (
                        item.title
                      )}
                    </h2>
                    <p className="text-gray-600 text-sm mb-4 leading-relaxed whitespace-pre-wrap line-clamp-5">
                      {item.summary}
                    </p>
                  </div>
                  <div className="pt-4 mt-auto border-t border-gray-100 flex items-center justify-between text-xs text-gray-500 font-medium">
                    <span className="truncate max-w-[160px]">{item.author}</span>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="tabular-nums">{dateText}</span>
                      {item.slug && (
                        <Link
                          to={`/article/${item.slug}`}
                          className="font-bold text-veteran-navy hover:text-veteran-olive inline-flex items-center gap-1"
                        >
                          Read <ArrowRight className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </article>
            );
          })
        ) : (
          <div className="col-span-full py-12 text-center text-gray-500 bg-white rounded border border-gray-200">
            No news articles published yet.
          </div>
        )}
      </div>

      <Pagination
        currentPage={page}
        totalItems={combinedNews.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
