import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { User, onAuthStateChanged, signInWithPopup, signOut } from "firebase/auth";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  onSnapshot,
  query,
  where,
  setDoc,
  updateDoc,
  deleteDoc,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  auth,
  db,
  googleProvider,
  BOOTSTRAPPED_ADMIN_EMAIL,
  OperationType,
  handleFirestoreError,
} from "../lib/firebase";
import {
  Circular,
  NewsArticle,
  AdminUserRecord,
  PortalCategory,
  PortalContentItem,
  ContentType,
  ContentStatus,
  PdfAttachment,
} from "../types";
import { defaultCategories, defaultPortalContent } from "../data/portalDefaults";

export type FontOption =
  | "Inter, sans-serif"
  | "'Playfair Display', Georgia, serif"
  | "'JetBrains Mono', monospace"
  | "system-ui, sans-serif"
  | "Lora, Georgia, serif";

const ALLOWED_FONTS: FontOption[] = [
  "Inter, sans-serif",
  "'Playfair Display', Georgia, serif",
  "'JetBrains Mono', monospace",
  "system-ui, sans-serif",
  "Lora, Georgia, serif",
];

const ALLOWED_CONTENT_TYPES: ContentType[] = [
  "article",
  "circular",
  "order",
  "scheme",
  "news",
  "employment",
];

export interface PDFLink {
  id: "echs_rules" | "csd_orders" | "sparsh_faq";
  name: string;
  url: string;
}

export interface PortalContentInput {
  id?: string;
  title: string;
  slug: string;
  contentType: ContentType;
  categorySlug: string;
  categoryName: string;
  subcategory: string;
  issuingAuthority: string;
  orderNumber: string;
  issueDate: string;
  publicationDate: string;
  shortDescription: string;
  fullContent: string;
  featuredImageUrl: string | null;
  pdfAttachments: PdfAttachment[];
  officialSourceUrl: string | null;
  status: ContentStatus;
  isFeatured: boolean;
  isImportantDoc: boolean;
}

export interface CategoryInput {
  id?: string;
  name: string;
  slug: string;
  description: string;
  subcategories: string[];
  sortOrder: number;
  isActive: boolean;
}

export interface ContentContextType {
  // Firebase Auth & RBAC state
  user: User | null;
  authReady: boolean;
  isLoggedIn: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  adminCheckLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  logoutAdmin: () => Promise<void>;

  // Loading & initialization state
  contentLoading: boolean;
  isDbSeeded: boolean;

  // Font state
  selectedFont: FontOption;
  updateFont: (font: FontOption) => Promise<void>;

  // PDF Links
  pdfLinks: PDFLink[];
  updatePDFLink: (id: PDFLink["id"], url: string) => Promise<void>;

  // Custom text content
  customTexts: Record<string, string>;
  saveSiteTextsAndCirculars: (
    nextTexts: Record<string, string>,
    nextCirculars: Circular[]
  ) => Promise<void>;

  // Legacy circulars & news (preserved for compatibility)
  circulars: Circular[];
  addCircular: (input: {
    title: string;
    category?: "circular" | "order" | "notification";
    fileUrl?: string | null;
    isNew?: boolean;
  }) => Promise<void>;
  updateCircular: (
    id: string,
    updates: Partial<Pick<Circular, "title" | "isNew" | "fileUrl" | "category">>
  ) => Promise<void>;
  deleteCircular: (id: string) => Promise<void>;

  news: NewsArticle[];
  addNewsArticle: (input: {
    title: string;
    content: string;
    author: string;
    imageUrl?: string | null;
  }) => Promise<void>;
  updateNewsArticle: (
    id: string,
    updates: Partial<Pick<NewsArticle, "title" | "content" | "author" | "imageUrl">>
  ) => Promise<void>;
  deleteNewsArticle: (id: string) => Promise<void>;

  // Centralized Portal Categories & Content
  categories: PortalCategory[];
  publishedContent: PortalContentItem[];
  allAdminContent: PortalContentItem[];
  savePortalContent: (input: PortalContentInput) => Promise<string>;
  deletePortalContent: (id: string) => Promise<void>;
  togglePortalContentStatus: (id: string, nextStatus: ContentStatus) => Promise<void>;
  saveCategory: (input: CategoryInput) => Promise<string>;
  deleteCategory: (id: string) => Promise<void>;

  // Admin management (super-admin only)
  adminUsers: AdminUserRecord[];
  addAdminUser: (uid: string, email: string, displayName: string) => Promise<void>;
  removeAdminUser: (uid: string) => Promise<void>;

  resetToDefault: () => Promise<void>;
}

const defaultPDFLinks: PDFLink[] = [
  { id: "echs_rules", name: "ECHS Smart Card Policy Guidance", url: "https://echs.gov.in" },
  { id: "csd_orders", name: "CSD Canteen Annual Quota Guidelines", url: "https://csdindia.gov.in" },
  { id: "sparsh_faq", name: "SPARSH Pension Claims Manual", url: "https://sparsh.defencepension.gov.in" },
];

const LEGACY_HERO_TITLE = "Honoring Service, Empowering Veterans";
const LEGACY_HERO_SUBTITLE =
  "Welcome to Faujitimes, the centralized information hub for Indian Ex-Servicemen. Access premium resources, verified government circulars, CSD updates, and resettlement schemes.";

const defaultTexts: Record<string, string> = {
  home_hero_title: "Honoring Service. Empowering Veterans.",
  home_hero_subtitle:
    "Your trusted information hub for ex-servicemen, veterans and their families. Access govt circulars, pension updates, welfare schemes and employment opportunities.",
  about_title: "Faujitimes ex-servicemen portal",
  about_mission:
    "Faujitimes is a centralized awareness platform developed for the exclusive benefit of Ex-Servicemen (ESM), their widows, and dependents.",
  about_pension_desc:
    "Understanding pension processing pipelines, SPARSH migration protocols, and dynamic tax exemptions for gallantry awardees.",
  about_echs_desc:
    "Seamless, hassle-free navigation of medical claims, empaneled hospital structures, and standard outpatient drug procurement rules.",
  contact_address: "175, Ashram Road, Budhpur Delhi 110036",
  contact_phone: "01127206062",
  contact_email: "faujitimes@gmail.com",
};

const defaultCirculars: Circular[] = [
  {
    id: "1",
    title: "Revision of Pension for Pre-2006 Pensioners",
    date: new Date().toISOString(),
    category: "circular",
    fileUrl: null,
    isNew: true,
    isPublished: true,
    sortOrder: 0,
  },
  {
    id: "2",
    title: "ECHS Smart Card Renewal Process Mandate",
    date: new Date(Date.now() - 86400000).toISOString(),
    category: "order",
    fileUrl: null,
    isNew: true,
    isPublished: true,
    sortOrder: 1,
  },
  {
    id: "3",
    title: "SPARSH Data Verification Guidelines",
    date: new Date(Date.now() - 172800000 * 2).toISOString(),
    category: "notification",
    fileUrl: null,
    isNew: false,
    isPublished: true,
    sortOrder: 2,
  },
];

const defaultNews: NewsArticle[] = [
  {
    id: "1",
    title: "Veterans Day Rally 2026 Scheduled in New Delhi",
    date: new Date().toISOString(),
    content:
      "The annual Veterans Day Rally will be held at main cantonment areas next month. High turnouts are expected. Special provision for very senior veterans stands arranged.",
    author: "Admin",
    isPublished: true,
  },
  {
    id: "2",
    title: "Update on CSD Canteen Import Quotas",
    date: new Date(Date.now() - 172800000).toISOString(),
    content:
      "Fresh directives regarding the quota of standard consumer electronic goods availability from CSD Depots across eastern commands have been issued.",
    author: "Admin",
    isPublished: true,
  },
];

// Blueprint-synchronized sanitization helpers
function clampText(val: string | undefined, fallback: string, maxLength: number): string {
  const trimmed = (val ?? "").trim();
  if (!trimmed) return fallback.slice(0, maxLength);
  return trimmed.slice(0, maxLength);
}

function sanitizeId(raw: string): string {
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 128);
  return cleaned || `doc_${Date.now()}`;
}

export function slugifyText(raw: string, maxLen = 120): string {
  const slug = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, maxLen);
  return slug || `item-${Date.now()}`;
}

function sanitizeCategory(val?: string): "circular" | "order" | "notification" {
  if (val === "order" || val === "notification") return val;
  return "circular";
}

function sanitizeContentType(val?: string): ContentType {
  if (val && ALLOWED_CONTENT_TYPES.includes(val as ContentType)) {
    return val as ContentType;
  }
  return "article";
}

function sanitizeFont(val?: string): FontOption {
  if (val && ALLOWED_FONTS.includes(val as FontOption)) {
    return val as FontOption;
  }
  return "Inter, sans-serif";
}

function extractYear(dateStr: string): number {
  const parsed = new Date(dateStr);
  const yr = Number.isNaN(parsed.getTime())
    ? new Date().getFullYear()
    : parsed.getFullYear();
  return Math.min(2100, Math.max(1947, yr));
}

function mapPortalContentDoc(id: string, data: Record<string, unknown>): PortalContentItem {
  const rawAttachments = Array.isArray(data.pdfAttachments) ? data.pdfAttachments : [];
  const pdfAttachments: PdfAttachment[] = rawAttachments
    .filter(
      (item): item is { name?: unknown; url?: unknown } =>
        Boolean(item && typeof item === "object")
    )
    .slice(0, 10)
    .map((item) => ({
      name: String(item.name || "Document PDF").slice(0, 200),
      url: String(item.url || "").slice(0, 500),
    }))
    .filter((item) => Boolean(item.url));

  const pubDate = String(data.publicationDate || new Date().toISOString().slice(0, 10));
  return {
    id,
    title: String(data.title || ""),
    slug: String(data.slug || id),
    contentType: sanitizeContentType(String(data.contentType || "article")),
    categorySlug: String(data.categorySlug || "circulars"),
    categoryName: String(data.categoryName || "Government Orders and Circulars"),
    subcategory: String(data.subcategory || ""),
    issuingAuthority: String(data.issuingAuthority || "Department of Ex-Servicemen Welfare"),
    orderNumber: String(data.orderNumber || ""),
    issueDate: String(data.issueDate || pubDate),
    publicationDate: pubDate,
    publicationYear:
      typeof data.publicationYear === "number" ? data.publicationYear : extractYear(pubDate),
    shortDescription: String(data.shortDescription || ""),
    fullContent: String(data.fullContent || ""),
    featuredImageUrl:
      typeof data.featuredImageUrl === "string" && data.featuredImageUrl.trim()
        ? data.featuredImageUrl
        : null,
    pdfAttachments,
    officialSourceUrl:
      typeof data.officialSourceUrl === "string" && data.officialSourceUrl.trim()
        ? data.officialSourceUrl
        : null,
    status: data.status === "draft" ? "draft" : "published",
    isFeatured: Boolean(data.isFeatured),
    isImportantDoc: Boolean(data.isImportantDoc),
    authorId: typeof data.authorId === "string" ? data.authorId : undefined,
  };
}

const ContentContext = createContext<ContentContextType | undefined>(undefined);

export function ContentProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [isDelegatedAdmin, setIsDelegatedAdmin] = useState(false);
  const [adminCheckLoading, setAdminCheckLoading] = useState(true);

  const [selectedFont, setSelectedFont] = useState<FontOption>("Inter, sans-serif");
  const [pdfLinks, setPDFLinks] = useState<PDFLink[]>(defaultPDFLinks);
  const [customTexts, setCustomTexts] = useState<Record<string, string>>(defaultTexts);
  const [circulars, setCirculars] = useState<Circular[]>(defaultCirculars);
  const [news, setNews] = useState<NewsArticle[]>(defaultNews);

  const [categories, setCategories] = useState<PortalCategory[]>(defaultCategories);
  const [publishedContent, setPublishedContent] = useState<PortalContentItem[]>(
    defaultPortalContent
  );
  const [adminDraftsOrAll, setAdminDraftsOrAll] = useState<PortalContentItem[]>([]);

  const [siteConfigLoaded, setSiteConfigLoaded] = useState(false);
  const [circularsLoaded, setCircularsLoaded] = useState(false);
  const [newsLoaded, setNewsLoaded] = useState(false);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [portalContentLoaded, setPortalContentLoaded] = useState(false);
  const [isDbSeeded, setIsDbSeeded] = useState(false);
  const [categoriesInDb, setCategoriesInDb] = useState(false);
  const [portalContentInDb, setPortalContentInDb] = useState(false);

  const [adminUsers, setAdminUsers] = useState<AdminUserRecord[]>([]);

  const isSuperAdmin = Boolean(
    user &&
      user.emailVerified &&
      user.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()
  );
  const isAdmin = Boolean(user && user.emailVerified && (isSuperAdmin || isDelegatedAdmin));
  const isLoggedIn = Boolean(user);
  const contentLoading = !(
    siteConfigLoaded &&
    circularsLoaded &&
    newsLoaded &&
    categoriesLoaded &&
    portalContentLoaded
  );

  // Merge published + drafts cleanly for Admin CMS
  const allAdminContent = React.useMemo(() => {
    if (!isAdmin) return publishedContent;
    const map = new Map<string, PortalContentItem>();
    publishedContent.forEach((item) => map.set(item.id, item));
    adminDraftsOrAll.forEach((item) => map.set(item.id, item));
    return Array.from(map.values()).sort(
      (a, b) =>
        new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
    );
  }, [isAdmin, publishedContent, adminDraftsOrAll]);

  // 1. Firebase Auth State Listener
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);
      if (!currentUser || !currentUser.emailVerified) {
        setIsDelegatedAdmin(false);
        setAdminCheckLoading(false);
        setAuthReady(true);
        return;
      }

      if (currentUser.email?.toLowerCase() === BOOTSTRAPPED_ADMIN_EMAIL.toLowerCase()) {
        setIsDelegatedAdmin(true);
        setAdminCheckLoading(false);
        setAuthReady(true);
        return;
      }

      setAdminCheckLoading(true);
      try {
        const snap = await getDoc(doc(db, "admins", currentUser.uid));
        setIsDelegatedAdmin(snap.exists() && snap.data()?.role === "admin");
      } catch (error) {
        console.error("Failed checking admin registry:", error);
        setIsDelegatedAdmin(false);
      } finally {
        setAdminCheckLoading(false);
        setAuthReady(true);
      }
    });

    return () => unsubscribe();
  }, []);

  // 2. Public SiteConfig Realtime Listener
  useEffect(() => {
    const configRef = doc(db, "siteConfig", "main");
    const unsubscribe = onSnapshot(
      configRef,
      (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          setIsDbSeeded(true);
          setSelectedFont(sanitizeFont(data.selectedFont));
          setCustomTexts({
            home_hero_title:
              !data.homeHeroTitle || data.homeHeroTitle === LEGACY_HERO_TITLE
                ? defaultTexts.home_hero_title
                : data.homeHeroTitle,
            home_hero_subtitle:
              !data.homeHeroSubtitle || data.homeHeroSubtitle === LEGACY_HERO_SUBTITLE
                ? defaultTexts.home_hero_subtitle
                : data.homeHeroSubtitle,
            about_title: data.aboutTitle || defaultTexts.about_title,
            about_mission: data.aboutMission || defaultTexts.about_mission,
            about_pension_desc: data.aboutPensionDesc || defaultTexts.about_pension_desc,
            about_echs_desc: data.aboutEchsDesc || defaultTexts.about_echs_desc,
            contact_address: data.contactAddress || defaultTexts.contact_address,
            contact_phone: data.contactPhone || defaultTexts.contact_phone,
            contact_email: data.contactEmail || defaultTexts.contact_email,
          });
          setPDFLinks([
            {
              id: "echs_rules",
              name: "ECHS Smart Card Policy Guidance",
              url: data.pdfEchsUrl || defaultPDFLinks[0].url,
            },
            {
              id: "csd_orders",
              name: "CSD Canteen Annual Quota Guidelines",
              url: data.pdfCsdUrl || defaultPDFLinks[1].url,
            },
            {
              id: "sparsh_faq",
              name: "SPARSH Pension Claims Manual",
              url: data.pdfSparshUrl || defaultPDFLinks[2].url,
            },
          ]);
        } else {
          setIsDbSeeded(false);
        }
        setSiteConfigLoaded(true);
      },
      (error) => {
        setSiteConfigLoaded(true);
        handleFirestoreError(error, OperationType.GET, "siteConfig/main");
      }
    );

    return () => unsubscribe();
  }, []);

  // 3. Public Categories Realtime Listener
  useEffect(() => {
    const catQuery = query(collection(db, "categories"), where("isActive", "==", true));
    const unsubscribe = onSnapshot(
      catQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          setCategoriesInDb(true);
          const loaded: PortalCategory[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              name: String(data.name || ""),
              slug: String(data.slug || d.id),
              description: String(data.description || ""),
              subcategories: Array.isArray(data.subcategories)
                ? data.subcategories.map((s) => String(s))
                : [],
              sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
              isActive: Boolean(data.isActive),
              authorId: typeof data.authorId === "string" ? data.authorId : undefined,
            };
          });
          loaded.sort((a, b) => a.sortOrder - b.sortOrder);
          setCategories(loaded);
        } else {
          setCategoriesInDb(false);
        }
        setCategoriesLoaded(true);
      },
      (error) => {
        setCategoriesLoaded(true);
        handleFirestoreError(error, OperationType.LIST, "categories");
      }
    );
    return () => unsubscribe();
  }, []);

  // 4. Public Published Portal Content Listener (only status == 'published' visible publicly)
  useEffect(() => {
    const contentQuery = query(
      collection(db, "portalContent"),
      where("status", "==", "published")
    );
    const unsubscribe = onSnapshot(
      contentQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          setPortalContentInDb(true);
          const loaded = snapshot.docs.map((d) =>
            mapPortalContentDoc(d.id, d.data() as Record<string, unknown>)
          );
          loaded.sort(
            (a, b) =>
              new Date(b.publicationDate).getTime() - new Date(a.publicationDate).getTime()
          );
          setPublishedContent(loaded);
        } else {
          setPortalContentInDb(false);
          if (portalContentInDb) {
            setPublishedContent([]);
          }
        }
        setPortalContentLoaded(true);
      },
      (error) => {
        setPortalContentLoaded(true);
        handleFirestoreError(error, OperationType.LIST, "portalContent");
      }
    );

    return () => unsubscribe();
  }, [portalContentInDb]);

  // 5. Admin Draft/All Content Listener (ONLY when authReady && isAdmin)
  useEffect(() => {
    if (!authReady || !isAdmin || !user) {
      setAdminDraftsOrAll([]);
      return;
    }

    const adminQuery = isSuperAdmin
      ? collection(db, "portalContent")
      : query(collection(db, "portalContent"), where("authorId", "==", user.uid));

    const unsubscribe = onSnapshot(
      adminQuery,
      (snapshot) => {
        const loaded = snapshot.docs.map((d) =>
          mapPortalContentDoc(d.id, d.data() as Record<string, unknown>)
        );
        setAdminDraftsOrAll(loaded);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "portalContent");
      }
    );

    return () => unsubscribe();
  }, [authReady, isAdmin, isSuperAdmin, user]);

  // 6. Legacy Circulars Realtime Listener
  useEffect(() => {
    const circularsQuery = query(
      collection(db, "circulars"),
      where("isPublished", "==", true)
    );
    const unsubscribe = onSnapshot(
      circularsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: Circular[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || ""),
              date: String(data.date || new Date().toISOString()),
              category: sanitizeCategory(data.category),
              fileUrl:
                typeof data.fileUrl === "string" && data.fileUrl.trim() ? data.fileUrl : null,
              isNew: Boolean(data.isNew),
              isPublished: Boolean(data.isPublished),
              sortOrder: typeof data.sortOrder === "number" ? data.sortOrder : 0,
              authorId: typeof data.authorId === "string" ? data.authorId : undefined,
            };
          });
          loaded.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
          setCirculars(loaded);
        } else if (isDbSeeded) {
          setCirculars([]);
        }
        setCircularsLoaded(true);
      },
      (error) => {
        setCircularsLoaded(true);
        handleFirestoreError(error, OperationType.LIST, "circulars");
      }
    );

    return () => unsubscribe();
  }, [isDbSeeded]);

  // 7. Legacy News Realtime Listener
  useEffect(() => {
    const newsQuery = query(
      collection(db, "news"),
      where("isPublished", "==", true)
    );
    const unsubscribe = onSnapshot(
      newsQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const loaded: NewsArticle[] = snapshot.docs.map((d) => {
            const data = d.data();
            return {
              id: d.id,
              title: String(data.title || ""),
              content: String(data.content || ""),
              date: String(data.date || new Date().toISOString()),
              author: String(data.author || "Admin"),
              imageUrl:
                typeof data.imageUrl === "string" && data.imageUrl.trim() ? data.imageUrl : null,
              isPublished: Boolean(data.isPublished),
              authorId: typeof data.authorId === "string" ? data.authorId : undefined,
            };
          });
          loaded.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
          setNews(loaded);
        } else if (isDbSeeded) {
          setNews([]);
        }
        setNewsLoaded(true);
      },
      (error) => {
        setNewsLoaded(true);
        handleFirestoreError(error, OperationType.LIST, "news");
      }
    );

    return () => unsubscribe();
  }, [isDbSeeded]);

  // 8. Super-Admin Registry Listener
  useEffect(() => {
    if (!authReady || !isSuperAdmin) {
      setAdminUsers([]);
      return;
    }

    const adminsQuery = query(collection(db, "admins"), where("role", "==", "admin"));
    const unsubscribe = onSnapshot(
      adminsQuery,
      (snapshot) => {
        const list: AdminUserRecord[] = snapshot.docs.map((d) => {
          const data = d.data();
          return {
            uid: d.id,
            email: String(data.email || ""),
            displayName: String(data.displayName || ""),
            role: "admin",
            addedBy: String(data.addedBy || ""),
          };
        });
        setAdminUsers(list);
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, "admins");
      }
    );

    return () => unsubscribe();
  }, [authReady, isSuperAdmin]);

  const buildSiteConfigPayload = useCallback(
    (
      uid: string,
      fontVal: FontOption,
      textsVal: Record<string, string>,
      linksVal: PDFLink[]
    ) => {
      const echsUrl = linksVal.find((l) => l.id === "echs_rules")?.url;
      const csdUrl = linksVal.find((l) => l.id === "csd_orders")?.url;
      const sparshUrl = linksVal.find((l) => l.id === "sparsh_faq")?.url;

      return {
        selectedFont: sanitizeFont(fontVal),
        homeHeroTitle: clampText(textsVal.home_hero_title, defaultTexts.home_hero_title, 200),
        homeHeroSubtitle: clampText(textsVal.home_hero_subtitle, defaultTexts.home_hero_subtitle, 1000),
        aboutTitle: clampText(textsVal.about_title, defaultTexts.about_title, 200),
        aboutMission: clampText(textsVal.about_mission, defaultTexts.about_mission, 2000),
        aboutPensionDesc: clampText(textsVal.about_pension_desc, defaultTexts.about_pension_desc, 1000),
        aboutEchsDesc: clampText(textsVal.about_echs_desc, defaultTexts.about_echs_desc, 1000),
        contactAddress: clampText(textsVal.contact_address, defaultTexts.contact_address, 300),
        contactPhone: clampText(textsVal.contact_phone, defaultTexts.contact_phone, 50),
        contactEmail: clampText(textsVal.contact_email, defaultTexts.contact_email, 150),
        pdfEchsUrl: clampText(echsUrl, defaultPDFLinks[0].url, 500),
        pdfCsdUrl: clampText(csdUrl, defaultPDFLinks[1].url, 500),
        pdfSparshUrl: clampText(sparshUrl, defaultPDFLinks[2].url, 500),
        updatedBy: sanitizeId(uid),
        updatedAt: serverTimestamp(),
      };
    },
    []
  );

  // Auto-seed initial siteConfig, circulars, news (when fresh) AND categories/portalContent (when empty in Firestore)
  useEffect(() => {
    if (
      !authReady ||
      !isAdmin ||
      !user ||
      !siteConfigLoaded ||
      !categoriesLoaded ||
      !portalContentLoaded
    ) {
      return;
    }

    const seedMissingCollections = async () => {
      const batch = writeBatch(db);
      let hasWrites = false;

      if (!isDbSeeded) {
        hasWrites = true;
        batch.set(
          doc(db, "siteConfig", "main"),
          buildSiteConfigPayload(user.uid, selectedFont, customTexts, pdfLinks)
        );
        defaultCirculars.forEach((c, idx) => {
          batch.set(doc(db, "circulars", sanitizeId(c.id)), {
            title: clampText(c.title, "Untitled Circular", 300),
            date: clampText(c.date, new Date().toISOString(), 64),
            category: sanitizeCategory(c.category),
            fileUrl: c.fileUrl ? c.fileUrl.slice(0, 500) : null,
            isNew: Boolean(c.isNew),
            isPublished: true,
            sortOrder: idx,
            authorId: sanitizeId(user.uid),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
        defaultNews.forEach((n) => {
          batch.set(doc(db, "news", sanitizeId(n.id)), {
            title: clampText(n.title, "Untitled News", 250),
            content: clampText(n.content, "No content", 10000),
            date: clampText(n.date, new Date().toISOString(), 64),
            author: clampText(n.author, "Admin", 100),
            imageUrl: n.imageUrl ? n.imageUrl.slice(0, 500) : null,
            isPublished: true,
            authorId: sanitizeId(user.uid),
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        });
      }

      if (!categoriesInDb) {
        const existingCats = await getDocs(
          query(collection(db, "categories"), where("isActive", "==", true))
        );
        if (existingCats.empty) {
          hasWrites = true;
          defaultCategories.forEach((cat) => {
            batch.set(doc(db, "categories", sanitizeId(cat.id)), {
              name: clampText(cat.name, "Category", 120),
              slug: slugifyText(cat.slug, 80),
              description: clampText(cat.description, "Portal category", 500),
              subcategories: cat.subcategories.slice(0, 25).map((s) => s.slice(0, 100)),
              sortOrder: cat.sortOrder,
              isActive: true,
              authorId: sanitizeId(user.uid),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
        }
      }

      if (!portalContentInDb) {
        const existingPublished = await getDocs(
          query(collection(db, "portalContent"), where("status", "==", "published"))
        );
        if (existingPublished.empty) {
          hasWrites = true;
          defaultPortalContent.forEach((item) => {
            batch.set(doc(db, "portalContent", sanitizeId(item.id)), {
              title: clampText(item.title, "Portal Update", 300),
              slug: slugifyText(item.slug, 160),
              contentType: sanitizeContentType(item.contentType),
              categorySlug: slugifyText(item.categorySlug, 80),
              categoryName: clampText(item.categoryName, "General", 120),
              subcategory: item.subcategory.slice(0, 120),
              issuingAuthority: clampText(
                item.issuingAuthority,
                "Department of Ex-Servicemen Welfare",
                180
              ),
              orderNumber: item.orderNumber.slice(0, 120),
              issueDate: clampText(item.issueDate, item.publicationDate, 64),
              publicationDate: clampText(item.publicationDate, new Date().toISOString().slice(0, 10), 64),
              publicationYear: item.publicationYear,
              shortDescription: clampText(item.shortDescription, item.title, 600),
              fullContent: clampText(item.fullContent, item.shortDescription, 30000),
              featuredImageUrl: item.featuredImageUrl ? item.featuredImageUrl.slice(0, 500) : null,
              pdfAttachments: item.pdfAttachments.slice(0, 10).map((att) => ({
                name: clampText(att.name, "Attachment PDF", 200),
                url: clampText(att.url, "https://desw.gov.in", 500),
              })),
              officialSourceUrl: item.officialSourceUrl ? item.officialSourceUrl.slice(0, 500) : null,
              status: item.status === "draft" ? "draft" : "published",
              isFeatured: Boolean(item.isFeatured),
              isImportantDoc: Boolean(item.isImportantDoc),
              authorId: sanitizeId(user.uid),
              createdAt: serverTimestamp(),
              updatedAt: serverTimestamp(),
            });
          });
        }
      }

      if (!hasWrites) return;

      try {
        await batch.commit();
      } catch (error) {
        handleFirestoreError(error, OperationType.WRITE, "portalContent");
      }
    };

    void seedMissingCollections();
  }, [
    authReady,
    isAdmin,
    user,
    siteConfigLoaded,
    categoriesLoaded,
    portalContentLoaded,
    isDbSeeded,
    categoriesInDb,
    portalContentInDb,
    buildSiteConfigPayload,
    selectedFont,
    customTexts,
    pdfLinks,
  ]);

  const signInWithGoogle = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logoutAdmin = async () => {
    await signOut(auth);
  };

  const updateFont = async (font: FontOption) => {
    if (!user || !isAdmin) return;
    const validFont = sanitizeFont(font);
    setSelectedFont(validFont);
    const payload = buildSiteConfigPayload(user.uid, validFont, customTexts, pdfLinks);
    try {
      await setDoc(doc(db, "siteConfig", "main"), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "siteConfig/main");
    }
  };

  const updatePDFLink = async (id: PDFLink["id"], url: string) => {
    if (!user || !isAdmin) return;
    const nextLinks = pdfLinks.map((link) =>
      link.id === id ? { ...link, url: clampText(url, link.url, 500) } : link
    );
    setPDFLinks(nextLinks);
    const payload = buildSiteConfigPayload(user.uid, selectedFont, customTexts, nextLinks);
    try {
      await setDoc(doc(db, "siteConfig", "main"), payload, { merge: true });
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "siteConfig/main");
    }
  };

  const saveSiteTextsAndCirculars = async (
    nextTexts: Record<string, string>,
    nextCirculars: Circular[]
  ) => {
    if (!user || !isAdmin) return;

    const batch = writeBatch(db);
    const configPayload = buildSiteConfigPayload(user.uid, selectedFont, nextTexts, pdfLinks);
    batch.set(doc(db, "siteConfig", "main"), configPayload, { merge: true });

    nextCirculars.forEach((c, idx) => {
      const cId = sanitizeId(c.id);
      const cRef = doc(db, "circulars", cId);
      const existing = circulars.find((orig) => orig.id === c.id);
      if (existing && existing.authorId) {
        batch.update(cRef, {
          title: clampText(c.title, existing.title || "Circular", 300),
          isNew: Boolean(c.isNew),
          fileUrl: c.fileUrl ? c.fileUrl.trim().slice(0, 500) : null,
          category: sanitizeCategory(c.category),
          date: clampText(c.date, new Date().toISOString(), 64),
          isPublished: true,
          sortOrder: idx,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(cRef, {
          title: clampText(c.title, "Circular", 300),
          date: clampText(c.date, new Date().toISOString(), 64),
          category: sanitizeCategory(c.category),
          fileUrl: c.fileUrl ? c.fileUrl.trim().slice(0, 500) : null,
          isNew: Boolean(c.isNew),
          isPublished: true,
          sortOrder: idx,
          authorId: sanitizeId(user.uid),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "siteConfig/main");
    }
  };

  // Legacy Circular CRUD
  const addCircular = async (input: {
    title: string;
    category?: "circular" | "order" | "notification";
    fileUrl?: string | null;
    isNew?: boolean;
  }) => {
    if (!user || !isAdmin) return;
    const id = `circ_${Date.now()}`;
    const cRef = doc(db, "circulars", id);
    const nextOrder = circulars.length;
    try {
      await setDoc(cRef, {
        title: clampText(input.title, "New Government Circular", 300),
        date: new Date().toISOString(),
        category: sanitizeCategory(input.category),
        fileUrl: input.fileUrl && input.fileUrl.trim() ? input.fileUrl.trim().slice(0, 500) : null,
        isNew: input.isNew ?? true,
        isPublished: true,
        sortOrder: nextOrder,
        authorId: sanitizeId(user.uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `circulars/${id}`);
    }
  };

  const updateCircular = async (
    id: string,
    updates: Partial<Pick<Circular, "title" | "isNew" | "fileUrl" | "category">>
  ) => {
    if (!user || !isAdmin) return;
    const cId = sanitizeId(id);
    const cRef = doc(db, "circulars", cId);
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.title !== undefined) {
      payload.title = clampText(updates.title, "Circular", 300);
    }
    if (updates.isNew !== undefined) {
      payload.isNew = Boolean(updates.isNew);
    }
    if (updates.fileUrl !== undefined) {
      payload.fileUrl =
        updates.fileUrl && updates.fileUrl.trim() ? updates.fileUrl.trim().slice(0, 500) : null;
    }
    if (updates.category !== undefined) {
      payload.category = sanitizeCategory(updates.category);
    }
    try {
      await updateDoc(cRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `circulars/${cId}`);
    }
  };

  const deleteCircular = async (id: string) => {
    if (!user || !isAdmin) return;
    const cId = sanitizeId(id);
    try {
      await deleteDoc(doc(db, "circulars", cId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `circulars/${cId}`);
    }
  };

  // Legacy News CRUD
  const addNewsArticle = async (input: {
    title: string;
    content: string;
    author: string;
    imageUrl?: string | null;
  }) => {
    if (!user || !isAdmin) return;
    const id = `news_${Date.now()}`;
    const nRef = doc(db, "news", id);
    try {
      await setDoc(nRef, {
        title: clampText(input.title, "New Portal Update", 250),
        content: clampText(input.content, "Details forthcoming.", 10000),
        date: new Date().toISOString(),
        author: clampText(input.author, user.displayName || "Admin", 100),
        imageUrl: input.imageUrl && input.imageUrl.trim() ? input.imageUrl.trim().slice(0, 500) : null,
        isPublished: true,
        authorId: sanitizeId(user.uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `news/${id}`);
    }
  };

  const updateNewsArticle = async (
    id: string,
    updates: Partial<Pick<NewsArticle, "title" | "content" | "author" | "imageUrl">>
  ) => {
    if (!user || !isAdmin) return;
    const nId = sanitizeId(id);
    const nRef = doc(db, "news", nId);
    const payload: Record<string, unknown> = {
      updatedAt: serverTimestamp(),
    };
    if (updates.title !== undefined) {
      payload.title = clampText(updates.title, "News Update", 250);
    }
    if (updates.content !== undefined) {
      payload.content = clampText(updates.content, "Details", 10000);
    }
    if (updates.author !== undefined) {
      payload.author = clampText(updates.author, "Admin", 100);
    }
    if (updates.imageUrl !== undefined) {
      payload.imageUrl =
        updates.imageUrl && updates.imageUrl.trim() ? updates.imageUrl.trim().slice(0, 500) : null;
    }
    try {
      await updateDoc(nRef, payload);
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `news/${nId}`);
    }
  };

  const deleteNewsArticle = async (id: string) => {
    if (!user || !isAdmin) return;
    const nId = sanitizeId(id);
    try {
      await deleteDoc(doc(db, "news", nId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `news/${nId}`);
    }
  };

  // --- Centralized Portal Content CRUD ---
  const savePortalContent = async (input: PortalContentInput): Promise<string> => {
    if (!user || !isAdmin) throw new Error("Admin authentication required.");
    const contentId = input.id ? sanitizeId(input.id) : `cnt_${Date.now()}`;
    const docRef = doc(db, "portalContent", contentId);

    const safeSlug = slugifyText(input.slug || input.title, 160);
    const safePubDate = clampText(
      input.publicationDate,
      new Date().toISOString().slice(0, 10),
      64
    );
    const safeAttachments = (input.pdfAttachments || [])
      .filter((a) => a.url && a.url.trim())
      .slice(0, 10)
      .map((a) => ({
        name: clampText(a.name, "Official PDF Attachment", 200),
        url: clampText(a.url, "", 500),
      }));

    const existingItem = allAdminContent.find((item) => item.id === contentId);

    const sharedFields = {
      title: clampText(input.title, "Untitled Entry", 300),
      slug: safeSlug,
      contentType: sanitizeContentType(input.contentType),
      categorySlug: slugifyText(input.categorySlug, 80),
      categoryName: clampText(input.categoryName, "Government Orders and Circulars", 120),
      subcategory: (input.subcategory || "").trim().slice(0, 120),
      issuingAuthority: clampText(
        input.issuingAuthority,
        "Department of Ex-Servicemen Welfare",
        180
      ),
      orderNumber: (input.orderNumber || "").trim().slice(0, 120),
      issueDate: clampText(input.issueDate, safePubDate, 64),
      publicationDate: safePubDate,
      publicationYear: extractYear(safePubDate),
      shortDescription: clampText(input.shortDescription, input.title, 600),
      fullContent: clampText(input.fullContent, input.shortDescription || input.title, 30000),
      featuredImageUrl:
        input.featuredImageUrl && input.featuredImageUrl.trim()
          ? input.featuredImageUrl.trim().slice(0, 500)
          : null,
      pdfAttachments: safeAttachments,
      officialSourceUrl:
        input.officialSourceUrl && input.officialSourceUrl.trim()
          ? input.officialSourceUrl.trim().slice(0, 500)
          : null,
      status: input.status === "draft" ? "draft" : "published",
      isFeatured: Boolean(input.isFeatured),
      isImportantDoc: Boolean(input.isImportantDoc),
      updatedAt: serverTimestamp(),
    };

    try {
      if (input.id && existingItem?.authorId) {
        await updateDoc(docRef, sharedFields);
      } else {
        await setDoc(docRef, {
          ...sharedFields,
          authorId: sanitizeId(user.uid),
          createdAt: serverTimestamp(),
        });
      }
      return contentId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `portalContent/${contentId}`);
    }
  };

  const deletePortalContent = async (id: string) => {
    if (!user || !isAdmin) return;
    const contentId = sanitizeId(id);
    try {
      await deleteDoc(doc(db, "portalContent", contentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `portalContent/${contentId}`);
    }
  };

  const togglePortalContentStatus = async (id: string, nextStatus: ContentStatus) => {
    if (!user || !isAdmin) return;
    const contentId = sanitizeId(id);
    try {
      await updateDoc(doc(db, "portalContent", contentId), {
        status: nextStatus === "draft" ? "draft" : "published",
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `portalContent/${contentId}`);
    }
  };

  // --- Category & Subcategory Management ---
  const saveCategory = async (input: CategoryInput): Promise<string> => {
    if (!user || !isAdmin) throw new Error("Admin authentication required.");
    const safeSlug = slugifyText(input.slug || input.name, 80);
    const catId = input.id ? sanitizeId(input.id) : sanitizeId(`cat_${safeSlug}`);
    const catRef = doc(db, "categories", catId);
    const existingCat = categories.find((c) => c.id === catId);

    const safeSubcategories = (input.subcategories || [])
      .map((s) => s.trim().slice(0, 100))
      .filter(Boolean)
      .slice(0, 25);

    const sharedFields = {
      name: clampText(input.name, "Category", 120),
      slug: safeSlug,
      description: clampText(
        input.description,
        "Information, orders, and resources for veterans.",
        500
      ),
      subcategories: safeSubcategories,
      sortOrder: Math.max(0, Math.min(10000, Math.round(input.sortOrder))),
      isActive: Boolean(input.isActive),
      updatedAt: serverTimestamp(),
    };

    try {
      if (input.id && existingCat?.authorId) {
        await updateDoc(catRef, sharedFields);
      } else {
        await setDoc(catRef, {
          ...sharedFields,
          authorId: sanitizeId(user.uid),
          createdAt: serverTimestamp(),
        });
      }
      return catId;
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `categories/${catId}`);
    }
  };

  const deleteCategory = async (id: string) => {
    if (!user || !isAdmin) return;
    const catId = sanitizeId(id);
    try {
      await deleteDoc(doc(db, "categories", catId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `categories/${catId}`);
    }
  };

  // Super-Admin Delegated Admin CRUD
  const addAdminUser = async (uid: string, email: string, displayName: string) => {
    if (!user || !isSuperAdmin) return;
    const targetUid = sanitizeId(uid.trim());
    try {
      await setDoc(doc(db, "admins", targetUid), {
        email: clampText(email, "admin@example.com", 150),
        displayName: clampText(displayName, "Portal Editor", 120),
        role: "admin",
        addedBy: sanitizeId(user.uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, `admins/${targetUid}`);
    }
  };

  const removeAdminUser = async (uid: string) => {
    if (!user || !isSuperAdmin) return;
    const targetUid = sanitizeId(uid);
    try {
      await deleteDoc(doc(db, "admins", targetUid));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `admins/${targetUid}`);
    }
  };

  const resetToDefault = async () => {
    if (!user || !isAdmin) return;
    const batch = writeBatch(db);
    batch.set(
      doc(db, "siteConfig", "main"),
      buildSiteConfigPayload(user.uid, "Inter, sans-serif", defaultTexts, defaultPDFLinks)
    );
    defaultCirculars.forEach((c, idx) => {
      batch.set(doc(db, "circulars", sanitizeId(c.id)), {
        title: c.title,
        date: c.date,
        category: sanitizeCategory(c.category),
        fileUrl: null,
        isNew: c.isNew,
        isPublished: true,
        sortOrder: idx,
        authorId: sanitizeId(user.uid),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    });

    try {
      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, "siteConfig/main");
    }
  };

  return (
    <ContentContext.Provider
      value={{
        user,
        authReady,
        isLoggedIn,
        isAdmin,
        isSuperAdmin,
        adminCheckLoading,
        signInWithGoogle,
        logoutAdmin,
        contentLoading,
        isDbSeeded,
        selectedFont,
        updateFont,
        pdfLinks,
        updatePDFLink,
        customTexts,
        saveSiteTextsAndCirculars,
        circulars,
        addCircular,
        updateCircular,
        deleteCircular,
        news,
        addNewsArticle,
        updateNewsArticle,
        deleteNewsArticle,
        categories,
        publishedContent,
        allAdminContent,
        savePortalContent,
        deletePortalContent,
        togglePortalContentStatus,
        saveCategory,
        deleteCategory,
        adminUsers,
        addAdminUser,
        removeAdminUser,
        resetToDefault,
      }}
    >
      <div style={{ fontFamily: selectedFont }} className="transition-all duration-300">
        {children}
      </div>
    </ContentContext.Provider>
  );
}

export function useContent() {
  const context = useContext(ContentContext);
  if (!context) {
    throw new Error("useContent must be used within a ContentProvider");
  }
  return context;
}
