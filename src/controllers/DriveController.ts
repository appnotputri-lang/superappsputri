import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';

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
}
