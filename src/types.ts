export interface Circular {
  id: string;
  title: string;
  date: string;
  category: "circular" | "order" | "notification" | string;
  fileUrl: string | null;
  isNew: boolean;
  isPublished?: boolean;
  sortOrder?: number;
  authorId?: string;
}

export interface NewsArticle {
  id: string;
  title: string;
  content: string;
  date: string;
  author: string;
  imageUrl?: string | null;
  isPublished?: boolean;
  authorId?: string;
}

export interface WelfareScheme {
  id: string;
  title: string;
  description: string;
  eligibility: string;
  link?: string;
}

export interface AdminUserRecord {
  uid: string;
  email: string;
  displayName: string;
  role: "admin";
  addedBy: string;
}

export type ContentType =
  | "article"
  | "circular"
  | "order"
  | "scheme"
  | "news"
  | "employment";

export type ContentStatus = "draft" | "published";

export interface PdfAttachment {
  name: string;
  url: string;
}

export interface PortalCategory {
  id: string;
  name: string;
  slug: string;
  description: string;
  subcategories: string[];
  sortOrder: number;
  isActive: boolean;
  authorId?: string;
}

export interface PortalContentItem {
  id: string;
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
  publicationYear: number;
  shortDescription: string;
  fullContent: string;
  featuredImageUrl: string | null;
  pdfAttachments: PdfAttachment[];
  officialSourceUrl: string | null;
  status: ContentStatus;
  isFeatured: boolean;
  isImportantDoc: boolean;
  authorId?: string;
}
