import { Response } from 'express';
import { AuthenticatedRequest } from '../middlewares/auth';

export class DocumentController {
  static async uploadDocument(req: AuthenticatedRequest, res: Response) {
    try {
      res.json({ success: true, message: "DocumentController.uploadDocument wired" });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to upload document" });
    }
  }
}
