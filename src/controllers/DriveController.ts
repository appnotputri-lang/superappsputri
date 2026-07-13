import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { firestoreRest } from '../lib/firestore-rest';
import { driveRest } from '../lib/drive-rest';

export class DriveController {
  static async ensureFolder(req: AuthenticatedRequest, res: Response) {
    try {
      res.json({ success: true, message: "DriveController.ensureFolder wired" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to ensure folder" });
    }
  }

  static async listFiles(req: AuthenticatedRequest, res: Response) {
    try {
      res.json({ success: true, message: "DriveController.listFiles wired" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to list files" });
    }
  }

  static async listProjectFiles(req: AuthenticatedRequest, res: Response) {
    try {
      const { projectId } = req.params;
      if (!projectId) {
        return res.status(400).json({ error: "Missing projectId parameter" });
      }

      const project = await firestoreRest.getDocument("office_projects", String(projectId));
      if (!project) {
        return res.status(404).json({ error: "Project not found" });
      }

      const driveFolderId = project.metadata?.driveFolderId;
      if (!driveFolderId) {
        // Return empty files array if the folder doesn't exist yet
        return res.json({ success: true, files: [] });
      }

      const q = `'${driveFolderId}' in parents and trashed = false`;
      const fields = 'files(id, name, mimeType, size, modifiedTime, webViewLink, webContentLink, iconLink, parents)';
      const files = await driveRest.listFiles(q, fields);

      res.json({ success: true, files });
    } catch (error: any) {
      console.error("[Drive API] Error listing project files:", error);
      res.status(500).json({ error: error.message || "Failed to list project files" });
    }
  }

  static async uploadFile(req: AuthenticatedRequest, res: Response) {
    try {
      const { fileName, mimeType, parentFolderId, base64 } = req.body;
      if (!fileName || !mimeType || !parentFolderId || !base64) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      const result = await driveRest.uploadFile(fileName, mimeType, parentFolderId, base64);
      res.json({ success: true, file: result });
    } catch (error: any) {
      console.error("[Drive API] Error uploading file:", error);
      res.status(500).json({ error: error.message || "Failed to upload file" });
    }
  }

  static async deleteFile(req: AuthenticatedRequest, res: Response) {
    try {
      const fileId = req.params.fileId;
      if (!fileId || typeof fileId !== 'string') {
        return res.status(400).json({ error: "Missing or invalid fileId parameter" });
      }
      await driveRest.deleteFile(fileId);
      res.json({ success: true });
    } catch (error: any) {
      console.error("[Drive API] Error deleting file:", error);
      res.status(500).json({ error: error.message || "Failed to delete file" });
    }
  }
}
