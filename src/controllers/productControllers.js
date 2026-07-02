const prisma = require("../config/prisma");
const { generateUniqueSlug } = require("../utils/slugify");

// define data to include in product queries
const productInclude = {
  category: true,
  supplier: {
    select: {
      id: true,
      company_name: true,
      slug: true,
      logo_url: true,
    },
  },
  images: true,
};


// get all product
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, categoryId, supplierId, hs_code, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(status ? { status } : { status: "Active" }),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(supplierId ? { supplierId: Number(supplierId) } : {}),
      ...(hs_code ? { hs_code } : {}),
      ...(search
        ? {
            OR: [
              { nama: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip,
        take: parseInt(limit),
        include: productInclude,
        orderBy: { createdAt: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "List produk berhasil diambil.",
      data: products,
      meta: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        totalPages: Math.ceil(total / parseInt(limit)),
      },
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// get product by id
const getProductById = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail produk berhasil diambil.",
      data: product,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// get product by slug
const getProductBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const product = await prisma.product.findUnique({
      where: { slug },
      include: productInclude,
    });

    if (!product) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan.",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Detail produk berhasil diambil.",
      data: product,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// create product
const createProduct = async (req, res) => {
  try {
    const { nama, description, spectification, min_order, unit, hs_code, categoryId } = req.body;

    if (!nama || !min_order) {
      return res.status(400).json({
        success: false,
        message: "Nama produk dan minimal order wajib diisi.",
      });
    }

    const companyProfile = await prisma.companyProfiles.findUnique({
      where: { userId: req.user.id },
    });

    if (!companyProfile) {
      return res.status(403).json({
        success: false,
        message: "Hanya supplier yang dapat menambahkan produk.",
      });
    }

    const finalSlug = await generateUniqueSlug(prisma.product, nama);

    const product = await prisma.product.create({
      data: {
        supplierId: companyProfile.id,
        categoryId: categoryId ? Number(categoryId) : null,
        nama,
        description: description || null,
        spectification: spectification || null,
        min_order: Number(min_order),
        unit: unit || null,
        hs_code: hs_code || null,
        slug: finalSlug,
        status: "Pending",
      },
    });

    const imageFiles = req.files?.images || [];

    if (imageFiles.length > 0) {
      const createImages = imageFiles.map((file) => ({
        productId: product.id,
        image_url: file.path,
      }));

      await prisma.productImages.createMany({
        data: createImages,
        skipDuplicates: true,
      });
    }

    const createdProduct = await prisma.product.findUnique({
      where: { id: product.id },
      include: productInclude,
    });

    return res.status(201).json({
      success: true,
      message: "Produk berhasil dibuat.",
      data: createdProduct,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};


// update product
const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { nama, description, spectification, min_order, unit, hs_code, categoryId } = req.body;

    const companyProfile = await prisma.companyProfiles.findUnique({
      where: { userId: req.user.id },
    });

    if (!companyProfile) {
      return res.status(403).json({
        success: false,
        message: "Hanya supplier yang dapat memperbarui produk.",
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan.",
      });
    }

    if (existingProduct.supplierId !== companyProfile.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin untuk mengubah produk ini.",
      });
    }

    const data = {
      ...(nama ? { nama } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(spectification !== undefined ? { spectification: spectification || null } : {}),
      ...(min_order ? { min_order: Number(min_order) } : {}),
      ...(unit !== undefined ? { unit: unit || null } : {}),
      ...(hs_code !== undefined ? { hs_code: hs_code || null } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    };

    if (nama && nama !== existingProduct.nama) {
      data.slug = await generateUniqueSlug(prisma.product, nama, existingProduct.id);
    }

    // Re-submit for review after supplier edits.
    data.status = "Pending";

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data,
    });

    const imageFiles = req.files?.images || [];
    if (imageFiles.length > 0) {
      const createImages = imageFiles.map((file) => ({
        productId: updatedProduct.id,
        image_url: file.path,
      }));

      await prisma.productImages.createMany({
        data: createImages,
        skipDuplicates: true,
      });
    }

    const productWithRelations = await prisma.product.findUnique({
      where: { id: productId },
      include: productInclude,
    });

    return res.status(200).json({
      success: true,
      message: "Produk berhasil diperbarui.",
      data: productWithRelations,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// update product status (admin only)
const updateProductStatus = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { status } = req.body;

    const allowedStatus = ["Active", "Rejected"];
    if (!status || !allowedStatus.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Status harus salah satu dari: ${allowedStatus.join(", ")}.`,
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan.",
      });
    }

    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: { status },
      include: productInclude,
    });

    return res.status(200).json({
      success: true,
      message: `Status produk berhasil diubah menjadi ${status}.`,
      data: updatedProduct,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// delete product 

const deleteProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const companyProfile = await prisma.companyProfiles.findUnique({
      where: { userId: req.user.id },
    });

    if (!companyProfile) {
      return res.status(403).json({
        success: false,
        message: "Hanya supplier yang dapat menghapus produk.",
      });
    }

    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!existingProduct) {
      return res.status(404).json({
        success: false,
        message: "Produk tidak ditemukan.",
      });
    }

    if (existingProduct.supplierId !== companyProfile.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin untuk menghapus produk ini.",
      });
    }

    await prisma.product.delete({ where: { id: productId } });

    return res.status(200).json({
      success: true,
      message: "Produk berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

// delete product image for a specific product (supplier only)
const deleteProductImage = async (req, res) => {
  try {
    const imageId = Number(req.params.imageId);

    const companyProfile = await prisma.companyProfiles.findUnique({
      where: { userId: req.user.id },
    });

    if (!companyProfile) {
      return res.status(403).json({
        success: false,
        message: "Hanya supplier yang dapat menghapus gambar produk.",
      });
    }

    const image = await prisma.productImages.findUnique({
      where: { id: imageId },
      include: { product: true },
    });

    if (!image) {
      return res.status(404).json({
        success: false,
        message: "Gambar tidak ditemukan.",
      });
    }

    if (image.product.supplierId !== companyProfile.id) {
      return res.status(403).json({
        success: false,
        message: "Anda tidak memiliki izin untuk menghapus gambar ini.",
      });
    }

    await prisma.productImages.delete({ where: { id: imageId } });

    return res.status(200).json({
      success: true,
      message: "Gambar produk berhasil dihapus.",
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
};

module.exports = {
  getAllProducts,
  getProductById,
  getProductBySlug,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  deleteProductImage,
};