// ─────────────────────────────────────────
//  services/file.service.js
//  File path/URL helpers — abstraction layer
//  Swap local storage for S3 here later.
// ─────────────────────────────────────────

const path = require("path");
const fs = require("fs");

/**
 * Convert a local file path to a publicly accessible URL.
 * @param {string} filePath - Relative path from project root (e.g. uploads/profiles/abc.jpg)
 * @returns {string} Full URL
 */
const getFileUrl = (filePath) => {
  if (!filePath) return null;
  // Normalize path separators for URL
  const normalized = filePath.replace(/\\/g, "/");
  return `${process.env.SERVER_URL || "http://localhost:5000"}/${normalized}`;
};

/**
 * Delete a file from the local filesystem.
 * @param {string} filePath - Relative file path
 */
const deleteFile = (filePath) => {
  if (!filePath) return;
  const absolutePath = path.resolve(filePath);
  if (fs.existsSync(absolutePath)) {
    fs.unlinkSync(absolutePath);
  }
};

/**
 * Build a relative file path from multer's req.file object.
 * @param {object} file - Multer file object
 * @returns {string} Relative path (e.g. uploads/profiles/uuid-name.jpg)
 */
const getRelativePath = (file) => {
  if (!file) return null;
  return file.path.replace(/\\/g, "/");
};

module.exports = { getFileUrl, deleteFile, getRelativePath };
