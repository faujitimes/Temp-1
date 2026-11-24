import React, { useEffect, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { NewsArticle, PortalContentItem } from "../types";
import {
  FileText,
  ArrowRight,
  BellRing,
  Newspaper,
  ChevronLeft,
  ChevronRight,
  Star,
  Search,
  FolderOpen,
  Briefcase,
  Heart,
  Download,
} from "lucide-react";
import { format } from "date-fns";
import { useContent } from "../context/ContentContext";
import { PortalContentCard } from "../components/PortalContentCard";
import { SEOHead } from "../components/SEOHead";

import rallyImage from "../assets/images/indian_veterans_rally_1781435222866.jpg";
import healthcareImage from "../assets/images/military_healthcare_echs_1781435240503.jpg";

type UpdatesFilterTab =
  | "all"
  | "circulars"
  | "pension"
  | "echs"
  | "jobs"
  | "schemes"
  | "news";

interface ConsolidatedUpdateEntry {
  id: string;
  title: string;
  slug: string | null;
  detailUrl: string;
  categorySlug: string;
  categoryLabel: string;
  contentType: PortalContentItem["contentType"];
  issuingAuthority: string;
  date: string;
  orderNumber: string;
  pdfUrl: string | null;
  summaryBody: string;
  isFeatured: boolean;
}

const UPDATE_TABS: { key: UpdatesFilterTab; label: string }[] = [
  { key: "all", label: "All Updates" },
  { key: "circulars", label: "Circulars" },
  { key: "pension", label: "Pension" },
  { key: "echs", label: "ECHS" },
  { key: "jobs", label: "Jobs" },
  { key: "schemes", label: "Schemes" },
  { key: "news", label: "News" },
];

export function Home() {
  const {
    customTexts,
    circulars,
    news,
    categories,
    publishedContent,
    pdfLinks,
    contentLoading: loading,
  } = useContent();

  const navigate = useNavigate();
  const [activeSlide, setActiveSlide] = useState(0);
  const [heroSearchQuery, setHeroSearchQuery] = useState("");
  const [heroSearchCategory, setHeroSearchCategory] = useState("all");
  const [activeUpdatesTab, setActiveUpdatesTab] =
    useState<UpdatesFilterTab>("all");

  // Deduplicated, chronologically sorted (newest first) pool of all updates across categories
  const consolidatedUpdates = useMemo<ConsolidatedUpdateEntry[]>(() => {
    const entries: ConsolidatedUpdateEntry[] = [];
    const seenTitles = new Set<string>();

    const addEntry = (entry: ConsolidatedUpdateEntry) => {
      const normTitle = entry.title.trim().toLowerCase();
      if (!normTitle || seenTitles.has(normTitle)) return;
      seenTitles.add(normTitle);
      entries.push(entry);
    };

    // 1. Primary published items from Firestore central collection
    publishedContent.forEach((item) => {
      addEntry({
        id: `pc_${item.id}`,
        title: item.title,
        slug: item.slug,
        detailUrl: `/article/${item.slug}`,
        categorySlug: item.categorySlug,
        categoryLabel: item.categoryName,
        contentType: item.contentType,
        issuingAuthority: item.issuingAuthority,
        date: item.issueDate || item.publicationDate,
        orderNumber: item.orderNumber,
        pdfUrl: item.pdfAttachments[0]?.url || item.officialSourceUrl || null,
        summaryBody: item.fullContent || item.shortDescription || item.title,
        isFeatured: item.isFeatured,
      });
    });

    // 2. Any legacy circulars not already represented in publishedContent
    circulars.forEach((c) => {
      addEntry({
        id: `circ_${c.id}`,
        title: c.title,
        slug: null,
        detailUrl: "/circulars",
        categorySlug: "circulars",
        categoryLabel: "Government Orders and Circulars",
        contentType: "circular",
        issuingAuthority: "Department of Ex-Servicemen Welfare",
        date: c.date,
        orderNumber: "",
        pdfUrl: c.fileUrl || null,
        summaryBody: `${c.title}\nIssued by Department of Ex-Servicemen Welfare.`,
        isFeatured: c.isNew,
      });
    });

    // 3. Any legacy news not already represented in publishedContent
    news.forEach((n) => {
      addEntry({
        id: `news_${n.id}`,
        title: n.title,
        slug: null,
        detailUrl: "/news",
        categorySlug: "news",
        categoryLabel: "News and Updates",
        contentType: "news",
        issuingAuthority: n.author || "Faujitimes Editorial",
        date: n.date,
        orderNumber: "",
        pdfUrl: null,
        summaryBody: n.content || n.title,
        isFeatured: false,
      });
    });

    // Sort strictly newest first
    entries.sort((a, b) => {
      const aTime = new Date(a.date).getTime();
      const bTime = new Date(b.date).getTime();
      return (Number.isNaN(bTime) ? 0 : bTime) - (Number.isNaN(aTime) ? 0 : aTime);
    });

    return entries;
  }, [publishedContent, circulars, news]);

  const filteredLatestUpdates = useMemo(() => {
    const filtered = consolidatedUpdates.filter((item) => {
      switch (activeUpdatesTab) {
        case "circulars":
          return (
            item.categorySlug === "circulars" ||
            item.contentType === "circular" ||
            item.contentType === "order"
          );
        case "pension":
          return item.categorySlug === "pension";
        case "echs":
          return item.categorySlug === "echs";
        case "jobs":
          return (
            item.categorySlug === "employment" ||
            item.contentType === "employment"
          );
        case "schemes":
          return (
            item.categorySlug === "welfare-schemes" ||
            item.contentType === "scheme"
          );
        case "news":
          return item.categorySlug === "news" || item.contentType === "news";
        case "all":
        default:
          return true;
      }
    });
    return filtered.slice(0, 10);
  }, [consolidatedUpdates, activeUpdatesTab]);

  // Combine published portal news + legacy news for hero Important Latest News card
  const combinedNews = useMemo<NewsArticle[]>(() => {
    const portalNews = publishedContent
      .filter(
        (item) => item.contentType === "news" || item.categorySlug === "news"
      )
      .map((item) => ({
        id: item.id,
        title: item.title,
        content: item.shortDescription || item.fullContent,
        date: item.publicationDate,
        author: item.issuingAuthority || "Faujitimes Editorial",
        imageUrl: item.featuredImageUrl,
        slug: item.slug,
      }));
    const seen = new Set(portalNews.map((n) => n.title.toLowerCase()));
    const legacyExtra = news.filter((n) => !seen.has(n.title.toLowerCase()));
    return [...portalNews, ...legacyExtra];
  }, [publishedContent, news]);

  const recentNews = combinedNews.slice(0, 3);
  const latestTickerItems = consolidatedUpdates.slice(0, 5);

  // Employment Opportunities (latest 3–4 items, newest first)
  const employmentItems = useMemo(() => {
    return publishedContent
      .filter(
        (item) =>
          item.contentType === "employment" || item.categorySlug === "employment"
      )
      .sort(
        (a, b) =>
          new Date(b.publicationDate).getTime() -
          new Date(a.publicationDate).getTime()
      )
      .slice(0, 4);
  }, [publishedContent]);

  // Featured Welfare Schemes (2–3 items, prioritizing isFeatured)
  const featuredSchemes = useMemo(() => {
    const schemeItems = publishedContent.filter(
      (item) =>
        item.contentType === "scheme" ||
        item.categorySlug === "welfare-schemes"
    );
    const prioritized = [...schemeItems].sort((a, b) => {
      if (a.isFeatured !== b.isFeatured) return a.isFeatured ? -1 : 1;
      return (
        new Date(b.publicationDate).getTime() -
        new Date(a.publicationDate).getTime()
      );
    });
    return prioritized.slice(0, 3);
  }, [publishedContent]);

  // Reference Manuals / Handbooks for Important Documents (no duplication with Latest Updates)
  const referenceDocuments = useMemo(() => {
    const labelOverrides: Record<string, string> = {
      echs_rules: "ECHS Policy Guidelines",
      csd_orders: "CSD Entitlement Guidelines",
      sparsh_faq: "SPARSH Pension Claims Manual",
    };

    const coreManuals = pdfLinks.map((pdf) => ({
      id: pdf.id,
      title: labelOverrides[pdf.id] || pdf.name,
      subtitle: "Official Reference Manual & Entitlement Handbook",
      url: pdf.url,
      isExternal: true,
    }));

    return [
      ...coreManuals,
      {
        id: "pension_regulations_manual",
        title: "Pension Regulations for the Armed Forces",
        subtitle: "Service, Family & Disability Pension Regulatory Compendium",
        url: "/category/pension",
        isExternal: false,
      },
    ];
  }, [pdfLinks]);

  useEffect(() => {
    if (recentNews.length === 0) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % recentNews.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [recentNews.length]);

  const getNewsImage = (article: NewsArticle, index: number) => {
    if (article.imageUrl) return article.imageUrl;
    const titleLower = article.title.toLowerCase();
    if (
      titleLower.includes("echs") ||
      titleLower.includes("medical") ||
      titleLower.includes("healthcare") ||
      titleLower.includes("health")
    ) {
      return healthcareImage;
    }
    if (
      titleLower.includes("rally") ||
      titleLower.includes("veteran") ||
      titleLower.includes("day") ||
      titleLower.includes("gather")
    ) {
      return rallyImage;
    }
    return index % 2 === 0 ? rallyImage : healthcareImage;
  };

  const formatSafeDate = (val: string) => {
    const parsed = new Date(val);
    return Number.isNaN(parsed.getTime()) ? val : format(parsed, "dd MMM yyyy");
  };

  const handleHeroSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (heroSearchQuery.trim()) params.set("q", heroSearchQuery.trim());
    if (heroSearchCategory !== "all")
      params.set("category", heroSearchCategory);
    navigate(`/search${params.toString() ? `?${params.toString()}` : ""}`);
  };

  const handleDownloadSummary = (entry: ConsolidatedUpdateEntry) => {
    const contentLines = [
      "FAUJITIMES - EX-SERVICEMEN WELFARE INFORMATION PORTAL",
      "=====================================================",
      `Title: ${entry.title}`,
      `Category: ${entry.categoryLabel}`,
      `Issuing Authority: ${entry.issuingAuthority}`,
      `Issue Date: ${formatSafeDate(entry.date)}`,
      entry.orderNumber ? `Reference / Order No.: ${entry.orderNumber}` : "",
      "",
      entry.summaryBody,
    ]
      .filter((line) => line !== undefined)
      .join("\n");

    const blob = new Blob([contentLines], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    const safeName = (entry.slug || entry.id).replace(/[^a-zA-Z0-9_-]/g, "_");
    link.download = `${safeName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col">
      <SEOHead
        title="Faujitimes – Ex-Servicemen Welfare Information Portal"
        description={
          customTexts.home_hero_subtitle ||
          "Centralized Ex-Servicemen welfare portal for pension rules, ECHS, CSD, government circulars, employment opportunities, and schemes."
        }
        jsonLd={{
          "@context": "https://schema.org",
          "@type": "WebSite",
          name: "Faujitimes – Ex-Servicemen Welfare Information Portal",
          description: customTexts.home_hero_subtitle,
        }}
      />

      {/* Flash updates / Marquee */}
      {latestTickerItems.length > 0 && (
        <div className="bg-veteran-maroon text-white px-4 py-2 flex items-center shadow-inner">
          <div className="font-bold whitespace-nowrap flex items-center gap-2 mr-4 shrink-0 text-xs sm:text-sm">
            <BellRing className="w-4 h-4 animate-pulse" />
            LATEST:
          </div>
          <div className="overflow-hidden flex-1 relative">
            <div className="animate-[marquee_22s_linear_infinite] whitespace-nowrap flex gap-8 text-xs sm:text-sm">
              {latestTickerItems.map((c) => (
                <span key={c.id}>
                  • {c.title} ({formatSafeDate(c.date)})
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 1. Hero Section (Reduced height ~10–15%, preserved identity & balance) */}
      <section className="bg-veteran-navy py-8 lg:py-11 shadow-lg border-b-4 border-veteran-gold/80 relative overflow-hidden text-left">
        <div className="absolute inset-0 opacity-10 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-white to-transparent pointer-events-none" />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
            {/* Left side: Heading, intro & About Faujitimes */}
            <div className="space-y-4">
              <span className="inline-flex items-center gap-1.5 text-veteran-gold text-xs font-bold uppercase tracking-wider">
                <Star className="w-3.5 h-3.5 fill-veteran-gold" /> Official Info Portal
              </span>
              <h1 className="text-3xl md:text-5xl font-serif font-extrabold text-white leading-tight text-balance">
                {customTexts.home_hero_title ||
                  "Honoring Service. Empowering Veterans."}
              </h1>
              <p className="text-base md:text-lg text-gray-200 font-light leading-relaxed max-w-xl">
                {customTexts.home_hero_subtitle ||
                  "Your trusted information hub for ex-servicemen, veterans and their families. Access govt circulars, pension updates, welfare schemes and employment opportunities."}
              </p>
              <div className="pt-1">
                <Link
                  to="/about"
                  className="inline-flex items-center gap-2 min-h-[42px] bg-veteran-gold hover:bg-yellow-400 text-veteran-navy font-bold px-5 py-2.5 rounded shadow-md transition-colors text-xs uppercase tracking-wider whitespace-nowrap"
                >
                  About Faujitimes <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>

            {/* Right side: Important Latest News Slider */}
            <div className="bg-slate-900/60 border border-white/10 rounded-2xl p-4 sm:p-5 backdrop-blur-md relative overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2">
                <h2 className="text-sm font-bold text-veteran-gold uppercase tracking-widest flex items-center gap-2">
                  <Newspaper className="w-4 h-4" /> Important Latest News
                </h2>
                {recentNews.length > 1 && (
                  <div className="flex gap-1">
                    <button
                      type="button"
                      aria-label="Previous news slide"
                      onClick={() =>
                        setActiveSlide(
                          (prev) =>
                            (prev - 1 + recentNews.length) % recentNews.length
                        )
                      }
                      className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      aria-label="Next news slide"
                      onClick={() =>
                        setActiveSlide((prev) => (prev + 1) % recentNews.length)
                      }
                      className="p-1.5 rounded bg-white/10 hover:bg-white/20 text-white transition-colors"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>

              {loading ? (
                <div className="h-44 flex items-center justify-center text-gray-400">
                  Loading...
                </div>
              ) : recentNews.length > 0 ? (
                <div>
                  {recentNews.map((article, idx) => {
                    if (idx !== activeSlide) return null;
                    const itemImage = getNewsImage(article, idx);
                    const articleSlug = (
                      article as NewsArticle & { slug?: string }
                    ).slug;
                    return (
                      <div key={article.id} className="space-y-3">
                        <div className="relative h-40 sm:h-44 rounded-lg overflow-hidden border border-white/10 group">
                          <img
                            src={itemImage}
                            alt={article.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-transparent to-transparent w-full p-3 flex items-end">
                            <span className="bg-veteran-maroon text-white font-bold text-[10px] uppercase tracking-wider px-2 py-0.5 rounded">
                              FEATURED UPDATE
                            </span>
                          </div>
                        </div>
                        <div className="space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-gray-400 tabular-nums">
                            <span>
                              Published: {formatSafeDate(article.date)}
                            </span>
                            <span>By {article.author}</span>
                          </div>
                          <h3 className="text-base sm:text-lg font-bold text-white leading-snug line-clamp-1">
                            {article.title}
                          </h3>
                          <p className="text-xs sm:text-sm text-gray-300 line-clamp-2 leading-relaxed">
                            {article.content}
                          </p>
                          <div className="pt-1 text-right">
                            <Link
                              to={
                                articleSlug
                                  ? `/article/${articleSlug}`
                                  : "/category/news"
                              }
                              className="text-xs font-bold text-veteran-gold hover:underline inline-flex items-center gap-1"
                            >
                              Read Full Article{" "}
                              <ArrowRight className="w-3.5 h-3.5" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="flex justify-center gap-1.5 mt-3">
                    {recentNews.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        aria-label={`Go to slide ${idx + 1}`}
                        onClick={() => setActiveSlide(idx)}
                        className={`h-2 rounded-full transition-all ${
                          idx === activeSlide
                            ? "bg-veteran-gold w-5"
                            : "bg-white/25 w-2"
                        }`}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-gray-400 font-light italic">
                  No news articles posted yet.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 2A. Prominent Search Bar Section */}
      <section className="bg-veteran-sand border-b border-gray-200 py-5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6">
          <form
            onSubmit={handleHeroSearch}
            className="bg-white border-2 border-veteran-navy/25 focus-within:border-veteran-navy rounded-xl shadow-md p-2 flex flex-col md:flex-row gap-2 items-stretch transition-colors"
          >
            <div className="flex-1 relative">
              <Search className="w-5 h-5 text-veteran-navy/70 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={heroSearchQuery}
                onChange={(e) => setHeroSearchQuery(e.target.value)}
                placeholder="Search circulars, order numbers, SPARSH pension, ECHS, CSD, jobs or schemes..."
                className="w-full pl-11 pr-4 py-3 rounded-lg text-sm font-medium text-gray-900 placeholder:text-gray-500 outline-none bg-transparent"
              />
            </div>

            <select
              value={heroSearchCategory}
              onChange={(e) => setHeroSearchCategory(e.target.value)}
              aria-label="Filter search by category"
              className="px-3.5 py-3 border border-gray-200 rounded-lg text-sm font-medium bg-slate-50 text-gray-800 focus:ring-1 focus:ring-veteran-navy outline-none md:w-64"
            >
              <option value="all">All Categories</option>
              {categories.map((cat) => (
                <option key={cat.id} value={cat.slug}>
                  {cat.name}
                </option>
              ))}
            </select>

            <button
              type="submit"
              className="px-6 py-3 bg-veteran-navy hover:bg-veteran-navy-light text-white font-bold text-xs uppercase tracking-wider rounded-lg shadow transition-colors inline-flex items-center justify-center gap-2 whitespace-nowrap min-h-[44px] shrink-0"
            >
              <Search className="w-4 h-4 text-veteran-gold" /> Search Portal
            </button>
          </form>
        </div>
      </section>

      {/* 2B. Browse By Category (Compact Grid preserving all 7 cards) */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-veteran-gold pb-2.5 mb-5 gap-2">
          <div>
            <h2 className="text-2xl font-serif font-bold text-veteran-navy flex items-center gap-2">
              <FolderOpen className="w-6 h-6 text-veteran-olive" />
              Browse by Category
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Select a veteran information hub to browse verified circulars, orders, and welfare resources.
            </p>
          </div>
          <Link
            to="/search"
            className="text-xs font-bold text-veteran-navy hover:text-veteran-olive uppercase tracking-wider inline-flex items-center gap-1 whitespace-nowrap"
          >
            Advanced Search & Filters <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
          {categories.map((cat) => {
            const count = publishedContent.filter(
              (item) => item.categorySlug === cat.slug
            ).length;
            return (
              <Link
                key={cat.id}
                to={`/category/${cat.slug}`}
                className="bg-white p-4 rounded-lg border border-gray-200 hover:border-veteran-navy hover:shadow-xs transition-all flex flex-col justify-between group"
              >
                <div>
                  <h3 className="font-serif font-bold text-base text-veteran-navy group-hover:text-veteran-olive transition-colors mb-1.5">
                    {cat.name}
                  </h3>
                  <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                    {cat.description}
                  </p>
                </div>
                <div className="mt-3 pt-2.5 border-t border-gray-100 flex items-center justify-between text-xs">
                  <span className="text-gray-500 tabular-nums">
                    {count} {count === 1 ? "entry" : "entries"}
                  </span>
                  <span className="font-bold text-veteran-olive inline-flex items-center gap-1">
                    Open <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Consolidated Full-Width Section: Latest Updates & Notifications */}
      <section className="py-6 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between border-b-2 border-veteran-navy pb-2.5 mb-4 gap-3">
          <div>
            <h2 className="text-2xl font-serif font-bold text-veteran-navy flex items-center gap-2">
              <FileText className="w-6 h-6 text-veteran-olive" />
              Latest Updates & Notifications
            </h2>
            <p className="text-xs text-gray-600 mt-1">
              Latest published circulars, pension revisions, ECHS/CSD directives, jobs, schemes, and veteran news in chronological order.
            </p>
          </div>
          <Link
            to="/search"
            className="text-sm font-bold text-veteran-navy hover:text-veteran-olive inline-flex items-center gap-1 whitespace-nowrap shrink-0"
          >
            View All Updates <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {/* Category Filter Tabs */}
        <div
          role="tablist"
          aria-label="Filter latest updates by category"
          className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-4"
        >
          {UPDATE_TABS.map((tab) => {
            const active = activeUpdatesTab === tab.key;
            return (
              <button
                key={tab.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setActiveUpdatesTab(tab.key)}
                className={`min-h-[40px] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider transition-colors whitespace-nowrap shrink-0 border ${
                  active
                    ? "bg-veteran-navy text-white border-veteran-navy shadow-2xs"
                    : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50 hover:text-veteran-navy"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Full-Width Consolidated Feed (8–10 entries, zero duplicate items) */}
        {loading ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="p-4 h-20 animate-pulse bg-slate-50" />
            ))}
          </div>
        ) : filteredLatestUpdates.length > 0 ? (
          <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
            {filteredLatestUpdates.map((item) => (
              <div
                key={item.id}
                className="p-4 sm:px-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-gray-500 tabular-nums">
                    <span className="font-bold uppercase tracking-wider text-veteran-olive">
                      {item.categoryLabel}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{item.issuingAuthority}</span>
                    <span aria-hidden="true">·</span>
                    <span>Issued: {formatSafeDate(item.date)}</span>
                    {item.orderNumber && (
                      <>
                        <span aria-hidden="true">·</span>
                        <span className="font-medium text-gray-700">
                          {item.orderNumber}
                        </span>
                      </>
                    )}
                  </div>

                  <Link
                    to={item.detailUrl}
                    className="block font-serif font-bold text-base text-veteran-navy hover:text-veteran-olive transition-colors leading-snug"
                  >
                    {item.title}
                  </Link>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <Link
                    to={item.detailUrl}
                    className="min-h-[40px] px-3.5 py-2 border border-gray-300 bg-white hover:bg-veteran-sand text-veteran-navy rounded text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                  >
                    View Details <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                  {item.pdfUrl ? (
                    <a
                      href={item.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      download
                      className="min-h-[40px] px-3.5 py-2 bg-veteran-olive hover:bg-veteran-olive-dark text-white rounded text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </a>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleDownloadSummary(item)}
                      className="min-h-[40px] px-3.5 py-2 bg-veteran-olive hover:bg-veteran-olive-dark text-white rounded text-xs font-bold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap"
                    >
                      <Download className="w-3.5 h-3.5" /> Download
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-lg border border-gray-200 p-10 text-center text-sm text-gray-500">
            No updates published in this category yet.
          </div>
        )}
      </section>

      {/* 4 & 5. Important Documents (Reference Manuals Only) & Employment Opportunities */}
      <section className="py-8 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* 4. Important Documents (Exclusively Reference Manuals & Handbooks) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-veteran-gold pb-2">
              <h2 className="text-2xl font-serif font-bold text-veteran-navy flex items-center gap-2">
                <Download className="w-5 h-5 text-veteran-olive" />
                Important Documents
              </h2>
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                Reference Manuals
              </span>
            </div>

            <div className="bg-white rounded-lg border border-gray-200 divide-y divide-gray-100">
              {referenceDocuments.map((docItem) => (
                <div
                  key={docItem.id}
                  className="p-4 flex items-center justify-between gap-4 hover:bg-gray-50 transition-colors"
                >
                  <div className="min-w-0">
                    <p className="font-serif font-bold text-sm text-veteran-navy truncate">
                      {docItem.title}
                    </p>
                    <p className="text-xs text-gray-500 mt-0.5 truncate">
                      {docItem.subtitle}
                    </p>
                  </div>
                  {docItem.isExternal ? (
                    <a
                      href={docItem.url}
                      target="_blank"
                      rel="noreferrer"
                      className="shrink-0 min-h-[38px] px-3.5 py-2 bg-veteran-navy hover:bg-veteran-navy-light text-white rounded text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" /> Open Manual
                    </a>
                  ) : (
                    <Link
                      to={docItem.url}
                      className="shrink-0 min-h-[38px] px-3.5 py-2 bg-veteran-navy hover:bg-veteran-navy-light text-white rounded text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap transition-colors"
                    >
                      Browse Manual <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* 5. Employment Opportunities (Latest 3–4 Openings) */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b-2 border-veteran-olive pb-2">
              <h2 className="text-2xl font-serif font-bold text-veteran-navy flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-veteran-olive" />
                Employment Opportunities
              </h2>
              <Link
                to="/category/employment"
                className="text-xs font-bold text-veteran-navy hover:text-veteran-olive uppercase tracking-wider whitespace-nowrap"
              >
                All Jobs
              </Link>
            </div>

            <div className="space-y-3">
              {employmentItems.length > 0 ? (
                employmentItems.map((job) => (
                  <div
                    key={job.id}
                    className="bg-white p-4 rounded-lg border border-gray-200 hover:border-veteran-olive transition-colors space-y-2"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-gray-500 tabular-nums">
                      <span className="font-bold text-veteran-olive">
                        {job.issuingAuthority}
                      </span>
                      <span>
                        {job.orderNumber
                          ? job.orderNumber
                          : `Published: ${formatSafeDate(job.publicationDate)}`}
                      </span>
                    </div>
                    <h3 className="font-serif font-bold text-base text-veteran-navy leading-snug">
                      {job.title}
                    </h3>
                    <p className="text-xs text-gray-600 line-clamp-2 leading-relaxed">
                      {job.shortDescription}
                    </p>
                    <div className="pt-1 flex justify-end">
                      <Link
                        to={`/article/${job.slug}`}
                        className="text-xs font-bold text-veteran-navy hover:text-veteran-olive inline-flex items-center gap-1 whitespace-nowrap"
                      >
                        View Details <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>
                  </div>
                ))
              ) : (
                <div className="bg-white p-8 rounded-lg border border-gray-200 text-center text-sm text-gray-500">
                  No active employment notifications right now.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* 6. Featured Welfare Schemes (2–3 schemes with short descriptions & Read More) */}
      <section className="py-8 pb-14 max-w-7xl mx-auto px-4 sm:px-6 w-full">
        <div className="flex items-center justify-between border-b-2 border-veteran-navy pb-2 mb-6">
          <h2 className="text-2xl font-serif font-bold text-veteran-navy flex items-center gap-2">
            <Heart className="w-6 h-6 text-veteran-maroon" />
            Featured Welfare Schemes
          </h2>
          <Link
            to="/category/welfare-schemes"
            className="text-sm font-semibold text-veteran-navy hover:text-veteran-olive flex items-center gap-1 whitespace-nowrap"
          >
            View All Schemes <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {featuredSchemes.map((scheme) => (
            <PortalContentCard
              key={scheme.id}
              item={scheme}
              showImage={Boolean(scheme.featuredImageUrl)}
            />
          ))}
        </div>
      </section>
    </div>
  );
}
