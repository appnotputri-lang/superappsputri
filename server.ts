import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { firestoreRest } from "./src/lib/firestore-rest";
import { DriveFolderService } from "./src/services/DriveFolderService";
import { CompanyService } from "./src/services/CompanyService";
import { driveRest } from "./src/lib/drive-rest";
import { authMiddleware } from "./src/middlewares/auth";
import { ProjectController } from "./src/controllers/ProjectController";
import { DriveController } from "./src/controllers/DriveController";
import { DocumentController } from "./src/controllers/DocumentController";

async function startServer() {
  const app = express();
  const PORT = 3000;

  console.log("Server starting in REST mode (Cloudflare compatible architecture)...");

  // CORS Middleware to support Cloudflare deployments
  app.use((req, res, next) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));

  // API routes FIRST
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: "REST" });
  });

  app.post("/api/v2/drive/ensure-client-folder", authMiddleware, async (req, res) => {
    try {
      const { clientId, companyName, clientType } = req.body;
      if (!clientId || !companyName) {
        return res.status(400).json({ error: "Missing clientId or companyName" });
      }

      console.log(`[Drive API] Ensuring client folder for: ${companyName} (${clientType || 'PT'})`);
      const companyFolder = await DriveFolderService.ensureCompanyFolder(companyName, clientType || 'PT', process.env);
      
      // Save driveFolderId and driveFolderUrl into the client document
      await firestoreRest.updateDocument('profiles', clientId, {
        clientType: clientType || 'PT',
        driveFolderId: companyFolder.folderId,
        driveFolderUrl: companyFolder.folderUrl
      }, process.env);

      res.json({ success: true, folderId: companyFolder.folderId, folderUrl: companyFolder.folderUrl });
    } catch (error: any) {
      console.error("[Drive API] Error ensuring client folder:", error);
      res.status(500).json({ error: error.message || "Failed to ensure client folder" });
    }
  });

  app.post("/api/v2/drive/delete-client-folder", authMiddleware, async (req, res) => {
    try {
      const { clientId, companyName, clientType, driveFolderId: passedFolderId } = req.body;
      if (!clientId) {
        return res.status(400).json({ error: "Missing clientId" });
      }

      console.log(`[Drive API] Request to delete client folder for clientId: ${clientId}, name: ${companyName}`);

      // 1. Fetch client doc from Firestore to get stored folderId and companyName if not passed
      const clientDoc = await firestoreRest.getDocument('profiles', clientId, process.env);
      const targetName = companyName || clientDoc?.companyName;
      const targetType = clientType || clientDoc?.clientType || 'PT';
      let folderIdToDelete = passedFolderId || clientDoc?.driveFolderId;

      let normalized = '';
      if (targetName) {
        normalized = DriveFolderService.normalizeCompanyName(targetName);
      }

      // 2. Check drive_folder_map if folderIdToDelete is still missing
      if (!folderIdToDelete && normalized) {
        const mapDoc = await firestoreRest.getDocument('drive_folder_map', normalized, process.env);
        if (mapDoc && mapDoc.driveFolderId) {
          folderIdToDelete = mapDoc.driveFolderId;
        }
      }

      // 3. Fallback: Search drive directly if still missing
      if (!folderIdToDelete && targetName) {
        try {
          const rootFolderId = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
          if (rootFolderId) {
            const companyProfileFolderId = await DriveFolderService.getOrCreateFolderByName("COMPANY PROFILE", rootFolderId, process.env);
            const typeFolderMap: Record<string, string> = {
              'PT': 'PT',
              'CV': 'CV',
              'YAYASAN': 'YAYASAN',
              'PERKUMPULAN': 'PERKUMPULAN',
              'FIRMA': 'PERSEKUTUAN FIRMA',
              'PERDATA': 'PERSEKUTUAN PERDATA',
              'KOPERASI': 'KOPERASI',
              'PMA': 'PMA',
              'PERORANGAN': 'PERORANGAN'
            };
            const typeFolderName = typeFolderMap[targetType] || 'LAINNYA';
            const typeFolderId = await DriveFolderService.getOrCreateFolderByName(typeFolderName, companyProfileFolderId, process.env);
            
            const q = `'${typeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
            const allFolders = await driveRest.listFiles(q, 'files(id, name)', 1000, process.env);
            const existing = allFolders.find(f => DriveFolderService.normalizeCompanyName(f.name) === normalized);
            if (existing) {
              folderIdToDelete = existing.id;
            }
          }
        } catch (e: any) {
          console.warn(`[Drive API] Search fallback failed:`, e?.message);
        }
      }

      // 4. Delete the folder from Google Drive
      if (folderIdToDelete) {
        try {
          console.log(`[Drive API] Deleting Google Drive folder ID: ${folderIdToDelete}`);
          await driveRest.deleteFile(folderIdToDelete, process.env);
        } catch (driveErr: any) {
          console.warn(`[Drive API] Could not delete folder ${folderIdToDelete} from Drive:`, driveErr?.message || driveErr);
        }
      } else {
        console.log(`[Drive API] No Drive folder found for client ${targetName || clientId}`);
      }

      // 5. Clean up drive_folder_map Firestore entry
      if (normalized) {
        try {
          await firestoreRest.deleteDocument('drive_folder_map', normalized, process.env);
        } catch (mapErr) {
          // ignore if map doc doesn't exist
        }
      }

      res.json({ success: true, message: "Client folder deleted successfully" });
    } catch (error: any) {
      console.error("[Drive API] Error in delete-client-folder:", error);
      res.status(500).json({ error: error.message || "Failed to delete client folder" });
    }
  });

  app.post("/api/v2/drive/ensure-project-folder", authMiddleware, async (req, res) => {
    try {
      const { project } = req.body;
      if (!project || !project.projectId || !project.clientId) {
        return res.status(400).json({ error: "Missing valid project object" });
      }

      console.log(`[Drive API] Ensuring project folder for project ID: ${project.projectId}`);
      await DriveFolderService.handleNewProject(project, process.env);

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

      const clientTypeFilter = req.query.clientType as string;

      console.log(`[Sync Drive Clients] Ensuring COMPANY PROFILE folder exists...`);
      const companyProfileId = await DriveFolderService.getOrCreateFolderByName("COMPANY PROFILE", rootFolderId, process.env);
      
      // 1. List all type folders inside COMPANY PROFILE in one request
      const qTypes = `'${companyProfileId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const typeFolders = await driveRest.listFiles(qTypes, 'files(id, name)', 100, process.env);
      
      const typeFoldersMapping = [
        { folder: 'PT', type: 'PT' },
        { folder: 'CV', type: 'CV' },
        { folder: 'YAYASAN', type: 'YAYASAN' },
        { folder: 'PERKUMPULAN', type: 'PERKUMPULAN' },
        { folder: 'KOPERASI', type: 'KOPERASI' },
        { folder: 'PERSEKUTUAN FIRMA', type: 'FIRMA' },
        { folder: 'PERSEKUTUAN PERDATA', type: 'PERDATA' },
        { folder: 'PMA', type: 'PMA' },
        { folder: 'PERORANGAN', type: 'PERORANGAN' },
        { folder: 'LAINNYA', type: 'LAINNYA' }
      ].filter(m => !clientTypeFilter || m.type === clientTypeFilter);

      let allFolders: any[] = [];
      for (const mapping of typeFoldersMapping) {
        let typeFolderId = typeFolders.find(f => f.name.toUpperCase() === mapping.folder.toUpperCase())?.id;
        
        if (!typeFolderId) {
          console.log(`[Sync Drive Clients] Type folder ${mapping.folder} not found, creating...`);
          typeFolderId = await DriveFolderService.getOrCreateFolderByName(mapping.folder, companyProfileId, process.env);
        }

        if (typeFolderId) {
          const q = `'${typeFolderId}' in parents and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
          const folders = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 1000, process.env);
          allFolders.push(...folders.map(f => ({ ...f, clientType: mapping.type })));
        }
      }

      console.log(`[Sync Drive Clients] Found total ${allFolders.length} folders across all types.`);

      // Fetch existing clients (profiles collection)
      const { documents: existingProfiles } = await firestoreRest.listDocuments("profiles", 1000, undefined, process.env);
      
      // Duplicate detection using (Type + Normalized Name)
      const existingKeys = new Set(
        existingProfiles.map((p: any) => {
          const name = p.fields?.companyName?.stringValue || p.companyName || "";
          const type = p.fields?.clientType?.stringValue || p.clientType || "PT";
          return `${type}:${DriveFolderService.normalizeCompanyName(name)}`;
        })
      );

      const stripTypePrefix = (name: string, type: string): string => {
        let clean = name.toUpperCase().trim();
        const typePrefixMap: Record<string, string[]> = {
          'PT': ['PT ', 'PT.'],
          'CV': ['CV ', 'CV.'],
          'YAYASAN': ['YAYASAN '],
          'PERKUMPULAN': ['PERKUMPULAN '],
          'KOPERASI': ['KOPERASI '],
          'FIRMA': ['PERSEKUTUAN FIRMA ', 'FIRMA '],
          'PERDATA': ['PERSEKUTUAN PERDATA ', 'PERDATA '],
          'PMA': ['PMA '],
          'PERORANGAN': ['PERORANGAN ']
        };
        const prefixes = typePrefixMap[type] || [];
        for (const p of prefixes) {
          if (clean.startsWith(p)) {
            clean = clean.substring(p.length).trim();
            break;
          }
        }
        return clean;
      };

      const createdClients: string[] = [];
      const MAX_CREATION_PER_SYNC = 40; // Limit for dev server

      // Iterate through folders and create missing clients
      for (const folder of allFolders) {
        if (createdClients.length >= MAX_CREATION_PER_SYNC) break;

        const folderName = folder.name.trim();
        const clientType = folder.clientType;
        const cleanCompanyName = stripTypePrefix(folderName, clientType);
        const normFolderName = DriveFolderService.normalizeCompanyName(cleanCompanyName);
        const key = `${clientType}:${normFolderName}`;

        if (!existingKeys.has(key)) {
          const newId = crypto.randomUUID();
          
          // Pre-fill only companyName (Nama Perseroan) and basic default values
          const newProfile = {
            id: newId,
            companyName: cleanCompanyName,
            clientType: clientType,
            companyType: clientType === 'CV' ? 'CV' : 'SWASTA NASIONAL',
            documentType: 'CIRCULAR',
            duration: 'TIDAK TERBATAS',
            status: 'AKTIF',
            isArchived: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            updatedBy: (req as any).user?.email || 'System (Drive Sync)'
          };

          console.log(`[Sync Drive Clients] Creating new ${clientType} client profile: ${cleanCompanyName}`);
          await firestoreRest.setDocument("profiles", newId, newProfile, process.env);
          createdClients.push(`${clientType} ${cleanCompanyName}`);
          
          // Add to set to prevent duplicate creation
          existingKeys.add(key);
        }
      }

      res.json({
        success: true,
        totalFoldersCount: allFolders.length,
        createdClients,
        createdCount: createdClients.length,
        message: createdClients.length === MAX_CREATION_PER_SYNC ? "Limit tercapai. Silakan klik lagi untuk sisa klien." : "Sinkronisasi selesai."
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
  app.get("/api/v2/drive/list-project-files/:projectId", authMiddleware, DriveController.listProjectFiles);
  app.post("/api/v2/drive/upload-file", authMiddleware, DriveController.uploadFile);
  app.delete("/api/v2/drive/delete-file/:fileId", authMiddleware, DriveController.deleteFile);
  app.post("/api/v2/drive/trash-folder/:folderId", authMiddleware, async (req, res) => {
    try {
      const folderId = String(req.params.folderId || '');
      if (!folderId) return res.status(400).json({ error: "Missing folderId" });
      await driveRest.deleteFile(folderId, process.env);
      res.json({ success: true, message: "Folder deleted from Drive" });
    } catch (err: any) {
      console.warn(`[Drive API] Failed to delete folder ${req.params.folderId}:`, err?.message);
      res.status(500).json({ error: err.message || "Failed to delete folder" });
    }
  });
  
  app.post("/api/v2/documents/upload", authMiddleware, DocumentController.uploadDocument);

  app.post("/api/upload-document", async (req, res) => {
    const { projectId, name, fileName, fileType, base64, uploadedBy } = req.body;

    if (!projectId || !name || !fileName || !fileType || !base64) {
      return res.status(400).json({ error: "Missing required fields: projectId, name, fileName, fileType, base64" });
    }

    try {
      // 1. Get project document from Firestore REST
      const project = await firestoreRest.getDocument("office_projects", projectId, process.env);
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      // 2. Ensure Google Drive folders exist on-demand
      let driveFolderId = project.metadata?.driveFolderId;
      if (!driveFolderId) {
        console.log(`[Upload API] Project ${projectId} does not have a Google Drive folder. Creating on-demand...`);
        await DriveFolderService.handleNewProject(project, process.env);
        
        // Fetch the updated project to get the newly created driveFolderId
        const updatedProject = await firestoreRest.getDocument("office_projects", projectId, process.env);
        driveFolderId = updatedProject?.metadata?.driveFolderId;
        
        if (!driveFolderId) {
          throw new Error("Failed to ensure Google Drive folder for this project. Please check service account configuration.");
        }
      }

      // 3. Upload file to Google Drive
      console.log(`[Upload API] Uploading ${fileName} (${fileType}) to Google Drive folder: ${driveFolderId}...`);
      const uploadResult = await driveRest.uploadFile(fileName, fileType, driveFolderId, base64, process.env);
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
      await firestoreRest.setDocument("office_projects", `${projectId}/documents/${docId}`, newDoc, process.env);

      // 5. Add a timeline entry for auditing
      const timelineId = crypto.randomUUID();
      const timelineDoc = {
        id: timelineId,
        title: "Dokumen Administrasi Diunggah",
        description: `Dokumen "${name}" (${fileName}) berhasil diunggah ke Google Drive.`,
        createdBy: uploadedBy || "staff_notaris",
        createdAt: now.toISOString()
      };
      await firestoreRest.setDocument("office_projects", `${projectId}/timelines/${timelineId}`, timelineDoc, process.env);

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
