import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Heart,
  BadgeIndianRupee,
  Stethoscope,
  GraduationCap,
  Home as HomeIcon,
  ArrowRight,
  Download,
} from "lucide-react";
import { useContent } from "../context/ContentContext";
import { Pagination } from "../components/Pagination";
import { SEOHead } from "../components/SEOHead";

const fallbackSchemes = [
  {
    id: "1",
    title: "Ex-Servicemen Contributory Health Scheme (ECHS)",
    description:
      "Comprehensive medicare for ex-servicemen pensioners and their dependents through a network of ECHS Polyclinics and empanelled private hospitals, ensuring cashless medical treatment.",
    eligibility: "ESM drawing pension from defense estimates and their dependents.",
    icon: Stethoscope,
    slug: "echs-empanelled-hospitals-referral-norms-2026",
    pdfUrl: null as string | null,
  },
  {
    id: "2",
    title: "Prime Minister's Scholarship Scheme (PMSS)",
    description:
      "Financial assistance for higher technical and professional education for the dependent wards & widows of ex-servicemen and ex-coast guard personnel.",
    eligibility: "Wards/widows of ESM below officer rank (PBOR). Minimum 60% marks in 10+2.",
    icon: GraduationCap,
    slug: "pm-scholarship-scheme-pmss-ksb-online-application",
    pdfUrl: null as string | null,
  },
  {
    id: "3",
    title: "Financial Assistance to Non-Pensioners",
    description:
      "Monthly financial aid provided from the Armed Forces Flag Day Fund (AFFDF) to ESM/Widows who are in Penury or non-pensioners above a certain age.",
    eligibility: "Non-pensioner ESM/Widow without any other source of income.",
    icon: BadgeIndianRupee,
    slug: "rmewf-penury-education-marriage-grant-guidelines",
    pdfUrl: null as string | null,
  },
  {
    id: "4",
    title: "Raksha Mantri Ex-Servicemen Welfare Fund (RMEWF)",
    description:
      "A wide range of grants including marriage grant, medical grant, orphan grant, and vocational training grant administered through KSB.",
    eligibility: "Varies by specific grant type. Registered with ZSB.",
    icon: Heart,
    slug: "rmewf-penury-education-marriage-grant-guidelines",
    pdfUrl: null as string | null,
  },
  {
    id: "5",
    title: "AWHO Housing Schemes",
    description:
      "Army Welfare Housing Organisation constructs houses for serving and retired army personnel and their widows on a 'No Profit No Loss' basis.",
    eligibility: "Serving/Retired Army personnel & widows.",
    icon: HomeIcon,
    slug: undefined as string | undefined,
    pdfUrl: null as string | null,
  },
];

const PAGE_SIZE = 9;

export function Welfare() {
  const { publishedContent } = useContent();
  const [page, setPage] = useState(1);

  const dynamicSchemes = useMemo(() => {
    const fromDb = publishedContent.filter(
      (item) =>
        item.contentType === "scheme" ||
        item.categorySlug === "welfare-schemes" ||
        item.categorySlug === "echs"
    );

    const mappedDb = fromDb.map((item, idx) => {
      const IconComp =
        idx % 4 === 0
          ? Heart
          : idx % 4 === 1
          ? GraduationCap
          : idx % 4 === 2
          ? Stethoscope
          : BadgeIndianRupee;
      return {
        id: item.id,
        title: item.title,
        description: item.shortDescription,
        eligibility: `${item.issuingAuthority}${item.subcategory ? ` · ${item.subcategory}` : ""}`,
        icon: IconComp,
        slug: item.slug,
        pdfUrl: item.pdfAttachments[0]?.url || null,
      };
    });

    const seen = new Set(mappedDb.map((m) => m.title.toLowerCase()));
    const extraFallback = fallbackSchemes.filter((f) => !seen.has(f.title.toLowerCase()));

    return [...mappedDb, ...extraFallback];
  }, [publishedContent]);

  const paginated = dynamicSchemes.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-8">
      <SEOHead
        title="Major Welfare Schemes"
        description="Explore government welfare schemes, KSB grants, ECHS medicare, and scholarships supporting Armed Forces Veterans and their dependents."
      />

      <div className="mb-10 text-center">
        <h1 className="text-3xl font-serif font-bold text-veteran-navy flex items-center justify-center gap-3 mb-4">
          <Heart className="w-8 h-8 text-veteran-maroon" />
          Major Welfare Schemes
        </h1>
        <p className="text-gray-600 max-w-2xl mx-auto">
          The government provides numerous schemes to support the resettlement and welfare of Armed Forces Veterans and their dependents.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
        {paginated.map((scheme) => (
          <div
            key={scheme.id}
            className="bg-white rounded-xl shadow-md border-t-4 border-veteran-olive overflow-hidden flex flex-col hover:-translate-y-1 transition-transform duration-300"
          >
            <div className="p-6 flex-1">
              <div className="w-12 h-12 bg-veteran-sand rounded-full flex items-center justify-center mb-4 text-veteran-olive">
                <scheme.icon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-bold text-veteran-navy mb-3">
                {scheme.slug ? (
                  <Link
                    to={`/article/${scheme.slug}`}
                    className="hover:text-veteran-olive transition-colors"
                  >
                    {scheme.title}
                  </Link>
                ) : (
                  scheme.title
                )}
              </h3>
              <p className="text-gray-600 text-sm mb-4">{scheme.description}</p>
            </div>
            <div className="bg-gray-50 border-t border-gray-100 p-4 space-y-3">
              <div>
                <h4 className="text-xs uppercase font-bold text-gray-500 mb-1">
                  Issuing Authority / Eligibility
                </h4>
                <p className="text-sm font-medium text-gray-800">{scheme.eligibility}</p>
              </div>
              {(scheme.slug || scheme.pdfUrl) && (
                <div className="flex items-center justify-between pt-2 border-t border-gray-200/70 text-xs">
                  {scheme.pdfUrl ? (
                    <a
                      href={scheme.pdfUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 font-semibold text-veteran-olive hover:underline"
                    >
                      <Download className="w-3.5 h-3.5" /> PDF Guidelines
                    </a>
                  ) : (
                    <span />
                  )}
                  {scheme.slug && (
                    <Link
                      to={`/article/${scheme.slug}`}
                      className="inline-flex items-center gap-1 font-bold text-veteran-navy hover:text-veteran-olive"
                    >
                      View Scheme <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      <Pagination
        currentPage={page}
        totalItems={dynamicSchemes.length}
        pageSize={PAGE_SIZE}
        onPageChange={setPage}
      />
    </div>
  );
}
