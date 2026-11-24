import "dotenv/config";
import express, { Request, Response, NextFunction } from "express";
import path from "path";
import fs from "fs";
import multer from "multer";
import cors from "cors";
import { initializeApp, getApps, getApp } from "firebase-admin/app";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

interface FirebaseAppletConfig {
  projectId: string;
  firestoreDatabaseId?: string;
  storageBucket?: string;
}

interface AuthenticatedAdminRequest extends Request {
  adminUser?: {
    uid: string;
    email: string;
    idToken: string;
  };
}

interface FirestoreFieldValue {
  stringValue?: string;
  booleanValue?: boolean;
  integerValue?: string;
  nullValue?: null;
  timestampValue?: string;
}

interface FirestoreRestDocument {
  name?: string;
  fields?: Record<string, FirestoreFieldValue>;
}

const SUPER_ADMIN_EMAIL = "faujitimes@gmail.com";
const MAX_PDF_SIZE_BYTES = 15 * 1024 * 1024;
const VALID_DOC_ID_RE = /^[a-zA-Z0-9_-]{1,128}$/;

function loadFirebaseConfig(): FirebaseAppletConfig {
  const configPath = path.join(process.cwd(), "firebase-applet-config.json");
  if (!fs.existsSync(configPath)) {
    throw new Error("Missing firebase-applet-config.json in workspace root.");
  }
  const parsed = JSON.parse(fs.readFileSync(configPath, "utf8")) as FirebaseAppletConfig;
  if (!parsed.projectId || parsed.projectId === "remixed-project-id") {
    throw new Error("Firebase projectId is not configured in firebase-applet-config.json.");
  }
  return parsed;
}

const firebaseConfig = loadFirebaseConfig();
const firestoreDatabaseId = firebaseConfig.firestoreDatabaseId || "(default)";
const firestoreBaseUrl = `https://firestore.googleapis.com/v1/projects/${encodeURIComponent(
  firebaseConfig.projectId
)}/databases/${encodeURIComponent(firestoreDatabaseId)}/documents`;

const adminApp = getApps().length
  ? getApp()
  : initializeApp({ projectId: firebaseConfig.projectId });
const adminAuth = getAuth(adminApp);

function isValidHttpUrl(raw: unknown): raw is string {
  if (typeof raw !== "string") return false;
  const trimmed = raw.trim();
  if (!trimmed || trimmed.length > 500) return false;
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === "https:" || parsed.protocol === "http:";
  } catch {
    return false;
  }
}

function sanitizeCircularCategory(raw: unknown): "circular" | "order" | "notification" {
  if (raw === "order" || raw === "notification") return raw;
  return "circular";
}

function readStringField(
  fields: Record<string, FirestoreFieldValue> | undefined,
  key: string,
  fallback = ""
): string {
  const val = fields?.[key]?.stringValue;
  return typeof val === "string" ? val : fallback;
}

function readBoolField(
  fields: Record<string, FirestoreFieldValue> | undefined,
  key: string,
  fallback = false
): boolean {
  const val = fields?.[key]?.booleanValue;
  return typeof val === "boolean" ? val : fallback;
}

function readIntField(
  fields: Record<string, FirestoreFieldValue> | undefined,
  key: string,
  fallback = 0
): number {
  const val = fields?.[key]?.integerValue;
  if (typeof val === "string") {
    const num = Number(val);
    return Number.isFinite(num) ? num : fallback;
  }
  return fallback;
}

function extractDocId(resourceName?: string): string {
  if (!resourceName) return "";
  const parts = resourceName.split("/");
  return parts[parts.length - 1] || "";
}

async function runFirestorePublishedQuery(
  collectionId: string,
  publishedField: string
): Promise<FirestoreRestDocument[]> {
  const response = await fetch(`${firestoreBaseUrl}:runQuery`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      structuredQuery: {
        from: [{ collectionId }],
        where: {
          fieldFilter: {
            field: { fieldPath: publishedField },
            op: "EQUAL",
            value:
              publishedField === "status"
                ? { stringValue: "published" }
                : { booleanValue: true },
          },
        },
      },
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Firestore query failed (${response.status}): ${text}`);
  }

  const rows = (await response.json()) as Array<{ document?: FirestoreRestDocument }>;
  return rows.map((row) => row.document).filter((doc): doc is FirestoreRestDocument => Boolean(doc));
}

async function isDelegatedAdmin(uid: string, idToken: string): Promise<boolean> {
  if (!VALID_DOC_ID_RE.test(uid)) return false;
  const res = await fetch(`${firestoreBaseUrl}/admins/${encodeURIComponent(uid)}`, {
    headers: { Authorization: `Bearer ${idToken}` },
  });
  return res.ok;
}

async function requireAdminAuth(
  req: AuthenticatedAdminRequest,
  res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const authHeader = req.headers.authorization || "";
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) {
      res.status(401).json({ error: "Missing Authorization Bearer token." });
      return;
    }

    const idToken = match[1].trim();
    const decoded: DecodedIdToken = await adminAuth.verifyIdToken(idToken);
    if (!decoded.email_verified || !decoded.email) {
      res.status(403).json({ error: "Verified email account required." });
      return;
    }

    const emailLower = decoded.email.toLowerCase();
    const isSuper = emailLower === SUPER_ADMIN_EMAIL;
    const isDelegated = isSuper ? false : await isDelegatedAdmin(decoded.uid, idToken);

    if (!isSuper && !isDelegated) {
      res.status(403).json({ error: "Administrator privileges required." });
      return;
    }

    req.adminUser = {
      uid: decoded.uid,
      email: decoded.email,
      idToken,
    };
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired Firebase authentication token." });
  }
}

async function uploadPdfToFirebaseStorage(
  file: Express.Multer.File,
  idToken: string
): Promise<string> {
  const bucket = firebaseConfig.storageBucket;
  if (!bucket) {
    throw new Error("Firebase Storage bucket is not configured.");
  }

  // Validate PDF magic header bytes (%PDF-)
  if (file.buffer.length < 5 || file.buffer.subarray(0, 5).toString("ascii") !== "%PDF-") {
    throw new Error("Uploaded file does not have a valid PDF signature.");
  }

  const baseName =
    file.originalname
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "_")
      .slice(0, 32) || "circular";
  const storagePath = `circulars/${Date.now()}_${baseName}.pdf`;

  const uploadUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
    bucket
  )}/o?uploadType=media&name=${encodeURIComponent(storagePath)}`;

  const res = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      Authorization: `Firebase ${idToken}`,
      "Content-Type": "application/pdf",
    },
    body: new Uint8Array(file.buffer),
  });

  if (!res.ok) {
    const errBody = await res.text();
    if (res.status === 404 || res.status === 403) {
      throw new Error(
        "Firebase Cloud Storage is not enabled or Storage Rules are missing for this project. Enable Blaze + Storage in Firebase Console, or pass an external https:// fileUrl."
      );
    }
    throw new Error(`Cloud Storage upload failed (${res.status}): ${errBody}`);
  }

  const meta = (await res.json()) as { name?: string; downloadTokens?: string };
  const token = meta.downloadTokens?.split(",")[0];
  if (!token) {
    throw new Error("Cloud Storage did not return a download token.");
  }

  return `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(
    bucket
  )}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`;
}

async function createFirestoreDocWithServerTimestamps(
  collectionId: string,
  docId: string,
  fields: Record<string, FirestoreFieldValue>,
  idToken: string
): Promise<void> {
  const documentName = `projects/${firebaseConfig.projectId}/databases/${firestoreDatabaseId}/documents/${collectionId}/${docId}`;
  const res = await fetch(`${firestoreBaseUrl}:commit`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${idToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      writes: [
        {
          update: {
            name: documentName,
            fields,
          },
          currentDocument: { exists: false },
          updateTransforms: [
            { fieldPath: "createdAt", setToServerValue: "REQUEST_TIME" },
            { fieldPath: "updatedAt", setToServerValue: "REQUEST_TIME" },
          ],
        },
      ],
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Firestore write rejected (${res.status}): ${errText}`);
  }
}

function buildAllowedOrigins(): Set<string> {
  const origins = new Set<string>([
    "https://faujitimes.com",
    "https://www.faujitimes.com",
  ]);

  const envOrigins = [
    process.env.APP_URL,
    process.env.RENDER_EXTERNAL_URL,
    ...(process.env.ALLOWED_ORIGINS ? process.env.ALLOWED_ORIGINS.split(",") : []),
  ];

  for (const raw of envOrigins) {
    if (!raw) continue;
    const trimmed = raw.trim().replace(/\/+$/, "");
    if (trimmed) origins.add(trimmed);
  }

  if (process.env.NODE_ENV !== "production") {
    origins.add("http://localhost:3000");
    origins.add("http://127.0.0.1:3000");
  }

  return origins;
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProduction = process.env.NODE_ENV === "production";
  const allowedOrigins = buildAllowedOrigins();

  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use((_req: Request, res: Response, next: NextFunction) => {
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
    next();
  });

  app.use("/api", (req: Request, res: Response, next: NextFunction) => {
    const forwardedHost = (req.get("x-forwarded-host") || req.get("host") || "").split(",")[0].trim();
    const forwardedProto = (req.get("x-forwarded-proto") || req.protocol || "https").split(",")[0].trim();
    const sameOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : "";

    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        const normalized = origin.replace(/\/+$/, "");
        if (allowedOrigins.has(normalized) || (sameOrigin && normalized === sameOrigin)) {
          callback(null, true);
          return;
        }
        callback(null, false);
      },
      methods: ["GET", "POST", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    })(req, res, next);
  });

  app.use(express.json({ limit: "1mb" }));

  // In-memory multer validation for PDF uploads (never writes to ephemeral disk)
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: {
      fileSize: MAX_PDF_SIZE_BYTES,
      files: 1,
    },
    fileFilter(_req, file, cb) {
      const isPdfMime = file.mimetype === "application/pdf";
      const isPdfExt = file.originalname.toLowerCase().endsWith(".pdf");
      if (!isPdfMime && !isPdfExt) {
        cb(new Error("Only PDF documents (.pdf) are allowed."));
        return;
      }
      cb(null, true);
    },
  });

  // Render health check endpoint
  app.get("/api/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  // Public persistent circulars list backed by Firestore
  app.get("/api/circulars", async (_req: Request, res: Response) => {
    try {
      const docs = await runFirestorePublishedQuery("circulars", "isPublished");
      const circulars = docs
        .map((doc) => ({
          id: extractDocId(doc.name),
          title: readStringField(doc.fields, "title"),
          date: readStringField(doc.fields, "date"),
          category: sanitizeCircularCategory(readStringField(doc.fields, "category")),
          fileUrl: doc.fields?.fileUrl?.stringValue ?? null,
          isNew: readBoolField(doc.fields, "isNew", false),
          sortOrder: readIntField(doc.fields, "sortOrder", 0),
        }))
        .sort((a, b) => a.sortOrder - b.sortOrder);

      res.json(circulars);
    } catch (error) {
      console.error("GET /api/circulars error:", error);
      res.status(502).json({ error: "Unable to load circulars from Firestore." });
    }
  });

  // Protected admin circular creation + optional Firebase Cloud Storage PDF upload
  app.post(
    "/api/circulars",
    requireAdminAuth,
    upload.single("document"),
    async (req: AuthenticatedAdminRequest, res: Response) => {
      try {
        const admin = req.adminUser!;
        const rawTitle = typeof req.body?.title === "string" ? req.body.title.trim() : "";
        if (!rawTitle || rawTitle.length > 300) {
          res.status(400).json({ error: "Title is required (1-300 characters)." });
          return;
        }

        const category = sanitizeCircularCategory(req.body?.category);
        const isNew =
          req.body?.isNew === false || req.body?.isNew === "false" ? false : true;

        let fileUrl: string | null = null;
        if (req.file) {
          fileUrl = await uploadPdfToFirebaseStorage(req.file, admin.idToken);
        } else if (req.body?.fileUrl !== undefined && req.body?.fileUrl !== null && String(req.body.fileUrl).trim() !== "") {
          if (!isValidHttpUrl(req.body.fileUrl)) {
            res.status(400).json({ error: "fileUrl must be a valid http(s) URL (max 500 chars)." });
            return;
          }
          fileUrl = req.body.fileUrl.trim();
        }

        const docId = `circ_${Date.now()}`;
        const dateIso = new Date().toISOString();

        await createFirestoreDocWithServerTimestamps(
          "circulars",
          docId,
          {
            title: { stringValue: rawTitle },
            date: { stringValue: dateIso },
            category: { stringValue: category },
            fileUrl: fileUrl ? { stringValue: fileUrl } : { nullValue: null },
            isNew: { booleanValue: isNew },
            isPublished: { booleanValue: true },
            sortOrder: { integerValue: "0" },
            authorId: { stringValue: admin.uid },
          },
          admin.idToken
        );

        res.status(201).json({
          id: docId,
          title: rawTitle,
          date: dateIso,
          category,
          fileUrl,
          isNew,
        });
      } catch (error) {
        const message = error instanceof Error ? error.message : "Failed to publish circular.";
        const status = message.includes("Cloud Storage is not enabled") ? 503 : 400;
        res.status(status).json({ error: message });
      }
    }
  );

  // Protected admin circular deletion
  app.delete(
    "/api/circulars/:id",
    requireAdminAuth,
    async (req: AuthenticatedAdminRequest, res: Response) => {
      const id = req.params.id;
      if (!VALID_DOC_ID_RE.test(id)) {
        res.status(400).json({ error: "Invalid circular ID." });
        return;
      }

      const delRes = await fetch(`${firestoreBaseUrl}/circulars/${encodeURIComponent(id)}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${req.adminUser!.idToken}` },
      });

      if (!delRes.ok) {
        res.status(delRes.status).json({ error: "Failed to delete circular." });
        return;
      }

      res.json({ deleted: true, id });
    }
  );

  // Public persistent news list backed by Firestore
  app.get("/api/news", async (_req: Request, res: Response) => {
    try {
      const docs = await runFirestorePublishedQuery("news", "isPublished");
      const articles = docs
        .map((doc) => ({
          id: extractDocId(doc.name),
          title: readStringField(doc.fields, "title"),
          content: readStringField(doc.fields, "content"),
          date: readStringField(doc.fields, "date"),
          author: readStringField(doc.fields, "author", "Admin"),
          imageUrl: doc.fields?.imageUrl?.stringValue ?? null,
        }))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

      res.json(articles);
    } catch (error) {
      console.error("GET /api/news error:", error);
      res.status(502).json({ error: "Unable to load news from Firestore." });
    }
  });

  // Protected admin news publishing backed by Firestore
  app.post("/api/news", requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    try {
      const admin = req.adminUser!;
      const title = typeof req.body?.title === "string" ? req.body.title.trim() : "";
      const content = typeof req.body?.content === "string" ? req.body.content.trim() : "";
      const author =
        typeof req.body?.author === "string" && req.body.author.trim()
          ? req.body.author.trim().slice(0, 100)
          : "Admin";

      if (!title || title.length > 250) {
        res.status(400).json({ error: "Title is required (1-250 characters)." });
        return;
      }
      if (!content || content.length > 10000) {
        res.status(400).json({ error: "Content is required (1-10000 characters)." });
        return;
      }

      let imageUrl: string | null = null;
      if (req.body?.imageUrl !== undefined && req.body?.imageUrl !== null && String(req.body.imageUrl).trim() !== "") {
        if (!isValidHttpUrl(req.body.imageUrl)) {
          res.status(400).json({ error: "imageUrl must be a valid http(s) URL (max 500 chars)." });
          return;
        }
        imageUrl = req.body.imageUrl.trim();
      }

      const docId = `news_${Date.now()}`;
      const dateIso = new Date().toISOString();

      await createFirestoreDocWithServerTimestamps(
        "news",
        docId,
        {
          title: { stringValue: title },
          content: { stringValue: content },
          date: { stringValue: dateIso },
          author: { stringValue: author },
          imageUrl: imageUrl ? { stringValue: imageUrl } : { nullValue: null },
          isPublished: { booleanValue: true },
          authorId: { stringValue: admin.uid },
        },
        admin.idToken
      );

      res.status(201).json({
        id: docId,
        title,
        content,
        author,
        imageUrl,
        date: dateIso,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to publish news article.";
      res.status(400).json({ error: message });
    }
  });

  // Protected admin news deletion
  app.delete("/api/news/:id", requireAdminAuth, async (req: AuthenticatedAdminRequest, res: Response) => {
    const id = req.params.id;
    if (!VALID_DOC_ID_RE.test(id)) {
      res.status(400).json({ error: "Invalid news article ID." });
      return;
    }

    const delRes = await fetch(`${firestoreBaseUrl}/news/${encodeURIComponent(id)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${req.adminUser!.idToken}` },
    });

    if (!delRes.ok) {
      res.status(delRes.status).json({ error: "Failed to delete news article." });
      return;
    }

    res.json({ deleted: true, id });
  });

  // Multer & API error handler
  app.use((err: unknown, req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      const msg = err instanceof Error ? err.message : "Request failed.";
      res.status(400).json({ error: msg });
      return;
    }
    next(err);
  });

  // Return JSON 404 for unknown API endpoints
  app.use("/api", (_req: Request, res: Response) => {
    res.status(404).json({ error: "API route not found." });
  });

  if (!isProduction) {
    const { createServer: createViteServer } = await import("vite");
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(
      express.static(distPath, {
        index: false,
        maxAge: "7d",
        setHeaders(res, filePath) {
          if (filePath.endsWith(".html")) {
            res.setHeader("Cache-Control", "no-cache");
          }
        },
      })
    );
    app.get("*", (_req: Request, res: Response) => {
      res.setHeader("Cache-Control", "no-cache");
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Faujitimes server listening on port ${PORT} (${isProduction ? "production" : "development"})`);
  });
}

startServer();
