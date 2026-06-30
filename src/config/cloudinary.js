require("dotenv").config();
const cloudinary = require("cloudinary").v2;
const { CloudinaryStorage } = require("multer-storage-cloudinary");
const multer = require("multer");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const storageNpwp = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "npwp",
    allowed_formats: ["jpg", "jpeg", "png", "pdf"],
    transformation: [{ quality: "auto" }],
  },
});

const storageLogo = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "logo",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ quality: "auto" }],
  },
});

const uploadNpwp = multer({
  storage: storageNpwp,
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Format file tidak didukung. Gunakan JPG, PNG, atau PDF."));
    }
    cb(null, true);
  },
});

const storageProduct = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: "products",
    allowed_formats: ["jpg", "jpeg", "png"],
    transformation: [{ quality: "auto" }],
  },
});

const uploadProduct = multer({
  storage: storageProduct,
  limits: { fileSize: 2 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/jpeg", "image/png", "image/jpg"];
    if (!allowed.includes(file.mimetype)) {
      return cb(new Error("Format file gambar produk tidak didukung. Gunakan JPG atau PNG."));
    }
    cb(null, true);
  },
});

const uploadRegister = multer({
  storage: new CloudinaryStorage({
    cloudinary,
    params: async (req, file) => {
      const folder = file.fieldname === "npwp" ? "npwp" : "logo";

      return {
        folder,
        allowed_formats:
          file.fieldname === "npwp"
            ? ["jpg", "jpeg", "png", "pdf"]
            : ["jpg", "jpeg", "png"],
        transformation: [{ quality: "auto" }]
      };
    }
  }),
  limits: { fileSize: 1 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowedNpwp = ["image/jpeg", "image/png", "image/jpg", "application/pdf"];
    const allowedLogo = ["image/jpeg", "image/png", "image/jpg"];
    
    if (file.fieldname === "npwp" && !allowedNpwp.includes(file.mimetype)) {
      return cb(new Error("Format file NPWP tidak didukung. Gunakan JPG, PNG, atau PDF."));
    }
    if (file.fieldname === "logo" && !allowedLogo.includes(file.mimetype)) {
      return cb(new Error("Format file logo tidak didukung. Gunakan JPG atau PNG."));
    }
    cb(null, true);
  }
});

module.exports = { cloudinary, uploadRegister, uploadNpwp, uploadLogo, uploadProduct };