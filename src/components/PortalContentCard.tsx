import { Link } from "react-router-dom";
import { format } from "date-fns";
import { ArrowRight, Download, FileText } from "lucide-react";
import { PortalContentItem } from "../types";

interface PortalContentCardProps {
  key?: string | number;
  item: PortalContentItem;
  showImage?: boolean;
}

const CONTENT_TYPE_LABELS: Record<PortalContentItem["contentType"], string> = {
  article: "Article",
  circular: "Circular",
  order: "Govt. Order",
  scheme: "Welfare Scheme",
  news: "News Update",
  employment: "Employment",
};

export function PortalContentCard({ item, showImage = false }: PortalContentCardProps) {
  const formattedDate = (() => {
    const parsed = new Date(item.publicationDate);
    return Number.isNaN(parsed.getTime())
      ? item.publicationDate
      : format(parsed, "dd MMM yyyy");
  })();

  return (
    <article className="bg-white rounded-lg border border-gray-200 hover:border-veteran-olive transition-colors flex flex-col overflow-hidden h-full">
      {showImage && item.featuredImageUrl && (
        <Link
          to={`/article/${item.slug}`}
          className="block h-44 w-full overflow-hidden border-b border-gray-100 bg-slate-100"
        >
          <img
            src={item.featuredImageUrl}
            alt={item.title}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
          />
        </Link>
      )}

      <div className="p-5 flex-1 flex flex-col">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-500 mb-2 tabular-nums">
          <span className="font-semibold text-veteran-olive uppercase tracking-wider">
            {CONTENT_TYPE_LABELS[item.contentType] || "Update"}
          </span>
          <span aria-hidden="true">·</span>
          <span>{formattedDate}</span>
          {item.orderNumber && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-gray-700">{item.orderNumber}</span>
            </>
          )}
        </div>

        <Link to={`/article/${item.slug}`} className="group">
          <h3 className="text-lg font-serif font-bold text-veteran-navy group-hover:text-veteran-olive transition-colors leading-snug mb-2">
            {item.title}
          </h3>
        </Link>

        <p className="text-sm text-gray-600 line-clamp-3 leading-relaxed mb-4 flex-1">
          {item.shortDescription}
        </p>

        <div className="pt-3 mt-auto border-t border-gray-100 flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="text-gray-500 truncate max-w-[200px]">
            {item.issuingAuthority}
          </span>

          <div className="flex items-center gap-3">
            {item.pdfAttachments.length > 0 && (
              <a
                href={item.pdfAttachments[0].url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 font-semibold text-veteran-olive hover:underline whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" /> PDF
              </a>
            )}
            <Link
              to={`/article/${item.slug}`}
              className="inline-flex items-center gap-1 font-bold text-veteran-navy hover:text-veteran-olive whitespace-nowrap"
            >
              Read More <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

export function CompactContentRow({ item }: { key?: string | number; item: PortalContentItem }) {
  const formattedDate = (() => {
    const parsed = new Date(item.publicationDate);
    return Number.isNaN(parsed.getTime())
      ? item.publicationDate
      : format(parsed, "dd MMM yyyy");
  })();

  return (
    <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-gray-50 transition-colors">
      <div className="min-w-0 space-y-1">
        <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 tabular-nums">
          <span>{formattedDate}</span>
          <span aria-hidden="true">·</span>
          <span>{item.issuingAuthority}</span>
          {item.orderNumber && (
            <>
              <span aria-hidden="true">·</span>
              <span className="font-medium text-gray-700">{item.orderNumber}</span>
            </>
          )}
        </div>
        <Link
          to={`/article/${item.slug}`}
          className="block font-semibold text-gray-900 hover:text-veteran-navy leading-snug"
        >
          {item.title}
        </Link>
        {item.shortDescription && (
          <p className="text-xs text-gray-600 line-clamp-1">{item.shortDescription}</p>
        )}
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {item.pdfAttachments.length > 0 && (
          <a
            href={item.pdfAttachments[0].url}
            target="_blank"
            rel="noreferrer"
            className="min-h-[36px] px-3 py-1.5 bg-veteran-olive text-white rounded text-xs font-semibold hover:bg-veteran-olive-dark transition-colors inline-flex items-center gap-1.5 whitespace-nowrap"
          >
            <FileText className="w-3.5 h-3.5" /> Download PDF
          </a>
        )}
        <Link
          to={`/article/${item.slug}`}
          className="min-h-[36px] px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-veteran-navy rounded text-xs font-semibold inline-flex items-center gap-1 whitespace-nowrap"
        >
          Details <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>
    </div>
  );
}
