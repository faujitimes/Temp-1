import { useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import { format } from "date-fns";
import {
  ArrowLeft,
  Download,
  ExternalLink,
  FileText,
  Building2,
  Calendar,
  Hash,
} from "lucide-react";
import { useContent } from "../context/ContentContext";
import { PortalContentCard } from "../components/PortalContentCard";
import { SEOHead } from "../components/SEOHead";

export function ArticleDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const { publishedContent, allAdminContent, isAdmin, contentLoading } = useContent();

  // Public sees only published items; logged-in admins can also preview drafts
  const pool = isAdmin ? allAdminContent : publishedContent;
  const article = pool.find((item) => item.slug === slug || item.id === slug);

  const relatedArticles = useMemo(() => {
    if (!article) return [];
    const sameCategory = publishedContent.filter(
      (item) => item.id !== article.id && item.categorySlug === article.categorySlug
    );
    if (sameCategory.length >= 3) return sameCategory.slice(0, 3);
    const others = publishedContent.filter(
      (item) => item.id !== article.id && item.categorySlug !== article.categorySlug
    );
    return [...sameCategory, ...others].slice(0, 3);
  }, [article, publishedContent]);

  const formatReadableDate = (val: string) => {
    const d = new Date(val);
    return Number.isNaN(d.getTime()) ? val : format(d, "dd MMM yyyy");
  };

  if (contentLoading) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-12 space-y-4">
        <div className="h-8 w-2/3 bg-gray-200 animate-pulse rounded" />
        <div className="h-4 w-1/2 bg-gray-200 animate-pulse rounded" />
        <div className="h-64 bg-gray-200 animate-pulse rounded-lg" />
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-4xl mx-auto px-4 sm:px-6 w-full py-16 text-center space-y-4">
        <SEOHead
          title="Article Not Found"
          description="The requested article or circular is not available."
        />
        <h1 className="text-3xl font-serif font-bold text-veteran-navy">
          Document Not Found
        </h1>
        <p className="text-sm text-gray-600">
          This article or circular may have been unpublished or moved.
        </p>
        <Link
          to="/"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-veteran-navy text-white text-xs font-bold uppercase tracking-wider rounded"
        >
          <ArrowLeft className="w-4 h-4" /> Back to Home
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 w-full py-10">
      <SEOHead
        title={article.title}
        description={article.shortDescription || article.title}
        type="article"
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "Article",
          headline: article.title,
          description: article.shortDescription,
          datePublished: article.publicationDate,
          author: {
            "@type": "Organization",
            name: article.issuingAuthority,
          },
        }}
      />

      {/* Breadcrumbs */}
      <nav aria-label="Breadcrumb" className="flex flex-wrap items-center gap-2 text-xs text-gray-500 mb-6">
        <Link to="/" className="hover:text-veteran-navy font-medium">
          Home
        </Link>
        <span aria-hidden="true">/</span>
        <Link
          to={`/category/${article.categorySlug}`}
          className="hover:text-veteran-navy font-medium"
        >
          {article.categoryName}
        </Link>
        {article.subcategory && (
          <>
            <span aria-hidden="true">/</span>
            <span>{article.subcategory}</span>
          </>
        )}
      </nav>

      {article.status === "draft" && (
        <div className="mb-6 p-3 bg-amber-50 border border-amber-300 rounded-lg text-xs font-bold text-amber-900">
          Draft Preview — This entry is currently saved as a draft and is not visible to public visitors.
        </div>
      )}

      {/* Main Article Surface */}
      <article className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-xs">
        {article.featuredImageUrl && (
          <div className="max-h-[420px] w-full overflow-hidden border-b border-gray-100 bg-slate-100">
            <img
              src={article.featuredImageUrl}
              alt={article.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}

        <div className="p-6 sm:p-10">
          {/* Unboxed Metadata Line */}
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5 text-xs text-gray-500 mb-4 tabular-nums">
            <span className="font-bold uppercase tracking-wider text-veteran-olive">
              {article.categoryName}
            </span>
            {article.subcategory && (
              <>
                <span aria-hidden="true">·</span>
                <span>{article.subcategory}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span className="inline-flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-gray-400" />
              Published {formatReadableDate(article.publicationDate)}
            </span>
          </div>

          {/* Article Title */}
          <h1 className="text-3xl sm:text-4xl font-serif font-bold text-veteran-navy leading-tight mb-5 text-balance">
            {article.title}
          </h1>

          {/* Structured Official Metadata Grid */}
          <dl className="grid grid-cols-1 sm:grid-cols-3 gap-4 py-4 px-5 bg-veteran-sand rounded-lg border border-gray-200 mb-8 text-xs">
            <div>
              <dt className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Building2 className="w-3.5 h-3.5 text-veteran-olive" /> Issuing Authority
              </dt>
              <dd className="font-bold text-gray-900">{article.issuingAuthority}</dd>
            </div>
            <div>
              <dt className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Calendar className="w-3.5 h-3.5 text-veteran-olive" /> Date of Issue
              </dt>
              <dd className="font-bold text-gray-900 tabular-nums">
                {formatReadableDate(article.issueDate)}
              </dd>
            </div>
            <div>
              <dt className="text-gray-500 font-semibold uppercase tracking-wider flex items-center gap-1.5 mb-1">
                <Hash className="w-3.5 h-3.5 text-veteran-olive" /> Circular / Order No.
              </dt>
              <dd className="font-bold text-gray-900 tabular-nums">
                {article.orderNumber || "Not applicable"}
              </dd>
            </div>
          </dl>

          {/* Short Description Lead */}
          {article.shortDescription && (
            <p className="text-lg text-gray-700 font-medium leading-relaxed mb-6 pb-6 border-b border-gray-100 max-w-3xl">
              {article.shortDescription}
            </p>
          )}

          {/* Main Full Content */}
          <div className="max-w-3xl space-y-4 text-gray-700 text-base leading-relaxed whitespace-pre-wrap">
            {article.fullContent}
          </div>

          {/* PDF Attachments & Official Source Link */}
          {(article.pdfAttachments.length > 0 || article.officialSourceUrl) && (
            <div className="mt-10 pt-8 border-t border-gray-200 space-y-6">
              {article.pdfAttachments.length > 0 && (
                <div>
                  <h2 className="text-sm font-bold uppercase tracking-wider text-veteran-navy mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-veteran-olive" />
                    Downloadable PDF Attachments
                  </h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {article.pdfAttachments.map((att, idx) => (
                      <a
                        key={`${att.url}-${idx}`}
                        href={att.url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center justify-between gap-3 p-3.5 rounded-lg border border-gray-200 bg-slate-50 hover:bg-veteran-sand hover:border-veteran-olive transition-colors group"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <FileText className="w-5 h-5 text-veteran-maroon shrink-0" />
                          <span className="text-sm font-semibold text-gray-900 truncate group-hover:text-veteran-navy">
                            {att.name}
                          </span>
                        </div>
                        <span className="shrink-0 inline-flex items-center gap-1 text-xs font-bold text-veteran-olive">
                          <Download className="w-4 h-4" /> Download
                        </span>
                      </a>
                    ))}
                  </div>
                </div>
              )}

              {article.officialSourceUrl && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-lg bg-veteran-navy/5 border border-veteran-navy/15">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-veteran-navy">
                      Official Government Source
                    </h3>
                    <p className="text-xs text-gray-600 mt-0.5 break-all">
                      {article.officialSourceUrl}
                    </p>
                  </div>
                  <a
                    href={article.officialSourceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="shrink-0 px-4 py-2.5 bg-veteran-navy hover:bg-veteran-navy-light text-white text-xs font-bold uppercase tracking-wider rounded inline-flex items-center justify-center gap-2 transition-colors"
                  >
                    Visit Official Source <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>
      </article>

      {/* Related Articles */}
      {relatedArticles.length > 0 && (
        <section className="mt-12">
          <div className="flex items-center justify-between border-b-2 border-veteran-olive pb-2 mb-6">
            <h2 className="text-2xl font-serif font-bold text-veteran-navy">
              Related Articles & Circulars
            </h2>
            <Link
              to={`/category/${article.categorySlug}`}
              className="text-xs font-bold text-veteran-navy hover:text-veteran-olive uppercase tracking-wider"
            >
              View Category
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {relatedArticles.map((rel) => (
              <PortalContentCard
                key={rel.id}
                item={rel}
                showImage={Boolean(rel.featuredImageUrl)}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
