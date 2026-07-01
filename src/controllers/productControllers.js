const prisma = require("../config/prisma");

const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};


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

    const rawSlug = generateSlug(nama);
    const slugExists = await prisma.product.findUnique({
      where: { slug: rawSlug },
    });

    const finalSlug = slugExists ? `${rawSlug}-${Date.now()}` : rawSlug;

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
      include: {
        category: true,
        supplier: true,
        images: true,
      },
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

const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, categoryId, supplierId, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      ...(status ? { status } : { status: "Active" }),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(supplierId ? { supplierId: Number(supplierId) } : {}),
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
        include: {
          category: true,
          supplier: {
            select: {
              id: true,
              company_name: true,
              slug: true,
            },
          },
          images: true,
        },
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

const getProductById = async (req, res) => {
  try {
    const productId = Number(req.params.id);

    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
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
      },
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

const updateProduct = async (req, res) => {
  try {
    const productId = Number(req.params.id);
    const { nama, description, spectification, min_order, unit, hs_code, categoryId, status } = req.body;

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
      ...(status ? { status } : {}),
    };

    if (nama && nama !== existingProduct.nama) {
      const rawSlug = generateSlug(nama);
      const slugExists = await prisma.product.findUnique({
        where: { slug: rawSlug },
      });
      data.slug = slugExists ? `${rawSlug}-${Date.now()}` : rawSlug;
    }

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
      include: {
        category: true,
        supplier: true,
        images: true,
      },
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

module.exports = {
  createProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
