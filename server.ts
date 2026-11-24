import express from "express";
import path from "path";
import multer from "multer";
import cors from "cors";
import fs from "fs";
import { createServer as createViteServer } from "vite";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(cors());
  app.use(express.json());

  // Setup uploads directory
  const uploadsDir = path.join(process.cwd(), "uploads");
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  // Serve uploads statically
  app.use("/uploads", express.static(uploadsDir));

  // Multer setup for document uploading
  const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadsDir),
    filename: (req, file, cb) => {
      // Create a unique friendly filename
      const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1E9);
      const ext = path.extname(file.originalname);
      cb(null, `doc-${uniqueSuffix}${ext}`);
    },
  });
  const upload = multer({ storage });

  // --- In-Memory Database for prototyping ---
  // In a real production app, this would be SQLite, PostgreSQL, or Firestore.
  let circulars = [
    { 
      id: "1", 
      title: "Revision of Pension for Pre-2006 Pensioners", 
      date: new Date().toISOString(), 
      category: "circular", 
      fileUrl: null, 
      isNew: true 
    },
    { 
      id: "2", 
      title: "ECHS Smart Card Renewal Process Mandate", 
      date: new Date(Date.now() - 86400000).toISOString(), 
      category: "order", 
      fileUrl: null, 
      isNew: true 
    },
    { 
      id: "3", 
      title: "SPARSH Data Verification Guidelines", 
      date: new Date(Date.now() - 172800000 * 2).toISOString(), 
      category: "notification", 
      fileUrl: null, 
      isNew: false 
    },
  ];

  let news = [
    { 
      id: "1", 
      title: "Veterans Day Rally 2026 Scheduled in New Delhi", 
      date: new Date().toISOString(), 
      content: "The annual Veterans Day Rally will be held at main cantonment areas next month. High turnouts are expected. Strict COVID protocols might be updated nearer to date. Special provision for very senior veterans stands arranged.", 
      author: "Admin" 
    },
    { 
      id: "2", 
      title: "Update on CSD Canteen Import Quotas", 
      date: new Date(Date.now() - 172800000).toISOString(), 
      content: "Fresh directives regarding the quota of standard consumer electronic goods availability from CSD Depots across eastern commands have been issued.", 
      author: "Admin" 
    }
  ];

  // API Routes
  app.get("/api/circulars", (req, res) => res.json(circulars));
  
  app.post("/api/circulars", upload.single("document"), (req, res) => {
    const { title, category } = req.body;
    const newCircular = {
      id: Date.now().toString(),
      title,
      category: category || "circular",
      date: new Date().toISOString(),
      fileUrl: req.file ? `/uploads/${req.file.filename}` : null,
      isNew: true
    };
    circulars = [newCircular, ...circulars];
    res.status(201).json(newCircular);
  });

  app.get("/api/news", (req, res) => res.json(news));
  
  app.post("/api/news", (req, res) => {
    const { title, content, author } = req.body;
    const newArticle = {
      id: Date.now().toString(),
      title,
      content,
      author: author || "Admin",
      date: new Date().toISOString()
    };
    news = [newArticle, ...news];
    res.status(201).json(newArticle);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // Always use * for single-page applications depending on the react-router
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
