import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore, doc, getDocFromServer } from "firebase/firestore";
import {
  getStorage,
  ref,
  uploadBytesResumable,
  getDownloadURL,
} from "firebase/storage";
import firebaseConfig from "../../firebase-applet-config.json";

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);
export const auth = getAuth(app);
export const storage = getStorage(app);
export const FIREBASE_PROJECT_ID = firebaseConfig.projectId;
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: "select_account",
});

export const BOOTSTRAPPED_ADMIN_EMAIL = "faujitimes@gmail.com";

export enum OperationType {
  CREATE = "create",
  UPDATE = "update",
  DELETE = "delete",
  LIST = "list",
  GET = "get",
  WRITE = "write",
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error("Firestore Error: ", JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

export type UploadFolder = "circulars" | "documents" | "news" | "images" | "pdfs";

export async function uploadPortalFile(
  file: File,
  folder: UploadFolder,
  onProgress?: (percent: number) => void
): Promise<string> {
  const isPdfFolder =
    folder === "circulars" || folder === "documents" || folder === "pdfs";

  if (isPdfFolder) {
    const isPdf =
      file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      throw new Error("Please select a valid PDF file (.pdf).");
    }
    if (file.size > 15 * 1024 * 1024) {
      throw new Error("PDF file size must be 15 MB or smaller.");
    }
  } else {
    if (!file.type.startsWith("image/")) {
      throw new Error("Please select a valid image file (JPG, PNG, WebP).");
    }
    if (file.size > 5 * 1024 * 1024) {
      throw new Error("Image file size must be 5 MB or smaller.");
    }
  }

  // Keep storage filename short & safe so download URL stays well under 500 chars
  const extMatch = file.name.match(/\.[a-zA-Z0-9]+$/);
  const ext = extMatch ? extMatch[0].toLowerCase().slice(0, 10) : isPdfFolder ? ".pdf" : ".jpg";
  const baseName = file.name
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9_-]/g, "_")
    .slice(0, 32) || "file";
  const storagePath = `${folder}/${Date.now()}_${baseName}${ext}`;

  const storageRef = ref(storage, storagePath);
  const contentType = isPdfFolder ? "application/pdf" : file.type || "image/jpeg";

  return new Promise<string>((resolve, reject) => {
    const task = uploadBytesResumable(storageRef, file, { contentType });
    task.on(
      "state_changed",
      (snapshot) => {
        if (onProgress && snapshot.totalBytes > 0) {
          onProgress(Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100));
        }
      },
      (error) => {
        const code = (error as { code?: string }).code || "";
        if (code === "storage/unauthorized") {
          reject(
            new Error(
              `Firebase Storage permission denied. Please enable Firebase Storage and update Storage Rules in the Firebase Console (project: ${FIREBASE_PROJECT_ID}).`
            )
          );
        } else if (code === "storage/bucket-not-found" || code === "storage/project-not-found") {
          reject(
            new Error(
              `Firebase Storage is not initialized yet for project ${FIREBASE_PROJECT_ID}. Please click "Get Started" under Storage in the Firebase Console.`
            )
          );
        } else {
          reject(new Error(error.message || "File upload failed."));
        }
      },
      async () => {
        try {
          const url = await getDownloadURL(task.snapshot.ref);
          resolve(url);
        } catch (err) {
          reject(err instanceof Error ? err : new Error("Failed to get uploaded file URL."));
        }
      }
    );
  });
}

async function testConnection() {
  try {
    await getDocFromServer(doc(db, "test", "connection"));
  } catch (error) {
    if (error instanceof Error && error.message.includes("the client is offline")) {
      console.error("Please check your Firebase configuration.");
    }
  }
}

testConnection();
