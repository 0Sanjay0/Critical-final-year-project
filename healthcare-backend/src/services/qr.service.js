// ─────────────────────────────────────────
//  services/qr.service.js — QR code generation
// ─────────────────────────────────────────

const QRCode = require('qrcode');
const path = require('path');
const fs = require('fs');

/**
 * Generate a QR code PNG for a patient's emergency endpoint.
 *
 * The QR code encodes the full URL to the public emergency access page.
 * The qrId is permanent — this function is called ONCE at registration.
 *
 * @param {string} qrId - Patient's unique, immutable QR identifier (UUID)
 * @returns {Promise<string>} Relative path to the saved QR image
 */
const generatePatientQR = async (qrId) => {
  // The URL the QR code will point to (public emergency page)
  const emergencyUrl = `${process.env.CLIENT_URL || 'http://localhost:5173'}/emergency/${qrId}`;

  // Ensure QR directory exists
  const qrDir = path.resolve(process.env.QR_PATH || './qr');
  if (!fs.existsSync(qrDir)) {
    fs.mkdirSync(qrDir, { recursive: true });
  }

  const fileName = `${qrId}.png`;
  const filePath = path.join(qrDir, fileName);
  const relativePath = `qr/${fileName}`;

  // Generate and save QR as a PNG file
  await QRCode.toFile(filePath, emergencyUrl, {
    type: 'png',
    width: 400,
    margin: 2,
    color: {
      dark: '#1a1a2e',  // Dark navy QR modules
      light: '#ffffff', // White background
    },
    errorCorrectionLevel: 'H', // High error correction for damaged/dirty codes
  });

  console.log(`✅ QR generated for patient: ${qrId}`);
  return relativePath;
};

/**
 * Delete a QR code file (used when cleaning up test data).
 * @param {string} qrId
 */
const deletePatientQR = (qrId) => {
  const filePath = path.resolve(`./qr/${qrId}.png`);
  if (fs.existsSync(filePath)) {
    fs.unlinkSync(filePath);
  }
};

module.exports = { generatePatientQR, deletePatientQR };
