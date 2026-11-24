import React, { useState, useEffect, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  useContent,
  FontOption,
  PortalContentInput,
  slugifyText,
} from "../context/ContentContext";
import { uploadPortalFile, FIREBASE_PROJECT_ID, UploadFolder } from "../lib/firebase";
import {
  Circular,
  ContentStatus,
  ContentType,
  PdfAttachment,
  PortalCategory,
  PortalContentItem,
} from "../types";
import { Pagination } from "../components/Pagination";
import { SEOHead } from "../components/SEOHead";
import {
  Lock,
  Unlock,
  ShieldAlert,
  Type,
  FileText,
  Settings,
  CheckCircle2,
  RotateCcw,
  Plus,
  Trash2,
  Newspaper,
  Users,
  LogOut,
  Loader2,
  Upload,
  Image as ImageIcon,
  ExternalLink,
  X,
  FolderTree,
  LayoutList,
  Pencil,
  Eye,
  Search,
  Globe,
} from "lucide-react";

type AdminTab = "content" | "categories" | "settings";

const CONTENT_TYPES: { value: ContentType; label: string }[] = [
  { value: "article", label: "Article / Guide" },
  { value: "circular", label: "Government Circular" },
  { value: "order", label: "Government Order" },
  { value: "scheme", label: "Welfare Scheme" },
  { value: "employment", label: "Employment Opportunity" },
  { value: "news", label: "News & Update" },
];

const todayIso = () => new Date().toISOString().slice(0, 10);

function createEmptyContentForm(categories: PortalCategory[]): PortalContentInput {
  const firstCat = categories[0];
  return {
    title: "",
    slug: "",
    contentType: "article",
    categorySlug: firstCat?.slug || "circulars",
    categoryName: firstCat?.name || "Government Orders and Circulars",
    subcategory: firstCat?.subcategories?.[0] || "",
    issuingAuthority: "Department of Ex-Servicemen Welfare (DESW)",
    orderNumber: "",
    issueDate: todayIso(),
    publicationDate: todayIso(),
    shortDescription: "",
    fullContent: "",
    featuredImageUrl: null,
    pdfAttachments: [],
    officialSourceUrl: null,
    status: "published",
    isFeatured: false,
    isImportantDoc: false,
  };
}

export function Admin() {
  const {
    user,
    authReady,
    isLoggedIn,
    isAdmin,
    isSuperAdmin,
    adminCheckLoading,
    signInWithGoogle,
    logoutAdmin,
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
  } = useContent();

  const [activeTab, setActiveTab] = useState<AdminTab>("content");

  // Shared UI & Auth Feedback
  const [authError, setAuthError] = useState("");
  const [uploadError, setUploadError] = useState("");
  const [authBusy, setAuthBusy] = useState(false);
  const [feedback, setFeedback] = useState("");
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [confirmReset, setConfirmReset] = useState(false);

  // --- Tab 1: Centralized Content Manager State ---
  const [editorOpen, setEditorOpen] = useState(false);
  const [slugTouched, setSlugTouched] = useState(false);
  const [contentForm, setContentForm] = useState<PortalContentInput>(() =>
    createEmptyContentForm(categories)
  );
  const [manualPdfName, setManualPdfName] = useState("");
  const [manualPdfUrl, setManualPdfUrl] = useState("");
  const [savingContent, setSavingContent] = useState(false);
  const [confirmDeleteContentId, setConfirmDeleteContentId] = useState<string | null>(null);

  // Content list filtering & pagination
  const [contentSearch, setContentSearch] = useState("");
  const [filterCat, setFilterCat] = useState("all");
  const [filterStatus, setFilterStatus] = useState<"all" | ContentStatus>("all");
  const [filterType, setFilterType] = useState<"all" | ContentType>("all");
  const [contentPage, setContentPage] = useState(1);

  // --- Tab 2: Category & Subcategory State ---
  const [editingCatId, setEditingCatId] = useState<string | null>(null);
  const [catName, setCatName] = useState("");
  const [catSlug, setCatSlug] = useState("");
  const [catSlugTouched, setCatSlugTouched] = useState(false);
  const [catDesc, setCatDesc] = useState("");
  const [catOrder, setCatOrder] = useState(categories.length + 1);
  const [catIsActive, setCatIsActive] = useState(true);
  const [catSubcategories, setCatSubcategories] = useState<string[]>([]);
  const [newSubcatInput, setNewSubcatInput] = useState("");
  const [savingCategory, setSavingCategory] = useState(false);
  const [confirmDeleteCatId, setConfirmDeleteCatId] = useState<string | null>(null);

  // --- Tab 3: Site Settings, Legacy Circulars & News State ---
  const [draftTexts, setDraftTexts] = useState<Record<string, string>>(customTexts);
  const [draftCirculars, setDraftCirculars] = useState<Circular[]>(circulars);
  const [savingAll, setSavingAll] = useState(false);

  const [newCircTitle, setNewCircTitle] = useState("");
  const [newCircFileUrl, setNewCircFileUrl] = useState("");
  const [newCircIsNew, setNewCircIsNew] = useState(true);
  const [addingCirc, setAddingCirc] = useState(false);

  const [newNewsTitle, setNewNewsTitle] = useState("");
  const [newNewsAuthor, setNewNewsAuthor] = useState("Admin");
  const [newNewsContent, setNewNewsContent] = useState("");
  const [newNewsImageUrl, setNewNewsImageUrl] = useState("");
  const [addingNews, setAddingNews] = useState(false);

  const [newAdminUid, setNewAdminUid] = useState("");
  const [newAdminEmail, setNewAdminEmail] = useState("");
  const [newAdminName, setNewAdminName] = useState("");
  const [addingAdmin, setAddingAdmin] = useState(false);

  useEffect(() => {
    setDraftTexts(customTexts);
  }, [customTexts]);

  useEffect(() => {
    setDraftCirculars(circulars);
  }, [circulars]);

  const showSuccessToast = (msg: string) => {
    setFeedback(msg);
    setTimeout(() => setFeedback(""), 3500);
  };

  const runFileUpload = async (
    key: string,
    file: File,
    folder: UploadFolder,
    onSuccess: (url: string, fileName: string) => Promise<void> | void
  ) => {
    setUploadError("");
    setUploadProgress((prev) => ({ ...prev, [key]: 1 }));
    try {
      const downloadUrl = await uploadPortalFile(file, folder, (pct) => {
        setUploadProgress((prev) => ({ ...prev, [key]: pct }));
      });
      await onSuccess(downloadUrl, file.name);
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload failed.");
    } finally {
      setUploadProgress((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError("");
    setAuthBusy(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Failed to sign in with Google."
      );
    } finally {
      setAuthBusy(false);
    }
  };

  const handleSignOut = async () => {
    await logoutAdmin();
    showSuccessToast("Signed out of administrator workspace.");
  };

  // --- Content Manager Handlers ---
  const openCreateContent = () => {
    setContentForm(createEmptyContentForm(categories));
    setSlugTouched(false);
    setManualPdfName("");
    setManualPdfUrl("");
    setEditorOpen(true);
  };

  const openEditContent = (item: PortalContentItem) => {
    setContentForm({
      id: item.id,
      title: item.title,
      slug: item.slug,
      contentType: item.contentType,
      categorySlug: item.categorySlug,
      categoryName: item.categoryName,
      subcategory: item.subcategory,
      issuingAuthority: item.issuingAuthority,
      orderNumber: item.orderNumber,
      issueDate: item.issueDate.slice(0, 10),
      publicationDate: item.publicationDate.slice(0, 10),
      shortDescription: item.shortDescription,
      fullContent: item.fullContent,
      featuredImageUrl: item.featuredImageUrl,
      pdfAttachments: item.pdfAttachments || [],
      officialSourceUrl: item.officialSourceUrl,
      status: item.status,
      isFeatured: item.isFeatured,
      isImportantDoc: item.isImportantDoc,
    });
    setSlugTouched(true);
    setManualPdfName("");
    setManualPdfUrl("");
    setEditorOpen(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSavePortalContent = async (forcedStatus?: ContentStatus) => {
    if (!contentForm.title.trim()) {
      setAuthError("Please enter a title before saving.");
      return;
    }
    setAuthError("");
    setSavingContent(true);
    try {
      const targetStatus = forcedStatus ?? contentForm.status;
      await savePortalContent({
        ...contentForm,
        slug: contentForm.slug.trim() || slugifyText(contentForm.title, 160),
        status: targetStatus,
      });
      setEditorOpen(false);
      showSuccessToast(
        targetStatus === "published"
          ? "Publication saved and published live to Firestore!"
          : "Saved as draft in Firestore!"
      );
    } catch (err) {
      setAuthError(
        err instanceof Error ? err.message : "Failed to save publication."
      );
    } finally {
      setSavingContent(false);
    }
  };

  const handleAddManualPdfAttachment = () => {
    if (!manualPdfUrl.trim()) return;
    if (contentForm.pdfAttachments.length >= 10) {
      setUploadError("Maximum of 10 PDF attachments allowed per item.");
      return;
    }
    const nextItem: PdfAttachment = {
      name: manualPdfName.trim() || "Official Document PDF",
      url: manualPdfUrl.trim(),
    };
    setContentForm((prev) => ({
      ...prev,
      pdfAttachments: [...prev.pdfAttachments, nextItem],
    }));
    setManualPdfName("");
    setManualPdfUrl("");
  };

  const selectedCategoryObj = useMemo(
    () => categories.find((c) => c.slug === contentForm.categorySlug) || null,
    [categories, contentForm.categorySlug]
  );

  const filteredAdminContent = useMemo(() => {
    const q = contentSearch.trim().toLowerCase();
    return allAdminContent.filter((item) => {
      if (filterCat !== "all" && item.categorySlug !== filterCat) return false;
      if (filterStatus !== "all" && item.status !== filterStatus) return false;
      if (filterType !== "all" && item.contentType !== filterType) return false;
      if (!q) return true;
      return (
        item.title.toLowerCase().includes(q) ||
        item.orderNumber.toLowerCase().includes(q) ||
        item.issuingAuthority.toLowerCase().includes(q) ||
        item.subcategory.toLowerCase().includes(q)
      );
    });
  }, [allAdminContent, contentSearch, filterCat, filterStatus, filterType]);

  const ADMIN_PAGE_SIZE = 10;
  const paginatedAdminContent = filteredAdminContent.slice(
    (contentPage - 1) * ADMIN_PAGE_SIZE,
    contentPage * ADMIN_PAGE_SIZE
  );

  useEffect(() => {
    setContentPage(1);
  }, [contentSearch, filterCat, filterStatus, filterType]);

  // --- Category Manager Handlers ---
  const resetCategoryForm = () => {
    setEditingCatId(null);
    setCatName("");
    setCatSlug("");
    setCatSlugTouched(false);
    setCatDesc("");
    setCatOrder(categories.length + 1);
    setCatIsActive(true);
    setCatSubcategories([]);
    setNewSubcatInput("");
  };

  const startEditCategory = (cat: PortalCategory) => {
    setEditingCatId(cat.id);
    setCatName(cat.name);
    setCatSlug(cat.slug);
    setCatSlugTouched(true);
    setCatDesc(cat.description);
    setCatOrder(cat.sortOrder);
    setCatIsActive(cat.isActive);
    setCatSubcategories(cat.subcategories || []);
    setNewSubcatInput("");
  };

  const handleAddSubcategory = () => {
    const cleaned = newSubcatInput.trim();
    if (!cleaned) return;
    if (catSubcategories.length >= 25) return;
    if (!catSubcategories.includes(cleaned)) {
      setCatSubcategories((prev) => [...prev, cleaned]);
    }
    setNewSubcatInput("");
  };

  const handleSaveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) return;
    setSavingCategory(true);
    setAuthError("");
    try {
      await saveCategory({
        id: editingCatId || undefined,
        name: catName.trim(),
        slug: catSlug.trim() || slugifyText(catName, 80),
        description:
          catDesc.trim() || "Official articles, updates, and resources for veterans.",
        subcategories: catSubcategories,
        sortOrder: Number(catOrder) || 0,
        isActive: catIsActive,
      });
      resetCategoryForm();
      showSuccessToast(
        editingCatId ? "Category updated in Firestore!" : "New category added to Firestore!"
      );
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to save category.");
    } finally {
      setSavingCategory(false);
    }
  };

  // --- Legacy / Site Settings Handlers ---
  const handleSaveAllContent = async () => {
    setSavingAll(true);
    try {
      await saveSiteTextsAndCirculars(draftTexts, draftCirculars);
      showSuccessToast("All site content and circular headings saved to Firebase Firestore!");
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : "Failed to save changes.");
    } finally {
      setSavingAll(false);
    }
  };

  const handleAddCircular = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCircTitle.trim()) return;
    setAddingCirc(true);
    try {
      await addCircular({
        title: newCircTitle.trim(),
        fileUrl: newCircFileUrl.trim() || null,
        isNew: newCircIsNew,
      });
      setNewCircTitle("");
      setNewCircFileUrl("");
      setNewCircIsNew(true);
      showSuccessToast("New circular published to Firestore!");
    } finally {
      setAddingCirc(false);
    }
  };

  const handleAddNews = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNewsTitle.trim() || !newNewsContent.trim()) return;
    setAddingNews(true);
    try {
      await addNewsArticle({
        title: newNewsTitle.trim(),
        author: newNewsAuthor.trim() || "Admin",
        content: newNewsContent.trim(),
        imageUrl: newNewsImageUrl.trim() || null,
      });
      setNewNewsTitle("");
      setNewNewsContent("");
      setNewNewsImageUrl("");
      showSuccessToast("News article published to Firestore!");
    } finally {
      setAddingNews(false);
    }
  };

  const handleAddAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAdminUid.trim() || !newAdminEmail.trim() || !newAdminName.trim()) return;
    setAddingAdmin(true);
    try {
      await addAdminUser(newAdminUid.trim(), newAdminEmail.trim(), newAdminName.trim());
      setNewAdminUid("");
      setNewAdminEmail("");
      setNewAdminName("");
      showSuccessToast("Authorized editor added to Firestore!");
    } finally {
      setAddingAdmin(false);
    }
  };

  const handleReset = async () => {
    await resetToDefault();
    setConfirmReset(false);
    showSuccessToast("Reverted site configuration and default circulars in Firestore.");
  };

  // Auth initializing view
  if (!authReady || adminCheckLoading) {
    return (
      <div className="max-w-md mx-auto px-4 w-full py-20 text-center">
        <SEOHead
          title="Administrator CMS"
          description="Faujitimes Central Administrator Portal."
        />
        <div className="bg-white rounded-xl shadow-lg border border-gray-200 p-8 flex flex-col items-center gap-3">
          <Loader2 className="w-8 h-8 text-veteran-navy animate-spin" />
          <p className="text-sm font-medium text-gray-600">
            Verifying Firebase Authentication session...
          </p>
        </div>
      </div>
    );
  }

  // Not Signed In -> Google Sign-In View
  if (!isLoggedIn) {
    return (
      <div className="max-w-md mx-auto px-4 w-full py-16">
        <SEOHead
          title="Administrator Login"
          description="Sign in to manage Faujitimes Ex-Servicemen Welfare Information Portal."
        />
        <div className="bg-white rounded-xl shadow-xl border border-gray-200 overflow-hidden">
          <div className="bg-veteran-navy p-6 text-center text-white relative">
            <div className="absolute top-3 right-3">
              <ShieldAlert className="w-5 h-5 text-veteran-gold" />
            </div>
            <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
              <Lock className="w-6 h-6 text-veteran-gold" />
            </div>
            <h2 className="text-xl font-serif font-bold text-white">Administrator Login</h2>
            <p className="text-xs text-gray-300 mt-1">
              Secured by Firebase Authentication & Firestore Access Rules
            </p>
          </div>

          <div className="p-6 space-y-5">
            {authError && (
              <div className="bg-red-50 text-red-800 p-3 rounded text-xs font-semibold border border-red-200">
                {authError}
              </div>
            )}

            <p className="text-xs text-gray-600 leading-relaxed text-center">
              Sign in with your authorized Google account to manage Faujitimes portal content, categories, PDFs, photos, and site configuration.
            </p>

            <button
              type="button"
              disabled={authBusy}
              onClick={handleGoogleSignIn}
              className="w-full min-h-[44px] bg-veteran-gold hover:bg-yellow-400 disabled:opacity-60 text-veteran-navy font-bold py-3 px-4 rounded shadow-md transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2.5 whitespace-nowrap"
            >
              {authBusy ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> Authenticating...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4" viewBox="0 0 24 24" aria-hidden="true">
                    <path
                      fill="currentColor"
                      d="M21.35 11.1h-9.17v2.73h6.51c-.33 3.81-3.5 5.44-6.5 5.44C8.36 19.27 5 16.25 5 12c0-4.1 3.2-7.27 7.2-7.27c3.09 0 4.9 1.97 4.9 1.97L19 4.72S16.56 2 12.1 2C6.42 2 2.03 6.8 2.03 12c0 5.05 4.13 10 10.22 10c5.35 0 9.25-3.67 9.25-9.09c0-1.15-.15-1.81-.15-1.81Z"
                    />
                  </svg>
                  Sign in with Google
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Signed in, but NOT an authorized admin
  if (!isAdmin) {
    return (
      <div className="max-w-md mx-auto px-4 w-full py-16">
        <SEOHead
          title="Access Restricted"
          description="Administrator access verification required."
        />
        <div className="bg-white rounded-xl shadow-xl border border-red-200 overflow-hidden">
          <div className="bg-veteran-maroon p-6 text-center text-white">
            <div className="mx-auto w-12 h-12 bg-white/10 rounded-full flex items-center justify-center mb-3">
              <ShieldAlert className="w-6 h-6 text-veteran-gold" />
            </div>
            <h2 className="text-xl font-serif font-bold text-white">Access Restricted</h2>
            <p className="text-xs text-red-100 mt-1">
              This account does not have administrator permissions
            </p>
          </div>

          <div className="p-6 space-y-4 text-center">
            <div className="bg-slate-50 border border-gray-200 rounded-lg p-3 text-left text-xs space-y-1">
              <div>
                <span className="font-bold text-gray-600">Signed in email:</span>{" "}
                <span className="text-gray-900">{user?.email || "Unknown"}</span>
              </div>
              <div>
                <span className="font-bold text-gray-600">Email verified:</span>{" "}
                <span className="text-gray-900">{user?.emailVerified ? "Yes" : "No"}</span>
              </div>
              <div className="break-all">
                <span className="font-bold text-gray-600">User UID:</span>{" "}
                <code className="text-[11px] text-gray-800">{user?.uid}</code>
              </div>
            </div>

            <p className="text-xs text-gray-600 leading-relaxed">
              Please sign in with the authorized portal administrator account, or share your User UID above with the Super Admin to be granted editor access.
            </p>

            <button
              type="button"
              onClick={handleSignOut}
              className="w-full min-h-[42px] bg-veteran-navy hover:bg-slate-800 text-white font-bold py-2.5 px-4 rounded shadow transition-all uppercase tracking-wider text-xs flex items-center justify-center gap-2 whitespace-nowrap"
            >
              <LogOut className="w-4 h-4" /> Sign Out & Switch Account
            </button>
          </div>
        </div>
      </div>
    );
  }

  const draftCount = allAdminContent.filter((i) => i.status === "draft").length;
  const publishedCount = allAdminContent.filter((i) => i.status === "published").length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 w-full py-10">
      <SEOHead
        title="Central Admin CMS"
        description="Manage Faujitimes articles, circulars, government orders, welfare schemes, employment opportunities, and categories."
      />

      {/* Toast Alert */}
      {feedback && (
        <div className="fixed bottom-6 right-6 bg-slate-900 border border-emerald-500/30 text-emerald-400 px-5 py-3 rounded-xl shadow-2xl flex items-center gap-2.5 z-50 font-medium text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          {feedback}
        </div>
      )}

      {/* Header */}
      <div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-gray-200 pb-6">
        <div>
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-bold uppercase tracking-wider text-emerald-700">
              <Unlock className="w-3.5 h-3.5" />{" "}
              {isSuperAdmin ? "Super Admin Active" : "Admin Editor Active"}
            </span>
            <span aria-hidden="true" className="text-gray-300">
              ·
            </span>
            <span className="text-gray-600 font-medium">
              {user?.displayName ? `${user.displayName} (${user.email})` : user?.email}
            </span>
          </div>
          <h1 className="text-3xl font-serif font-bold text-veteran-navy mt-1.5">
            Central Content & Portal Dashboard
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Publish articles, circulars, orders, schemes, and employment updates to Cloud Firestore, or manage categories and site typography.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {confirmReset ? (
            <div className="inline-flex items-center gap-2 bg-amber-50 border border-amber-300 px-3 py-1.5 rounded">
              <span className="text-xs font-semibold text-amber-900">Reset defaults?</span>
              <button
                type="button"
                onClick={handleReset}
                className="px-2.5 py-1 bg-veteran-maroon text-white text-xs font-bold rounded"
              >
                Confirm
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="px-2.5 py-1 bg-white border border-gray-300 text-gray-700 text-xs font-semibold rounded"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="min-h-[40px] px-4 py-2 bg-slate-100 hover:bg-slate-200 text-gray-700 text-xs font-bold uppercase tracking-wider rounded border border-gray-300 flex items-center gap-1.5 transition-colors whitespace-nowrap"
            >
              <RotateCcw className="w-3.5 h-3.5" /> Reset Defaults
            </button>
          )}
          <button
            type="button"
            onClick={handleSignOut}
            className="min-h-[40px] px-4 py-2 bg-veteran-maroon hover:bg-red-700 text-white text-xs font-bold uppercase tracking-wider rounded shadow transition-all flex items-center gap-1.5 whitespace-nowrap"
          >
            <LogOut className="w-3.5 h-3.5" /> Sign Out
          </button>
        </div>
      </div>

      {/* Summary Bar + Navigation Tabs */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-6">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveTab("content")}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 border transition-colors whitespace-nowrap ${
              activeTab === "content"
                ? "bg-veteran-navy text-white border-veteran-navy shadow-xs"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <LayoutList className="w-4 h-4" />
            Content Manager ({allAdminContent.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("categories")}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 border transition-colors whitespace-nowrap ${
              activeTab === "categories"
                ? "bg-veteran-navy text-white border-veteran-navy shadow-xs"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <FolderTree className="w-4 h-4" />
            Categories & Subcategories ({categories.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("settings")}
            className={`min-h-[42px] px-4 py-2 rounded-lg text-xs font-bold uppercase tracking-wider inline-flex items-center gap-2 border transition-colors whitespace-nowrap ${
              activeTab === "settings"
                ? "bg-veteran-navy text-white border-veteran-navy shadow-xs"
                : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
            }`}
          >
            <Settings className="w-4 h-4" />
            Site Settings, Theme & Quick Circulars
          </button>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-600 tabular-nums">
          <span>
            <strong className="text-emerald-700">{publishedCount}</strong> Published
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-amber-700">{draftCount}</strong> Drafts
          </span>
          <span aria-hidden="true">·</span>
          <span>
            <strong className="text-veteran-navy">{categories.length}</strong> Active Categories
          </span>
        </div>
      </div>

      {authError && (
        <div className="mb-6 bg-red-50 text-red-800 p-3.5 rounded-lg text-xs font-semibold border border-red-200 flex items-center justify-between">
          <span>{authError}</span>
          <button type="button" onClick={() => setAuthError("")} className="p-1">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {uploadError && (
        <div className="mb-6 bg-amber-50 text-amber-900 p-4 rounded-lg text-xs border border-amber-300 flex items-start justify-between gap-3">
          <div className="space-y-1">
            <p className="font-bold">File Upload Notice</p>
            <p>{uploadError}</p>
            <p className="text-[11px] text-amber-800">
              Manage Storage setup & rules in Firebase Console:{" "}
              <a
                href={`https://console.firebase.google.com/project/${FIREBASE_PROJECT_ID}/storage/rules`}
                target="_blank"
                rel="noreferrer"
                className="underline font-semibold"
              >
                Open Firebase Storage Rules
              </a>
            </p>
          </div>
          <button
            type="button"
            onClick={() => setUploadError("")}
            className="p-1 hover:bg-amber-200/50 rounded shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* ============================================================
          TAB 1: CENTRALIZED CONTENT MANAGER
         ============================================================ */}
      {activeTab === "content" && (
        <div className="space-y-6">
          {/* Create / Edit Content Form Panel */}
          {editorOpen ? (
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="bg-veteran-navy text-white px-6 py-4 flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-serif font-bold">
                    {contentForm.id ? "Edit Publication" : "Create New Publication"}
                  </h2>
                  <p className="text-xs text-gray-300">
                    All fields sync directly to Firestore. Only items marked Published appear publicly.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditorOpen(false)}
                  className="p-2 hover:bg-white/10 rounded text-white"
                  title="Close editor"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="p-6 space-y-5">
                {/* Row 1: Title & Slug */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Title *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={300}
                      value={contentForm.title}
                      onChange={(e) => {
                        const nextTitle = e.target.value;
                        setContentForm((prev) => ({
                          ...prev,
                          title: nextTitle,
                          slug: slugTouched ? prev.slug : slugifyText(nextTitle, 160),
                        }));
                      }}
                      placeholder="e.g. Revision of OROP Table No. 7 for PBOR Veterans"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <div className="flex items-center justify-between">
                      <label className="block text-xs font-bold text-gray-700">
                        SEO URL Slug *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setSlugTouched(false);
                          setContentForm((prev) => ({
                            ...prev,
                            slug: slugifyText(prev.title, 160),
                          }));
                        }}
                        className="text-[11px] font-semibold text-veteran-navy hover:underline"
                      >
                        Regenerate from title
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      maxLength={160}
                      value={contentForm.slug}
                      onChange={(e) => {
                        setSlugTouched(true);
                        setContentForm((prev) => ({
                          ...prev,
                          slug: e.target.value
                            .toLowerCase()
                            .replace(/[^a-z0-9-]/g, "-"),
                        }));
                      }}
                      placeholder="revision-of-orop-table-7"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono focus:ring-1 focus:ring-veteran-navy outline-none"
                    />
                  </div>
                </div>

                {/* Row 2: Type, Category, Subcategory */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Content Type *
                    </label>
                    <select
                      value={contentForm.contentType}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          contentType: e.target.value as ContentType,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-veteran-navy outline-none"
                    >
                      {CONTENT_TYPES.map((ct) => (
                        <option key={ct.value} value={ct.value}>
                          {ct.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Main Category *
                    </label>
                    <select
                      value={contentForm.categorySlug}
                      onChange={(e) => {
                        const slug = e.target.value;
                        const found = categories.find((c) => c.slug === slug);
                        setContentForm((prev) => ({
                          ...prev,
                          categorySlug: slug,
                          categoryName: found?.name || slug,
                          subcategory: found?.subcategories?.[0] || "",
                        }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-veteran-navy outline-none"
                    >
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.slug}>
                          {cat.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Subcategory
                    </label>
                    <div className="flex gap-2">
                      {selectedCategoryObj && selectedCategoryObj.subcategories.length > 0 && (
                        <select
                          value={
                            selectedCategoryObj.subcategories.includes(contentForm.subcategory)
                              ? contentForm.subcategory
                              : ""
                          }
                          onChange={(e) =>
                            setContentForm((prev) => ({
                              ...prev,
                              subcategory: e.target.value,
                            }))
                          }
                          className="w-1/2 px-2 py-2 border border-gray-300 rounded text-xs bg-white focus:ring-1 focus:ring-veteran-navy outline-none"
                        >
                          <option value="">Select preset…</option>
                          {selectedCategoryObj.subcategories.map((sub) => (
                            <option key={sub} value={sub}>
                              {sub}
                            </option>
                          ))}
                        </select>
                      )}
                      <input
                        type="text"
                        maxLength={120}
                        value={contentForm.subcategory}
                        onChange={(e) =>
                          setContentForm((prev) => ({
                            ...prev,
                            subcategory: e.target.value,
                          }))
                        }
                        placeholder="Custom or preset subcategory"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                      />
                    </div>
                  </div>
                </div>

                {/* Row 3: Authority, Order No, Issue Date, Publication Date */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Issuing Authority *
                    </label>
                    <input
                      type="text"
                      required
                      maxLength={180}
                      value={contentForm.issuingAuthority}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          issuingAuthority: e.target.value,
                        }))
                      }
                      placeholder="DESW / KSB / PCDA / ECHS"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Circular / Order Number
                    </label>
                    <input
                      type="text"
                      maxLength={120}
                      value={contentForm.orderNumber}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          orderNumber: e.target.value,
                        }))
                      }
                      placeholder="e.g. No. 1(4)/2026/D(Pen)"
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Date of Issue *
                    </label>
                    <input
                      type="date"
                      required
                      value={contentForm.issueDate}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          issueDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Publication Date *
                    </label>
                    <input
                      type="date"
                      required
                      value={contentForm.publicationDate}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          publicationDate: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                    />
                  </div>
                </div>

                {/* Row 4: Short Description & Full Content */}
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Short Description / Summary *
                  </label>
                  <textarea
                    rows={2}
                    required
                    maxLength={600}
                    value={contentForm.shortDescription}
                    onChange={(e) =>
                      setContentForm((prev) => ({
                        ...prev,
                        shortDescription: e.target.value,
                      }))
                    }
                    placeholder="Concise summary displayed on homepage, category pages, and search results..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Full Content *
                  </label>
                  <textarea
                    rows={8}
                    required
                    maxLength={30000}
                    value={contentForm.fullContent}
                    onChange={(e) =>
                      setContentForm((prev) => ({
                        ...prev,
                        fullContent: e.target.value,
                      }))
                    }
                    placeholder="Complete article body, circular provisions, eligibility instructions, and step-by-step guidance..."
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none leading-relaxed"
                  />
                </div>

                {/* Row 5: Featured Image & Official Source URL */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 bg-slate-50/70 p-4 rounded-lg border border-gray-200">
                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Featured Image (Upload from Computer or Paste URL)
                    </label>
                    <div className="flex gap-2 items-center">
                      <input
                        type="url"
                        maxLength={500}
                        value={contentForm.featuredImageUrl || ""}
                        onChange={(e) =>
                          setContentForm((prev) => ({
                            ...prev,
                            featuredImageUrl: e.target.value || null,
                          }))
                        }
                        placeholder="https://... or upload →"
                        className="flex-1 min-w-0 px-3 py-2 border border-gray-300 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-veteran-navy"
                      />
                      <label className="cursor-pointer min-h-[36px] px-3 py-2 bg-veteran-navy hover:bg-slate-800 text-white rounded text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                        <ImageIcon className="w-3.5 h-3.5" />
                        <span>
                          {uploadProgress.content_img !== undefined
                            ? `${uploadProgress.content_img}%`
                            : "Upload Photo"}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={uploadProgress.content_img !== undefined}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            e.target.value = "";
                            if (!file) return;
                            void runFileUpload("content_img", file, "images", (url) => {
                              setContentForm((prev) => ({
                                ...prev,
                                featuredImageUrl: url,
                              }));
                              showSuccessToast("Featured image uploaded!");
                            });
                          }}
                        />
                      </label>
                    </div>
                    {contentForm.featuredImageUrl && (
                      <div className="flex items-center gap-3 pt-1">
                        <img
                          src={contentForm.featuredImageUrl}
                          alt="Featured preview"
                          referrerPolicy="no-referrer"
                          className="w-20 h-14 object-cover rounded border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            setContentForm((prev) => ({ ...prev, featuredImageUrl: null }))
                          }
                          className="text-xs text-red-600 hover:underline font-semibold"
                        >
                          Remove image
                        </button>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <label className="block text-xs font-bold text-gray-700">
                      Official Source URL (e.g. desw.gov.in, sparsh, echs.gov.in)
                    </label>
                    <input
                      type="url"
                      maxLength={500}
                      value={contentForm.officialSourceUrl || ""}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          officialSourceUrl: e.target.value || null,
                        }))
                      }
                      placeholder="https://desw.gov.in/..."
                      className="w-full px-3 py-2 border border-gray-300 rounded text-xs bg-white outline-none focus:ring-1 focus:ring-veteran-navy"
                    />
                    <div className="flex flex-wrap gap-5 pt-2">
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contentForm.isFeatured}
                          onChange={(e) =>
                            setContentForm((prev) => ({
                              ...prev,
                              isFeatured: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                        />
                        Feature on Homepage Highlights
                      </label>
                      <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={contentForm.isImportantDoc}
                          onChange={(e) =>
                            setContentForm((prev) => ({
                              ...prev,
                              isImportantDoc: e.target.checked,
                            }))
                          }
                          className="rounded border-gray-300"
                        />
                        Include in Important Documents
                      </label>
                    </div>
                  </div>
                </div>

                {/* Row 6: PDF Attachments (Multiple Direct Uploads or URLs) */}
                <div className="bg-slate-50/70 p-4 rounded-lg border border-gray-200 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-veteran-navy">
                        Downloadable PDF Attachments ({contentForm.pdfAttachments.length}/10)
                      </h3>
                      <p className="text-[11px] text-gray-500">
                        Upload official circular PDFs from your computer or link external government PDFs.
                      </p>
                    </div>
                    <label className="cursor-pointer min-h-[38px] px-3.5 py-2 bg-veteran-olive hover:bg-veteran-olive-dark text-white rounded text-xs font-bold inline-flex items-center gap-1.5 shrink-0 whitespace-nowrap">
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {uploadProgress.content_pdf !== undefined
                          ? `Uploading PDF ${uploadProgress.content_pdf}%`
                          : "Upload PDF from Computer"}
                      </span>
                      <input
                        type="file"
                        accept="application/pdf,.pdf"
                        className="hidden"
                        disabled={
                          uploadProgress.content_pdf !== undefined ||
                          contentForm.pdfAttachments.length >= 10
                        }
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          void runFileUpload("content_pdf", file, "pdfs", (url, fileName) => {
                            setContentForm((prev) => ({
                              ...prev,
                              pdfAttachments: [
                                ...prev.pdfAttachments,
                                { name: fileName.slice(0, 200), url },
                              ],
                            }));
                            showSuccessToast("PDF attached!");
                          });
                        }}
                      />
                    </label>
                  </div>

                  {/* Manual URL add row */}
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      type="text"
                      maxLength={200}
                      value={manualPdfName}
                      onChange={(e) => setManualPdfName(e.target.value)}
                      placeholder="Attachment Label (e.g. Official DESW Order PDF)"
                      className="sm:w-1/3 px-3 py-1.5 border border-gray-300 rounded text-xs bg-white outline-none"
                    />
                    <input
                      type="url"
                      maxLength={500}
                      value={manualPdfUrl}
                      onChange={(e) => setManualPdfUrl(e.target.value)}
                      placeholder="https://... PDF URL"
                      className="flex-1 px-3 py-1.5 border border-gray-300 rounded text-xs bg-white outline-none"
                    />
                    <button
                      type="button"
                      onClick={handleAddManualPdfAttachment}
                      className="px-3 py-1.5 bg-white border border-gray-300 hover:bg-gray-100 text-veteran-navy text-xs font-bold rounded whitespace-nowrap"
                    >
                      + Add Link
                    </button>
                  </div>

                  {contentForm.pdfAttachments.length > 0 && (
                    <div className="space-y-2 pt-1">
                      {contentForm.pdfAttachments.map((att, idx) => (
                        <div
                          key={`${att.url}-${idx}`}
                          className="flex items-center justify-between gap-3 bg-white border border-gray-200 px-3 py-2 rounded text-xs"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <FileText className="w-4 h-4 text-veteran-maroon shrink-0" />
                            <span className="font-semibold text-gray-800 truncate">
                              {att.name}
                            </span>
                            <a
                              href={att.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-veteran-navy hover:underline shrink-0 inline-flex items-center gap-0.5"
                            >
                              Open <ExternalLink className="w-3 h-3" />
                            </a>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setContentForm((prev) => ({
                                ...prev,
                                pdfAttachments: prev.pdfAttachments.filter((_, i) => i !== idx),
                              }))
                            }
                            className="p-1 text-red-600 hover:bg-red-50 rounded"
                            title="Remove attachment"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Action Footer */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-4 border-t border-gray-200">
                  <div className="flex items-center gap-2 text-xs text-gray-600">
                    <span className="font-bold">Publication Status:</span>
                    <select
                      value={contentForm.status}
                      onChange={(e) =>
                        setContentForm((prev) => ({
                          ...prev,
                          status: e.target.value as ContentStatus,
                        }))
                      }
                      className="px-2.5 py-1.5 border border-gray-300 rounded text-xs bg-white font-semibold"
                    >
                      <option value="published">Published (Publicly Visible)</option>
                      <option value="draft">Draft (Admin Only)</option>
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setEditorOpen(false)}
                      className="min-h-[40px] px-4 py-2 border border-gray-300 bg-white hover:bg-gray-50 text-gray-700 text-xs font-bold rounded whitespace-nowrap"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      disabled={savingContent}
                      onClick={() => void handleSavePortalContent("draft")}
                      className="min-h-[40px] px-4 py-2 border border-amber-400 bg-amber-50 hover:bg-amber-100 text-amber-900 text-xs font-bold rounded whitespace-nowrap"
                    >
                      Save as Draft
                    </button>
                    <button
                      type="button"
                      disabled={savingContent}
                      onClick={() => void handleSavePortalContent("published")}
                      className="min-h-[40px] px-5 py-2 bg-veteran-navy hover:bg-slate-800 disabled:opacity-60 text-white text-xs font-bold uppercase tracking-wider rounded shadow inline-flex items-center gap-2 whitespace-nowrap"
                    >
                      {savingContent ? (
                        <>
                          <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving...
                        </>
                      ) : (
                        <>
                          <Globe className="w-3.5 h-3.5" /> Save & Publish
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Toolbar & List */
            <>
              <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 flex-1">
                  <div className="relative flex-1 min-w-[220px]">
                    <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={contentSearch}
                      onChange={(e) => setContentSearch(e.target.value)}
                      placeholder="Filter by title, order no., authority..."
                      className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-veteran-navy"
                    />
                  </div>

                  <select
                    value={filterCat}
                    onChange={(e) => setFilterCat(e.target.value)}
                    className="px-3 py-2 border border-gray-300 rounded text-xs bg-white outline-none"
                  >
                    <option value="all">All Categories</option>
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.slug}>
                        {cat.name}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value as "all" | ContentType)}
                    className="px-3 py-2 border border-gray-300 rounded text-xs bg-white outline-none"
                  >
                    <option value="all">All Types</option>
                    {CONTENT_TYPES.map((ct) => (
                      <option key={ct.value} value={ct.value}>
                        {ct.label}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value as "all" | ContentStatus)}
                    className="px-3 py-2 border border-gray-300 rounded text-xs bg-white outline-none"
                  >
                    <option value="all">All Statuses</option>
                    <option value="published">Published Only</option>
                    <option value="draft">Drafts Only</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={openCreateContent}
                  className="min-h-[42px] px-5 py-2.5 bg-veteran-gold hover:bg-yellow-400 text-veteran-navy font-bold text-xs uppercase tracking-wider rounded shadow inline-flex items-center justify-center gap-2 shrink-0 whitespace-nowrap"
                >
                  <Plus className="w-4 h-4" /> New Publication
                </button>
              </div>

              <div className="bg-white rounded-xl border border-gray-200 overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead>
                      <tr className="bg-veteran-navy text-white text-xs uppercase tracking-wider">
                        <th className="p-4 font-semibold">Title & Authority</th>
                        <th className="p-4 font-semibold">Category</th>
                        <th className="p-4 font-semibold">Pub Date</th>
                        <th className="p-4 font-semibold">Status</th>
                        <th className="p-4 font-semibold text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 text-sm">
                      {paginatedAdminContent.length > 0 ? (
                        paginatedAdminContent.map((item) => (
                          <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                            <td className="p-4 max-w-md">
                              <div className="font-bold text-gray-900 leading-snug">
                                {item.title}
                              </div>
                              <div className="text-xs text-gray-500 mt-1 flex flex-wrap items-center gap-x-2">
                                <span className="uppercase font-semibold text-veteran-olive">
                                  {item.contentType}
                                </span>
                                {item.orderNumber && (
                                  <>
                                    <span aria-hidden="true">·</span>
                                    <span>{item.orderNumber}</span>
                                  </>
                                )}
                                <span aria-hidden="true">·</span>
                                <span>{item.issuingAuthority}</span>
                              </div>
                            </td>

                            <td className="p-4 text-xs">
                              <div className="font-semibold text-veteran-navy">
                                {item.categoryName}
                              </div>
                              {item.subcategory && (
                                <div className="text-gray-500 mt-0.5">{item.subcategory}</div>
                              )}
                            </td>

                            <td className="p-4 text-xs text-gray-600 tabular-nums whitespace-nowrap">
                              {item.publicationDate.slice(0, 10)}
                            </td>

                            <td className="p-4 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={async () => {
                                  const next: ContentStatus =
                                    item.status === "published" ? "draft" : "published";
                                  await togglePortalContentStatus(item.id, next);
                                  showSuccessToast(
                                    next === "published"
                                      ? "Publication is now public."
                                      : "Moved publication to drafts."
                                  );
                                }}
                                className={`px-2.5 py-1 rounded text-[11px] font-bold uppercase tracking-wider border transition-colors ${
                                  item.status === "published"
                                    ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
                                    : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
                                }`}
                                title="Click to toggle Published/Draft"
                              >
                                {item.status}
                              </button>
                            </td>

                            <td className="p-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-1.5">
                                {item.status === "published" && (
                                  <Link
                                    to={`/article/${item.slug}`}
                                    target="_blank"
                                    className="p-2 text-gray-600 hover:text-veteran-navy hover:bg-gray-100 rounded"
                                    title="View public article"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </Link>
                                )}
                                <button
                                  type="button"
                                  onClick={() => openEditContent(item)}
                                  className="p-2 text-veteran-navy hover:bg-slate-100 rounded"
                                  title="Edit item"
                                >
                                  <Pencil className="w-4 h-4" />
                                </button>
                                {confirmDeleteContentId === item.id ? (
                                  <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 px-2 py-1 rounded">
                                    <button
                                      type="button"
                                      onClick={async () => {
                                        await deletePortalContent(item.id);
                                        setConfirmDeleteContentId(null);
                                        showSuccessToast("Publication deleted.");
                                      }}
                                      className="text-[11px] font-bold text-red-700 hover:underline"
                                    >
                                      Confirm
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => setConfirmDeleteContentId(null)}
                                      className="text-[11px] text-gray-600"
                                    >
                                      Cancel
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() => setConfirmDeleteContentId(item.id)}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded"
                                    title="Delete item"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={5} className="p-10 text-center text-gray-500 text-sm">
                            No content items match your current filters. Click "New Publication" to create one.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <Pagination
                currentPage={contentPage}
                totalItems={filteredAdminContent.length}
                pageSize={ADMIN_PAGE_SIZE}
                onPageChange={setContentPage}
              />
            </>
          )}
        </div>
      )}

      {/* ============================================================
          TAB 2: CATEGORIES & SUBCATEGORIES MANAGER
         ============================================================ */}
      {activeTab === "categories" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Category Form */}
          <div className="lg:col-span-1">
            <form
              onSubmit={handleSaveCategory}
              className="bg-white rounded-xl border border-gray-200 p-6 space-y-4"
            >
              <div className="flex items-center justify-between border-b border-gray-100 pb-3">
                <h2 className="text-sm font-bold text-veteran-navy uppercase tracking-wider">
                  {editingCatId ? "Edit Category" : "Add New Category"}
                </h2>
                {editingCatId && (
                  <button
                    type="button"
                    onClick={resetCategoryForm}
                    className="text-xs text-gray-500 hover:underline"
                  >
                    New Category
                  </button>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Category Name *
                </label>
                <input
                  type="text"
                  required
                  maxLength={120}
                  value={catName}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCatName(val);
                    if (!catSlugTouched) {
                      setCatSlug(slugifyText(val, 80));
                    }
                  }}
                  placeholder="e.g. Gallantry & Honors"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-veteran-navy"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  URL Slug * (/category/...)
                </label>
                <input
                  type="text"
                  required
                  maxLength={80}
                  value={catSlug}
                  onChange={(e) => {
                    setCatSlugTouched(true);
                    setCatSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"));
                  }}
                  placeholder="gallantry-honors"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm font-mono outline-none focus:ring-1 focus:ring-veteran-navy"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-gray-700">
                  Description *
                </label>
                <textarea
                  rows={3}
                  required
                  maxLength={500}
                  value={catDesc}
                  onChange={(e) => setCatDesc(e.target.value)}
                  placeholder="Short description shown on homepage and category page header..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none focus:ring-1 focus:ring-veteran-navy"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-gray-700">Sort Order</label>
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={catOrder}
                    onChange={(e) => setCatOrder(Number(e.target.value))}
                    className="w-full px-3 py-2 border border-gray-300 rounded text-sm outline-none"
                  />
                </div>
                <div className="flex items-end pb-2">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-gray-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={catIsActive}
                      onChange={(e) => setCatIsActive(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Active Category
                  </label>
                </div>
              </div>

              {/* Subcategories editor */}
              <div className="space-y-2 pt-2 border-t border-gray-100">
                <label className="block text-xs font-bold text-gray-700">
                  Subcategories ({catSubcategories.length}/25)
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    maxLength={100}
                    value={newSubcatInput}
                    onChange={(e) => setNewSubcatInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleAddSubcategory();
                      }
                    }}
                    placeholder="Add subcategory name..."
                    className="flex-1 min-w-0 px-3 py-1.5 border border-gray-300 rounded text-xs outline-none"
                  />
                  <button
                    type="button"
                    onClick={handleAddSubcategory}
                    className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 border border-gray-300 rounded text-xs font-bold text-veteran-navy"
                  >
                    Add
                  </button>
                </div>

                {catSubcategories.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {catSubcategories.map((sub) => (
                      <span
                        key={sub}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 border border-gray-200 rounded text-xs text-gray-800"
                      >
                        {sub}
                        <button
                          type="button"
                          onClick={() =>
                            setCatSubcategories((prev) => prev.filter((s) => s !== sub))
                          }
                          className="text-gray-400 hover:text-red-600"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={savingCategory}
                className="w-full min-h-[42px] bg-veteran-navy hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded shadow flex items-center justify-center gap-2"
              >
                {savingCategory ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" /> Saving...
                  </>
                ) : editingCatId ? (
                  "Update Category"
                ) : (
                  "Create Category"
                )}
              </button>
            </form>
          </div>

          {/* Categories List */}
          <div className="lg:col-span-2 space-y-4">
            {categories.map((cat) => (
              <div
                key={cat.id}
                className="bg-white rounded-xl border border-gray-200 p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4"
              >
                <div className="space-y-1.5 min-w-0">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-gray-500 tabular-nums">
                    <span className="font-bold text-veteran-olive">Order #{cat.sortOrder}</span>
                    <span aria-hidden="true">·</span>
                    <Link
                      to={`/category/${cat.slug}`}
                      className="font-mono text-veteran-navy hover:underline"
                    >
                      /category/{cat.slug}
                    </Link>
                  </div>
                  <h3 className="text-lg font-serif font-bold text-veteran-navy">{cat.name}</h3>
                  <p className="text-xs text-gray-600 leading-relaxed">{cat.description}</p>
                  {cat.subcategories.length > 0 && (
                    <div className="text-xs text-gray-500 pt-1">
                      <span className="font-semibold text-gray-700">Subcategories:</span>{" "}
                      {cat.subcategories.join(" · ")}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEditCategory(cat)}
                    className="px-3 py-1.5 border border-gray-300 bg-white hover:bg-gray-50 text-veteran-navy text-xs font-bold rounded inline-flex items-center gap-1"
                  >
                    <Pencil className="w-3.5 h-3.5" /> Edit
                  </button>
                  {confirmDeleteCatId === cat.id ? (
                    <div className="inline-flex items-center gap-1 bg-red-50 border border-red-200 px-2.5 py-1.5 rounded text-xs">
                      <button
                        type="button"
                        onClick={async () => {
                          await deleteCategory(cat.id);
                          setConfirmDeleteCatId(null);
                          showSuccessToast("Category deleted.");
                        }}
                        className="font-bold text-red-700 hover:underline"
                      >
                        Confirm
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteCatId(null)}
                        className="text-gray-600"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteCatId(cat.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded border border-gray-200"
                      title="Delete category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ============================================================
          TAB 3: SITE SETTINGS, THEME & QUICK CIRCULARS / NEWS
         ============================================================ */}
      {activeTab === "settings" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Typography, PDFs & Admin Access */}
          <div className="space-y-6 lg:col-span-1">
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-veteran-navy uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <Type className="w-4 h-4 text-veteran-gold" /> Frontend Font Preference
              </h2>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Dynamically override and persist the application typography stack across all routes.
              </p>

              <div className="space-y-3">
                {[
                  { label: "Modern Sans (Inter)", value: "Inter, sans-serif" },
                  {
                    label: "Classic Journal (Playfair)",
                    value: "'Playfair Display', Georgia, serif",
                  },
                  {
                    label: "High-Tech Officer (JetBrains)",
                    value: "'JetBrains Mono', monospace",
                  },
                  { label: "Soft Traditional (Lora)", value: "Lora, Georgia, serif" },
                  { label: "System Standard (Adaptive)", value: "system-ui, sans-serif" },
                ].map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={async () => {
                      await updateFont(opt.value as FontOption);
                      showSuccessToast("Typography saved to Firestore!");
                    }}
                    className={`w-full text-left p-3 rounded border text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-between ${
                      selectedFont === opt.value
                        ? "bg-yellow-400 text-veteran-navy border-amber-500 shadow-md ring-2 ring-amber-300"
                        : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                    }`}
                  >
                    <span>{opt.label}</span>
                    {selectedFont === opt.value && (
                      <CheckCircle2 className="w-4 h-4 text-veteran-navy" />
                    )}
                  </button>
                ))}
              </div>
            </div>

            {/* Document PDF mapping section */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-veteran-navy uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <FileText className="w-4 h-4 text-veteran-gold" /> Key Document PDF Links
              </h2>
              <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                Paste an external URL or upload a PDF file directly from your computer.
              </p>

              <div className="space-y-4">
                {pdfLinks.map((pdf) => {
                  const uploadKey = `pdf_${pdf.id}`;
                  const progress = uploadProgress[uploadKey];
                  return (
                    <div key={pdf.id} className="space-y-1.5">
                      <label className="block text-[10px] font-bold uppercase text-gray-600 tracking-wider">
                        {pdf.name}
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="url"
                          maxLength={500}
                          defaultValue={pdf.url}
                          key={pdf.url}
                          onBlur={async (e) => {
                            if (e.target.value.trim() && e.target.value !== pdf.url) {
                              await updatePDFLink(pdf.id, e.target.value);
                              showSuccessToast("PDF link saved to Firestore!");
                            }
                          }}
                          className="flex-1 min-w-0 px-2.5 py-1.5 border border-gray-300 rounded text-xs focus:ring-1 focus:ring-veteran-navy outline-none"
                        />
                        <label className="shrink-0 cursor-pointer px-2.5 py-1.5 bg-veteran-navy hover:bg-slate-800 text-white rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors">
                          <Upload className="w-3 h-3" />
                          <span>{progress !== undefined ? `${progress}%` : "PDF"}</span>
                          <input
                            type="file"
                            accept="application/pdf,.pdf"
                            className="hidden"
                            disabled={progress !== undefined}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              void runFileUpload(uploadKey, file, "documents", async (url) => {
                                await updatePDFLink(pdf.id, url);
                                showSuccessToast(`${pdf.name} uploaded and saved!`);
                              });
                            }}
                          />
                        </label>
                      </div>
                    </div>
                  );
                })}
                <p className="text-[10px] text-gray-400 mt-2 italic">
                  * PDF uploads support files up to 15 MB. URL edits save when leaving the input field.
                </p>
              </div>
            </div>

            {/* Super Admin: Delegated Editor Access Control */}
            {isSuperAdmin && (
              <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
                <h2 className="text-sm font-bold text-veteran-navy uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                  <Users className="w-4 h-4 text-veteran-gold" /> Authorized Editors
                </h2>
                <p className="text-xs text-gray-500 mb-4 leading-relaxed">
                  Grant or revoke CMS editor access by Firebase User UID.
                </p>

                <div className="space-y-2 mb-4">
                  {adminUsers.map((adm) => (
                    <div
                      key={adm.uid}
                      className="flex items-center justify-between gap-2 p-2.5 bg-slate-50 border border-gray-200 rounded text-xs"
                    >
                      <div className="min-w-0">
                        <p className="font-bold text-gray-800 truncate">{adm.displayName}</p>
                        <p className="text-[11px] text-gray-500 truncate">{adm.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={async () => {
                          await removeAdminUser(adm.uid);
                          showSuccessToast("Editor access removed.");
                        }}
                        className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                        title="Revoke editor access"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ))}
                  {adminUsers.length === 0 && (
                    <p className="text-xs text-gray-400 italic">
                      No additional delegated editors configured.
                    </p>
                  )}
                </div>

                <form
                  onSubmit={handleAddAdmin}
                  className="space-y-2.5 pt-3 border-t border-gray-100"
                >
                  <input
                    type="text"
                    required
                    maxLength={128}
                    value={newAdminUid}
                    onChange={(e) => setNewAdminUid(e.target.value)}
                    placeholder="Firebase User UID"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-veteran-navy"
                  />
                  <input
                    type="email"
                    required
                    maxLength={150}
                    value={newAdminEmail}
                    onChange={(e) => setNewAdminEmail(e.target.value)}
                    placeholder="Google Email Address"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-veteran-navy"
                  />
                  <input
                    type="text"
                    required
                    maxLength={120}
                    value={newAdminName}
                    onChange={(e) => setNewAdminName(e.target.value)}
                    placeholder="Editor Display Name"
                    className="w-full px-2.5 py-1.5 border border-gray-300 rounded text-xs outline-none focus:ring-1 focus:ring-veteran-navy"
                  />
                  <button
                    type="submit"
                    disabled={addingAdmin}
                    className="w-full py-2 bg-veteran-navy hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wider rounded flex items-center justify-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />{" "}
                    {addingAdmin ? "Adding..." : "Grant Editor Access"}
                  </button>
                </form>
              </div>
            )}
          </div>

          {/* Right Column: Dynamic Site Texts, Inline Circulars & Legacy News */}
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-veteran-navy uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <Settings className="w-4 h-4 text-veteran-gold" /> Dynamic Frontend Content Editor
              </h2>
              <p className="text-xs text-gray-500 mb-6 leading-relaxed">
                Edit live titles, descriptions, circular headings, and contact blocks across Faujitimes. Click "Save & Publish Changes" to commit text edits to Firestore.
              </p>

              <div className="space-y-6">
                {/* Home hero section */}
                <div className="border border-gray-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <span className="text-[10px] font-bold text-veteran-navy uppercase tracking-widest bg-yellow-400/20 px-2 py-0.5 rounded">
                    Home Page Hero
                  </span>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Hero Main Title
                    </label>
                    <input
                      type="text"
                      maxLength={200}
                      value={draftTexts.home_hero_title || ""}
                      onChange={(e) =>
                        setDraftTexts((prev) => ({
                          ...prev,
                          home_hero_title: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Hero Subtitle
                    </label>
                    <textarea
                      rows={3}
                      maxLength={1000}
                      value={draftTexts.home_hero_subtitle || ""}
                      onChange={(e) =>
                        setDraftTexts((prev) => ({
                          ...prev,
                          home_hero_subtitle: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                    />
                  </div>
                </div>

                {/* About US section */}
                <div className="border border-gray-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <span className="text-[10px] font-bold text-veteran-navy uppercase tracking-widest bg-yellow-400/20 px-2 py-0.5 rounded">
                    About Us Page
                  </span>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">Intro Title</label>
                    <input
                      type="text"
                      maxLength={200}
                      value={draftTexts.about_title || ""}
                      onChange={(e) =>
                        setDraftTexts((prev) => ({ ...prev, about_title: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Mission Statement / Description
                    </label>
                    <textarea
                      rows={3}
                      maxLength={2000}
                      value={draftTexts.about_mission || ""}
                      onChange={(e) =>
                        setDraftTexts((prev) => ({ ...prev, about_mission: e.target.value }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                    />
                  </div>
                </div>

                {/* Circular Titles & PDF Upload section */}
                <div className="border border-gray-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <span className="text-[10px] font-bold text-veteran-navy uppercase tracking-widest bg-yellow-400/20 px-2 py-0.5 rounded">
                    Government Circular Headings / Titles & PDFs
                  </span>
                  <p className="text-xs text-gray-500 leading-relaxed">
                    Edit circular subjects, toggle NEW status, or upload PDF files directly from your computer.
                  </p>

                  {draftCirculars.map((c, idx) => {
                    const uploadKey = `circ_${c.id}`;
                    const progress = uploadProgress[uploadKey];
                    return (
                      <div
                        key={c.id}
                        className="p-3 bg-white border border-gray-200 rounded-lg space-y-2.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="uppercase tracking-wider text-[11px] text-veteran-navy font-bold">
                            circular {idx + 1}
                          </span>
                          <div className="flex items-center gap-3">
                            <label className="inline-flex items-center gap-1.5 text-xs text-gray-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={c.isNew}
                                onChange={(e) =>
                                  setDraftCirculars((prev) =>
                                    prev.map((item) =>
                                      item.id === c.id
                                        ? { ...item, isNew: e.target.checked }
                                        : item
                                    )
                                  )
                                }
                                className="rounded border-gray-300"
                              />
                              Mark NEW
                            </label>
                            <button
                              type="button"
                              onClick={async () => {
                                await deleteCircular(c.id);
                                showSuccessToast(`Removed circular ${idx + 1}.`);
                              }}
                              className="text-red-600 hover:bg-red-50 p-1 rounded"
                              title="Delete circular"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        <input
                          type="text"
                          maxLength={300}
                          value={c.title}
                          onChange={(e) =>
                            setDraftCirculars((prev) =>
                              prev.map((item) =>
                                item.id === c.id ? { ...item, title: e.target.value } : item
                              )
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                          placeholder="Circular subject / title"
                        />

                        <div className="flex flex-col sm:flex-row gap-2 items-stretch sm:items-center">
                          <input
                            type="url"
                            maxLength={500}
                            value={c.fileUrl || ""}
                            onChange={(e) =>
                              setDraftCirculars((prev) =>
                                prev.map((item) =>
                                  item.id === c.id
                                    ? { ...item, fileUrl: e.target.value || null }
                                    : item
                                )
                              )
                            }
                            className="flex-1 px-3 py-1.5 border border-gray-200 rounded text-xs focus:ring-1 focus:ring-veteran-navy outline-none bg-slate-50"
                            placeholder="PDF URL or upload from computer →"
                          />

                          <div className="flex items-center gap-2 shrink-0">
                            <label className="cursor-pointer px-3 py-1.5 bg-veteran-olive hover:bg-veteran-olive-dark text-white rounded text-xs font-bold inline-flex items-center gap-1.5 transition-colors">
                              <Upload className="w-3.5 h-3.5" />
                              <span>
                                {progress !== undefined ? `Uploading ${progress}%` : "Upload PDF"}
                              </span>
                              <input
                                type="file"
                                accept="application/pdf,.pdf"
                                className="hidden"
                                disabled={progress !== undefined}
                                onChange={(e) => {
                                  const file = e.target.files?.[0];
                                  e.target.value = "";
                                  if (!file) return;
                                  void runFileUpload(uploadKey, file, "circulars", async (url) => {
                                    setDraftCirculars((prev) =>
                                      prev.map((item) =>
                                        item.id === c.id ? { ...item, fileUrl: url } : item
                                      )
                                    );
                                    await updateCircular(c.id, { fileUrl: url });
                                    showSuccessToast(`PDF uploaded for circular ${idx + 1}!`);
                                  });
                                }}
                              />
                            </label>

                            {c.fileUrl && (
                              <>
                                <a
                                  href={c.fileUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="p-1.5 text-veteran-navy hover:bg-slate-100 rounded border border-gray-200"
                                  title="Open attached PDF"
                                >
                                  <ExternalLink className="w-3.5 h-3.5" />
                                </a>
                                <button
                                  type="button"
                                  onClick={async () => {
                                    setDraftCirculars((prev) =>
                                      prev.map((item) =>
                                        item.id === c.id ? { ...item, fileUrl: null } : item
                                      )
                                    );
                                    await updateCircular(c.id, { fileUrl: null });
                                    showSuccessToast("PDF attachment removed.");
                                  }}
                                  className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded border border-gray-200"
                                  title="Remove PDF link"
                                >
                                  <X className="w-3.5 h-3.5" />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Contact section */}
                <div className="border border-gray-200 rounded-lg p-4 bg-slate-50/50 space-y-4">
                  <span className="text-[10px] font-bold text-veteran-navy uppercase tracking-widest bg-yellow-400/20 px-2 py-0.5 rounded">
                    Official Contact Details
                  </span>

                  <div className="space-y-1">
                    <label className="block text-xs font-bold text-gray-700">
                      Physical Address
                    </label>
                    <input
                      type="text"
                      maxLength={300}
                      value={draftTexts.contact_address || ""}
                      onChange={(e) =>
                        setDraftTexts((prev) => ({
                          ...prev,
                          contact_address: e.target.value,
                        }))
                      }
                      className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">
                        Telephone Line
                      </label>
                      <input
                        type="text"
                        maxLength={50}
                        value={draftTexts.contact_phone || ""}
                        onChange={(e) =>
                          setDraftTexts((prev) => ({
                            ...prev,
                            contact_phone: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-bold text-gray-700">
                        Support Email Address
                      </label>
                      <input
                        type="email"
                        maxLength={150}
                        value={draftTexts.contact_email || ""}
                        onChange={(e) =>
                          setDraftTexts((prev) => ({
                            ...prev,
                            contact_email: e.target.value,
                          }))
                        }
                        className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none bg-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Save button */}
                <div className="flex justify-end pt-2">
                  <button
                    type="button"
                    disabled={savingAll}
                    onClick={handleSaveAllContent}
                    className="px-6 py-2.5 bg-veteran-navy hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded shadow-md transition-all flex items-center gap-1.5"
                  >
                    {savingAll ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" /> Saving to Firestore...
                      </>
                    ) : (
                      "Save & Publish Changes"
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Publish New Circular (Quick Legacy List) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6">
              <h2 className="text-sm font-bold text-veteran-navy uppercase tracking-wider mb-4 pb-2 border-b border-gray-100 flex items-center gap-2">
                <Plus className="w-4 h-4 text-veteran-gold" /> Add Quick Government Circular
              </h2>
              <form onSubmit={handleAddCircular} className="space-y-3">
                <input
                  type="text"
                  required
                  maxLength={300}
                  value={newCircTitle}
                  onChange={(e) => setNewCircTitle(e.target.value)}
                  placeholder="Enter circular subject / title"
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                />
                <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-center">
                  <input
                    type="url"
                    maxLength={500}
                    value={newCircFileUrl}
                    onChange={(e) => setNewCircFileUrl(e.target.value)}
                    placeholder="Optional PDF URL or upload from computer →"
                    className="flex-1 w-full px-3 py-2 border border-gray-300 rounded text-sm focus:ring-1 focus:ring-veteran-navy outline-none"
                  />
                  <label className="cursor-pointer px-4 py-2 bg-veteran-olive hover:bg-veteran-olive-dark text-white rounded text-xs font-bold inline-flex items-center justify-center gap-1.5 shrink-0 transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>
                      {uploadProgress.new_circular !== undefined
                        ? `Uploading ${uploadProgress.new_circular}%`
                        : "Upload PDF"}
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      disabled={uploadProgress.new_circular !== undefined}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = "";
                        if (!file) return;
                        void runFileUpload("new_circular", file, "circulars", (url) => {
                          setNewCircFileUrl(url);
                          showSuccessToast("PDF uploaded! Click Publish Circular to save.");
                        });
                      }}
                    />
                  </label>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-700 whitespace-nowrap cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newCircIsNew}
                      onChange={(e) => setNewCircIsNew(e.target.checked)}
                      className="rounded border-gray-300"
                    />
                    Show in Ticker (NEW)
                  </label>

                  <button
                    type="submit"
                    disabled={addingCirc || uploadProgress.new_circular !== undefined}
                    className="px-5 py-2 bg-veteran-navy hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition-all"
                  >
                    {addingCirc ? "Publishing..." : "Publish Circular"}
                  </button>
                </div>
              </form>
            </div>

            {/* News & Updates Manager (Legacy Quick List) */}
            <div className="bg-white rounded-xl shadow-xs border border-gray-200 p-6 space-y-5">
              <h2 className="text-sm font-bold text-veteran-navy uppercase tracking-wider pb-2 border-b border-gray-100 flex items-center gap-2">
                <Newspaper className="w-4 h-4 text-veteran-gold" /> Quick News & Updates Manager
              </h2>

              <form
                onSubmit={handleAddNews}
                className="space-y-3 bg-slate-50/70 p-4 rounded-lg border border-gray-200"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <input
                    type="text"
                    required
                    maxLength={250}
                    value={newNewsTitle}
                    onChange={(e) => setNewNewsTitle(e.target.value)}
                    placeholder="News headline"
                    className="sm:col-span-2 px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-veteran-navy outline-none"
                  />
                  <input
                    type="text"
                    required
                    maxLength={100}
                    value={newNewsAuthor}
                    onChange={(e) => setNewNewsAuthor(e.target.value)}
                    placeholder="Author name"
                    className="px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-veteran-navy outline-none"
                  />
                </div>
                <textarea
                  rows={3}
                  required
                  maxLength={10000}
                  value={newNewsContent}
                  onChange={(e) => setNewNewsContent(e.target.value)}
                  placeholder="Write news article body..."
                  className="w-full px-3 py-2 border border-gray-300 rounded text-sm bg-white focus:ring-1 focus:ring-veteran-navy outline-none"
                />

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3">
                    <label className="cursor-pointer px-4 py-2 bg-white hover:bg-gray-100 text-veteran-navy border border-gray-300 rounded text-xs font-bold inline-flex items-center gap-1.5 transition-colors shadow-2xs">
                      <ImageIcon className="w-4 h-4 text-veteran-olive" />
                      <span>
                        {uploadProgress.new_news !== undefined
                          ? `Uploading Photo ${uploadProgress.new_news}%`
                          : newNewsImageUrl
                          ? "Replace Photo"
                          : "Upload Photo from Computer"}
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        disabled={uploadProgress.new_news !== undefined}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          e.target.value = "";
                          if (!file) return;
                          void runFileUpload("new_news", file, "news", (url) => {
                            setNewNewsImageUrl(url);
                            showSuccessToast("Photo uploaded! Click Publish News Article to save.");
                          });
                        }}
                      />
                    </label>

                    {newNewsImageUrl && (
                      <div className="flex items-center gap-2">
                        <img
                          src={newNewsImageUrl}
                          alt="News preview"
                          referrerPolicy="no-referrer"
                          className="w-10 h-10 object-cover rounded border border-gray-300"
                        />
                        <button
                          type="button"
                          onClick={() => setNewNewsImageUrl("")}
                          className="text-xs text-red-600 hover:underline font-medium"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={addingNews || uploadProgress.new_news !== undefined}
                    className="px-5 py-2 bg-veteran-navy hover:bg-slate-800 disabled:opacity-60 text-white font-bold text-xs uppercase tracking-wider rounded shadow transition-all"
                  >
                    {addingNews ? "Publishing..." : "Publish News Article"}
                  </button>
                </div>
              </form>

              <div className="space-y-2.5">
                {news.map((item) => {
                  const uploadKey = `news_${item.id}`;
                  const progress = uploadProgress[uploadKey];
                  return (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 p-3 bg-white border border-gray-200 rounded-lg"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-12 h-12 rounded object-cover border border-gray-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-12 rounded bg-slate-100 border border-gray-200 flex items-center justify-center text-gray-400 shrink-0">
                            <ImageIcon className="w-5 h-5" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <h4 className="text-sm font-bold text-gray-900 truncate">{item.title}</h4>
                          <p className="text-xs text-gray-500 line-clamp-1 mt-0.5">
                            {item.content}
                          </p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <label className="cursor-pointer px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-veteran-navy rounded text-[11px] font-bold inline-flex items-center gap-1 transition-colors">
                          <Upload className="w-3 h-3" />
                          <span>
                            {progress !== undefined
                              ? `${progress}%`
                              : item.imageUrl
                              ? "Change Photo"
                              : "Add Photo"}
                          </span>
                          <input
                            type="file"
                            accept="image/*"
                            className="hidden"
                            disabled={progress !== undefined}
                            onChange={(e) => {
                              const file = e.target.files?.[0];
                              e.target.value = "";
                              if (!file) return;
                              void runFileUpload(uploadKey, file, "news", async (url) => {
                                await updateNewsArticle(item.id, { imageUrl: url });
                                showSuccessToast("Article photo updated in Firestore!");
                              });
                            }}
                          />
                        </label>

                        <button
                          type="button"
                          onClick={async () => {
                            await deleteNewsArticle(item.id);
                            showSuccessToast("News article deleted.");
                          }}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded"
                          title="Delete news article"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
