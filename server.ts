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

  // POST /api/send-whatsapp - Sends whatsapp message using Fonnte securely from server
  app.post("/api/send-whatsapp", async (req, res) => {
    const { target, message, token: clientToken } = req.body;

    if (!target || !message) {
      return res.status(400).json({ error: "Target (nomor WhatsApp atau ID grup) dan pesan harus diisi." });
    }

    // Determine if the target is a group ID or group name
    const isGroup = target.includes('@') || isNaN(Number(target.trim()));
    let formattedTarget = target;

    if (!isGroup) {
      // Basic validation of target number
      const cleanTarget = target.replace(/[^0-9]/g, '');
      if (!cleanTarget.startsWith('62') && !cleanTarget.startsWith('08') && !cleanTarget.startsWith('8')) {
        return res.status(400).json({ error: "Nomor WhatsApp harus berformat standar Indonesia (dimulai dari 62, 08, atau 8)." });
      }

      // Standardize to 62...
      formattedTarget = cleanTarget;
      if (formattedTarget.startsWith('08')) {
        formattedTarget = '628' + formattedTarget.slice(2);
      } else if (formattedTarget.startsWith('8')) {
        formattedTarget = '628' + formattedTarget.slice(1);
      }
    }

    // Load token (priority: env var > body parameter > Firestore settings)
    let tokenToUse = process.env.FONNTE_TOKEN || clientToken;
    if (!tokenToUse) {
      try {
        const whatsappSettingsDoc = await db.collection('settings').doc('whatsapp').get();
        if (whatsappSettingsDoc.exists) {
          tokenToUse = whatsappSettingsDoc.data()?.token;
        }
      } catch (dbErr) {
        console.warn("Backend fell back to Firestore settings query but encountered error:", dbErr);
      }
    }

    if (!tokenToUse) {
      return res.status(400).json({ error: "Token Fonnte tidak terkonfigurasi. Silakan atur token di menu Pengaturan WhatsApp." });
    }

    try {
      const params = new URLSearchParams();
      params.append('target', formattedTarget);
      params.append('message', message);
      
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          "Authorization": tokenToUse
        },
        body: params
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(502).json({ error: "Format respon Fonnte tidak valid (bukan JSON): " + text.slice(0, 100) });
      }

      if (data.status === true) {
        res.json({ success: true, message: "Pesan berhasil dikirim via WhatsApp Gateway!", data });
      } else {
        res.status(data.reason ? 400 : 502).json({ 
          error: data.reason || "Fonnte WhatsApp Gateway gagal mengirim pesan.", 
          data 
        });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Gagal menghubungi API WhatsApp Fonnte." });
    }
  });

  // POST /api/whatsapp-groups - Fetches WhatsApp groups from Fonnte
  app.post("/api/whatsapp-groups", async (req, res) => {
    const { token: clientToken } = req.body;
    
    let tokenToUse = process.env.FONNTE_TOKEN || clientToken;
    if (!tokenToUse) {
      try {
        const whatsappSettingsDoc = await db.collection('settings').doc('whatsapp').get();
        if (whatsappSettingsDoc.exists) {
          tokenToUse = whatsappSettingsDoc.data()?.token;
        }
      } catch (dbErr) {
        console.warn("Backend fell back to settings lookup in whatsapp-groups:", dbErr);
      }
    }

    if (!tokenToUse) {
      return res.json({ success: false, error: "Token Fonnte tidak terkonfigurasi." });
    }

    try {
      const response = await fetch("https://api.fonnte.com/get-whatsapp-group", {
        method: "POST",
        headers: {
          "Authorization": tokenToUse
        }
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(502).json({ error: "Respon Fonnte bukan JSON ketika mengambil grup: " + text.slice(0, 100) });
      }

      if (data.status === true || Array.isArray(data.data) || (data.detail && data.detail.includes("finished"))) {
        // Return lists of groups
        res.json({ success: true, groups: data.data || [] });
      } else {
        res.status(400).json({ error: data.reason || data.detail || "Fonnte gagal mengambil daftar grup." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Gagal menghubungi API Fonnte." });
    }
  });

  // POST /api/whatsapp-groups-sync - Triggers sync of groups in Fonnte
  app.post("/api/whatsapp-groups-sync", async (req, res) => {
    const { token: clientToken } = req.body;
    
    let tokenToUse = process.env.FONNTE_TOKEN || clientToken;
    if (!tokenToUse) {
      try {
        const whatsappSettingsDoc = await db.collection('settings').doc('whatsapp').get();
        if (whatsappSettingsDoc.exists) {
          tokenToUse = whatsappSettingsDoc.data()?.token;
        }
      } catch (dbErr) {
        console.warn("Backend fell back to settings lookup in whatsapp-groups-sync:", dbErr);
      }
    }

    if (!tokenToUse) {
      return res.json({ success: false, error: "Token Fonnte tidak terkonfigurasi." });
    }

    try {
      const response = await fetch("https://api.fonnte.com/fetch-group", {
        method: "POST",
        headers: {
          "Authorization": tokenToUse
        }
      });

      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.status(502).json({ error: "Respon Fonnte bukan JSON ketika sinkronisasi grup: " + text.slice(0, 100) });
      }

      if (data.status === true || (data.detail && data.detail.includes("finished"))) {
        res.json({ success: true, message: data.detail || "Sinkronisasi daftar grup selesai!" });
      } else {
        res.status(400).json({ error: data.detail || data.reason || "Fonnte gagal menyinkronkan daftar grup." });
      }
    } catch (err: any) {
      res.status(500).json({ error: err.message || "Gagal menghubungi API Fonnte." });
    }
  });

  // POST /api/whatsapp-status - Checks WhatsApp connection status on Fonnte device securely
  app.post("/api/whatsapp-status", async (req, res) => {
    const { token: clientToken } = req.body;
    
    // Load token
    let tokenToUse = process.env.FONNTE_TOKEN || clientToken;
    if (!tokenToUse) {
      try {
        const whatsappSettingsDoc = await db.collection('settings').doc('whatsapp').get();
        if (whatsappSettingsDoc.exists) {
          tokenToUse = whatsappSettingsDoc.data()?.token;
        }
      } catch (dbErr) {
        console.warn("Backend fell back to settings lookup inside whatsapp-status: ", dbErr);
      }
    }

    if (!tokenToUse) {
      return res.json({ connected: false, message: "Token Fonnte tidak terkonfigurasi." });
    }

    try {
      const response = await fetch("https://api.fonnte.com/device", {
        method: "POST",
        headers: {
          "Authorization": tokenToUse
        }
      });
      
      const text = await response.text();
      let data;
      try {
        data = JSON.parse(text);
      } catch (e) {
        return res.json({ connected: false, message: "Respon Fonnte bukan JSON: " + text.slice(0, 100) });
      }

      if (data.status === true || data.device_status === 'CONNECT' || data.device_status === 'CONNECTED' || data.device_status === 'authenticated') {
        res.json({ connected: true, device_status: data.device_status || "CONNECTED", data });
      } else {
        res.json({ connected: false, device_status: data.device_status || "DISCONNECTED", message: data.reason || "Koneksi device terputus/tidak aktif.", data });
      }
    } catch (err: any) {
      res.json({ connected: false, message: err.message || "Gagal menghubungi server Fonnte." });
    }
  });

  app.get("/api/template-pendirian", (req, res) => {
    const filePath = path.join(process.cwd(), "public", "template_pendirian.docx");
    res.sendFile(filePath, (err) => {
      if (err) {
        console.error("Failed to send template:", err);
        if (!res.headersSent) {
          res.status(500).send("Template master tidak ditemukan di server");
        }
      }
    });
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
