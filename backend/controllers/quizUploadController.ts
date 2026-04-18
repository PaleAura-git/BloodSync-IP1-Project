import { Request, Response, NextFunction } from 'express';
import multer, { FileFilterCallback } from 'multer';

const ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
const MAX_SIZE_BYTES = 10 * 1024 * 1024; // 10MB

const storage = multer.memoryStorage();

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback) => {
  if (ALLOWED_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Only PDF, JPG, and PNG files are accepted'));
  }
};

export const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE_BYTES },
  fileFilter,
});

/**
 * POST /api/quiz/upload
 * Accepts a medical document, converts it to base64, and returns it
 * ready to be embedded as inline data in a Gemini chat message.
 */
export const uploadDocument = (req: Request, res: Response, next: NextFunction): void => {
  try {
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }

    const base64 = req.file.buffer.toString('base64');

    res.json({
      success: true,
      file: {
        originalName: req.file.originalname,
        mimeType: req.file.mimetype,
        size: req.file.size,
        data: base64,
      },
    });
  } catch (err) {
    next(err);
  }
};
