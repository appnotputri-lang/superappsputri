import express from "express";
import path from "path";
import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import firebaseConfig from "./firebase-applet-config.json";

// Initialize Firebase Admin with our custom configuration
const adminApp = admin.initializeApp({
  projectId: firebaseConfig.projectId,
});
const db = getFirestore(adminApp, firebaseConfig.firestoreDatabaseId);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  app.get("/api/template-pendirian", (req, res) => {
    res.sendFile(path.join(process.cwd(), "DRAFT PENDIRIAN PT.docx"));
  });

  app.get("/api/search-by-nik", async (req, res) => {
    const { nik } = req.query;
    if (!nik || typeof nik !== 'string') {
      return res.status(400).json({ error: "NIK is required" });
    }

    try {
      const collections = ['profiles', 'projects', 'rupst_projects', 'pendirian_projects'];
      let foundData = null;

      for (const col of collections) {
        const snapshot = await db.collection(col).get();
        for (const doc of snapshot.docs) {
          const data = doc.data();
          if (data.shareholders && Array.isArray(data.shareholders)) {
            const shareholder = data.shareholders.find((s: any) => s.nik === nik);
            if (shareholder) {
              foundData = shareholder;
              break;
            }
          }
        }
        if (foundData) break;
      }

      if (foundData) {
        res.json(foundData);
      } else {
        res.status(404).json({ error: "Shareholder not found" });
      }
    } catch (error) {
      console.warn("Backend Firebase Admin insufficient permissions. Client should query via client-side SDK. Error:", error);
      res.status(503).json({ error: "Server-side database search currently unavailable." });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const { createServer } = await import("vite");
    const vite = await createServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
