// ─────────────────────────────────────────
//  config/multer.js — File upload configuration
// ─────────────────────────────────────────

const multer = require('multer');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// ── Allowed MIME types ──────────────────────────────────────────────────────
const ALLOWED_TYPES = {
  documents: ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'],
  images: ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'],
};

// ── File filter factory ─────────────────────────────────────────────────────
const createFileFilter = (allowedTypes) => (req, file, cb) => {
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(`Invalid file type. Allowed types: ${allowedTypes.join(', ')}`),
      false
    );
  }
};

// ── Storage factory — creates destination-specific storage ──────────────────
const createStorage = (destinationPath) =>
  multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, destinationPath);
    },
    filename: (req, file, cb) => {
      // Format: uuid-originalname (sanitized)
      const uniqueId = uuidv4();
      const ext = path.extname(file.originalname).toLowerCase();
      const baseName = path.basename(file.originalname, ext)
        .replace(/[^a-zA-Z0-9]/g, '-')
        .toLowerCase();
      cb(null, `${uniqueId}-${baseName}${ext}`);
    },
  });

// ── Max file size from env (default 10 MB) ──────────────────────────────────
const maxSize = (parseInt(process.env.MAX_FILE_SIZE_MB, 10) || 10) * 1024 * 1024;

// ── Verification documents uploader (Doctors, Hospitals, Labs) ──────────────
const verificationUpload = multer({
  storage: createStorage('./uploads/verification'),
  fileFilter: createFileFilter(ALLOWED_TYPES.documents),
  limits: { fileSize: maxSize },
});

// ── Medical records uploader (Patients) ─────────────────────────────────────
const medicalUpload = multer({
  storage: createStorage('./uploads/medical'),
  fileFilter: createFileFilter(ALLOWED_TYPES.documents),
  limits: { fileSize: maxSize },
});

// ── Profile picture uploader ─────────────────────────────────────────────────
const profileUpload = multer({
  storage: createStorage('./uploads/profiles'),
  fileFilter: createFileFilter(ALLOWED_TYPES.images),
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB for profile pics
});

module.exports = {
  verificationUpload,
  medicalUpload,
  profileUpload,
};
