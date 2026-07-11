import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { firestoreRest } from "./src/lib/firestore-rest";
import { DriveFolderService } from "./src/services/DriveFolderService";
import { driveRest } from "./src/lib/drive-rest";
import { authMiddleware } from "./src/middlewares/auth";
import { ProjectController } from "./src/controllers/ProjectController";
import { DriveController } from "./src/controllers/DriveController";
import { DocumentController } from "./src/controllers/DocumentController";

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("Server starting in REST mode (Cloudflare compatible architecture)...");

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "REST" });
  });

  app.post("/api/v2/drive/ensure-client-folder", authMiddleware, async (req, res) => {
    try {
      const { clientId, companyName } = req.body;
      if (!clientId || !companyName) {
        return res.status(400).json({ error: "Missing clientId or companyName" });
      }

      console.log(`[Drive API] Ensuring client folder for: ${companyName}`);
      const companyFolder = await DriveFolderService.ensureCompanyFolder(companyName);
      
      // Save driveFolderId and driveFolderUrl into the client document
      await firestoreRest.updateDocument('profiles', clientId, {
        driveFolderId: companyFolder.folderId,
        driveFolderUrl: companyFolder.folderUrl
      });

      res.json({ success: true, folderId: companyFolder.folderId, folderUrl: companyFolder.folderUrl });
    } catch (error: any) {
      console.error("[Drive API] Error ensuring client folder:", error);
      res.status(500).json({ error: error.message || "Failed to ensure client folder" });
    }
  });

  app.post("/api/v2/drive/ensure-project-folder", authMiddleware, async (req, res) => {
    try {
      const { project } = req.body;
      if (!project || !project.id || !project.clientId) {
        return res.status(400).json({ error: "Missing valid project object" });
      }

      console.log(`[Drive API] Ensuring project folder for project ID: ${project.id}`);
      await DriveFolderService.handleNewProject(project);

      res.json({ success: true, message: "Project folder ensured successfully" });
    } catch (error: any) {
      console.error("[Drive API] Error ensuring project folder:", error);
      res.status(500).json({ error: error.message || "Failed to ensure project folder" });
    }
  });

  app.post("/api/sync-drive-clients", authMiddleware, async (req, res) => {
    try {
      const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
      if (!rootFolderId) {
        return res.status(500).json({ error: "GOOGLE_DRIVE_ROOT_FOLDER_ID is not configured in settings." });
      }

      console.log(`[Sync Drive Clients] Listing folders from Google Drive root: ${rootFolderId}...`);
      const q = `'${rootFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const allFolders = await driveRest.listFiles(q);

      // Filter folders starting with "PT " (case-insensitive) or "PT."
      const ptFolders = allFolders.filter(folder => {
        const name = folder.name || '';
        const upperName = name.toUpperCase().trim();
        return upperName.startsWith("PT ") || upperName.startsWith("PT.");
      });

      console.log(`[Sync Drive Clients] Found ${ptFolders.length} folders starting with "PT" prefix.`);

      // Fetch existing clients (profiles collection)
      const { documents: existingProfiles } = await firestoreRest.listDocuments("profiles", 500);
      
      // Use DriveFolderService.normalizeCompanyName to get a set of existing normalized names
      const existingNormalizedNames = new Set(
        existingProfiles.map(p => {
          const name = p.companyName || '';
          return DriveFolderService.normalizeCompanyName(name);
        })
      );

      const createdClients: string[] = [];

      // Iterate through folders and create missing clients
      for (const folder of ptFolders) {
        const folderName = folder.name.trim();
        const normFolderName = DriveFolderService.normalizeCompanyName(folderName);

        if (!existingNormalizedNames.has(normFolderName)) {
          const newId = crypto.randomUUID();
          
          // Pre-fill only companyName (Nama Perseroan) and basic default values
          const newProfile = {
            id: newId,
            companyName: folderName,
            companyType: 'SWASTA NASIONAL',
            documentType: 'CIRCULAR',
            duration: 'TIDAK TERBATAS',
            status: 'tertutup',
            kbliItems: [],
            oldManagementItems: [],
            newManagementItems: [],
            shareholders: [],
            shareTransfers: [],
            finalShareholders: [],
            guests: [],
            managementDismissals: [],
            shareTransfersNew: [],
            capitalSubscriptionsNew: [],
            updatedAt: new Date().toISOString(),
            updatedBy: (req as any).user?.email || 'System (Drive Sync)'
          };

          console.log(`[Sync Drive Clients] Creating new client profile: ${folderName}`);
          await firestoreRest.setDocument("profiles", newId, newProfile);
          createdClients.push(folderName);
          
          // Add to set to prevent duplicate creation if there are multiple duplicate folder names in response
          existingNormalizedNames.add(normFolderName);
        }
      }

      res.json({
        success: true,
        ptFoldersCount: ptFolders.length,
        createdClients,
        createdCount: createdClients.length
      });

    } catch (error: any) {
      console.error("[Sync Drive Clients] Error matching & syncing clients:", error);
      res.status(500).json({ error: error.message || "Failed to sync drive clients" });
    }
  });

  // V2 Architecture Routes (Phase 1 wiring)
  app.post("/api/v2/projects", authMiddleware, ProjectController.createProject);
  app.get("/api/v2/projects", authMiddleware, ProjectController.listProjects);
  app.get("/api/v2/projects/:id", authMiddleware, ProjectController.getProject);
  
  app.post("/api/v2/drive/ensure-folder", authMiddleware, DriveController.ensureFolder);
  app.get("/api/v2/drive/files", authMiddleware, DriveController.listFiles);
  
  app.post("/api/v2/documents/upload", authMiddleware, DocumentController.uploadDocument);

  app.post("/api/upload-document", async (req, res) => {
    const { projectId, name, fileName, fileType, base64, uploadedBy } = req.body;

    if (!projectId || !name || !fileName || !fileType || !base64) {
      return res.status(400).json({ error: "Missing required fields: projectId, name, fileName, fileType, base64" });
    }

    try {
      // 1. Get project document from Firestore REST
      const project = await firestoreRest.getDocument("office_projects", projectId);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // 2. Ensure Google Drive folders exist on-demand
      let driveFolderId = project.metadata?.driveFolderId;
      if (!driveFolderId) {
        console.log(`[Upload API] Project ${projectId} does not have a Google Drive folder. Creating on-demand...`);
        await DriveFolderService.handleNewProject(project);
        
        // Fetch the updated project to get the newly created driveFolderId
        const updatedProject = await firestoreRest.getDocument("office_projects", projectId);
        driveFolderId = updatedProject?.metadata?.driveFolderId;
        
        if (!driveFolderId) {
          throw new Error("Failed to ensure Google Drive folder for this project. Please check service account configuration.");
        }
      }

      // 3. Upload file to Google Drive
      console.log(`[Upload API] Uploading ${fileName} (${fileType}) to Google Drive folder: ${driveFolderId}...`);
      const uploadResult = await driveRest.uploadFile(fileName, fileType, driveFolderId, base64);
      const driveFileUrl = uploadResult.webViewLink;

      if (!driveFileUrl) {
        throw new Error("Google Drive did not return a webViewLink.");
      }

      // 4. Save metadata back to Firestore documents subcollection for this project
      const docId = crypto.randomUUID();
      const now = new Date();
      
      const newDoc = {
        id: docId,
        name: name,
        type: fileName.split('.').pop() || 'other',
        url: driveFileUrl,
        uploadedBy: uploadedBy || "staff_notaris",
        uploadedAt: now.toISOString()
      };

      console.log(`[Upload API] Registering document ${docId} in Firestore...`);
      await firestoreRest.setDocument("office_projects", `${projectId}/documents/${docId}`, newDoc);

      // 5. Add a timeline entry for auditing
      const timelineId = crypto.randomUUID();
      const timelineDoc = {
        id: timelineId,
        title: "Dokumen Administrasi Diunggah",
        description: `Dokumen "${name}" (${fileName}) berhasil diunggah ke Google Drive.`,
        createdBy: uploadedBy || "staff_notaris",
        createdAt: now.toISOString()
      };
      await firestoreRest.setDocument("office_projects", `${projectId}/timelines/${timelineId}`, timelineDoc);

      res.json({ success: true, document: newDoc });
    } catch (error: any) {
      console.error("[Upload API] Error uploading document:", error);
      res.status(500).json({ error: error.message || "Failed to upload document" });
    }
  });

  app.post("/api/send-whatsapp", async (req, res) => {
    const { target, message } = req.body;
    const FONNTE_TOKEN = process.env.FONNTE_TOKEN;

    if (!FONNTE_TOKEN) {
      return res.status(500).json({ error: "FONNTE_TOKEN is not configured" });
    }

    try {
      const response = await fetch("https://api.fonnte.com/send", {
        method: "POST",
        headers: {
          Authorization: FONNTE_TOKEN,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          target,
          message,
        }),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("WhatsApp Send Error:", error);
      res.status(500).json({ error: "Failed to send WhatsApp message" });
    }
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
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
