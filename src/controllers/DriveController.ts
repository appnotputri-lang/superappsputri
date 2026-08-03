import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';
import { firestoreRest } from '../lib/firestore-rest';
import { driveRest } from '../lib/drive-rest';

export class DriveController {
  private static getTargetParentFolderId(parentId?: string): string {
    const defaultFolder = process.env.GOOGLE_DRIVE_REPORT_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
    if (!parentId || parentId === '0B-My1uo45zLiMy11WVdHVFJ4RU0' || parentId === 'root' || parentId === 'undefined' || parentId === 'null') {
      return defaultFolder || 'root';
    }
    return parentId;
  }

  static async ensureFolder(req: AuthenticatedRequest, res: Response) {
    try {
      let { name, parentId } = req.body;
      if (!name) {
        return res.status(400).json({ error: "Missing required field: name" });
      }

      parentId = DriveController.getTargetParentFolderId(parentId);

      const q = `'${parentId}' in parents and name = '${name.replace(/'/g, "\\'")}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`;
      const existing = await driveRest.listFiles(q, 'files(id, name, webViewLink)', 10, process.env);
      if (existing && existing.length > 0) {
        return res.json({ success: true, folder: existing[0] });
      }

      const created = await driveRest.createFolder(name, [parentId], process.env);
      res.json({ success: true, folder: created });
    } catch (error: any) {
      console.error("[Drive API] Error ensuring folder:", error);
      res.status(500).json({ error: error.message || "Failed to ensure folder" });
    }
  }

  static async listFiles(req: AuthenticatedRequest, res: Response) {
    try {
      let q = (req.query.q as string) || '';
      const fields = (req.query.fields as string) || 'files(id, name, webViewLink)';

      const defaultFolder = process.env.GOOGLE_DRIVE_REPORT_FOLDER_ID || process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID;
      const placeholderId = '0B-My1uo45zLiMy11WVdHVFJ4RU0';

      if (defaultFolder) {
        if (q.includes(placeholderId)) {
          q = q.replace(new RegExp(placeholderId, 'g'), defaultFolder);
        }
        if (q.includes("'root' in parents")) {
          q = q.replace(/'root' in parents/g, `'${defaultFolder}' in parents`);
        }
      }

      const files = await driveRest.listFiles(q, fields, 1000, process.env);
      res.json({ success: true, files });
    } catch (error: any) {
      console.error("[Drive API] Error listing files:", error);
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
      let { fileName, mimeType, parentFolderId, base64 } = req.body;
      if (!fileName || !mimeType || !base64) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      parentFolderId = DriveController.getTargetParentFolderId(parentFolderId);

      const result = await driveRest.uploadFile(fileName, mimeType, parentFolderId, base64, process.env);
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
