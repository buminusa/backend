const multer = require("multer");

/**
 * Middleware untuk menangani error dari multer (upload file)
 * Harus ditaruh setelah route upload
 */
const handleUploadError = (err, req, res, next) => {
  if (err instanceof multer.MulterError) {
    // Multer error (file terlalu besar, dll)
    if (err.code === "LIMIT_FILE_SIZE") {
      return res.status(400).json({
        success: false,
        message: "Ukuran file terlalu besar. Maksimal 1MB.",
      });
    }
    return res.status(400).json({
      success: false,
      message: `Upload error: ${err.message}`,
    });
  }

  if (err) {
    // Error dari fileFilter (format tidak didukung)
    return res.status(400).json({
      success: false,
      message: err.message || "Terjadi kesalahan saat upload file.",
    });
  }

  next();
};

module.exports = { handleUploadError };
