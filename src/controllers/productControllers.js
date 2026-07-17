const prisma = require("../config/prisma");
const { generateUniqueSlug } = require("../utils/slug");

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


// get my products (supplier only)
const getMyProducts = async (req, res) => {
  try {
    const { status, categoryId, search } = req.query;

    const companyProfile = await prisma.companyProfiles.findUnique({
      where: { userId: req.user.id },
    });

    if (!companyProfile) {
      return res.status(403).json({
        success: false,
        message: "Hanya supplier yang dapat melihat produk miliknya.",
      });
    }

    const where = {
      supplierId: companyProfile.id,
      ...(status ? { status } : {}),
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
      ...(search
        ? {
            OR: [
              { nama: { contains: search, mode: "insensitive" } },
              { description: { contains: search, mode: "insensitive" } },
            ],
          }
        : {}),
    };

    const products = await prisma.product.findMany({
      where,
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
    });

    return res.status(200).json({
      success: true,
      message: "List produk supplier berhasil diambil.",
      data: products,
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

// get all product
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 10, status, categoryId, supplierId, hs_code, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const isAdmin = ["Admin", "Super_Admin"].includes(req.user.role?.name_role);

    const where = {
      ...(status ? { status } : (!isAdmin ? { status: "Active" } : {})),
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


// get popular products (top 5 by views)
const getPopularProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12, categoryId } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = {
      status: "Active",
      ...(categoryId ? { categoryId: Number(categoryId) } : {}),
    };

    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        skip: skip,
        take: parseInt(limit),
        include: productInclude,
        orderBy: { views: "desc" },
      }),
      prisma.product.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Produk populer berhasil diambil.",
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


// create product
const createProduct = async (req, res) => {
  try {
    const {
      nama,
      description,
      spectification,
      min_order,
      price_min,
      price_max,
      unit,
      hs_code,
      categoryId,
    } = req.body;

    if (!nama || !min_order || price_min === undefined || price_max === undefined) {
      return res.status(400).json({
        success: false,
        message: "Nama produk, minimal order, price_min, dan price_max wajib diisi.",
      });
    }

    if (Number(price_min) > Number(price_max)) {
      return res.status(400).json({
        success: false,
        message: "price_min tidak boleh lebih besar dari price_max.",
      });
    }

    const isSuperAdmin = req.user.role?.name_role === "Super_Admin";
    const { supplierId: requestedSupplierId } = req.body;

    let supplierId = null;

    if (isSuperAdmin) {
      if (requestedSupplierId) {
        const supplierProfile = await prisma.companyProfiles.findUnique({
          where: { id: Number(requestedSupplierId) },
        });
        if (!supplierProfile) {
          return res.status(404).json({
            success: false,
            message: "Supplier tidak ditemukan.",
          });
        }
        supplierId = supplierProfile.id;
      }
    } else {
      const companyProfile = await prisma.companyProfiles.findUnique({
        where: { userId: req.user.id },
      });

      if (!companyProfile) {
        return res.status(403).json({
          success: false,
          message: "Hanya supplier yang dapat menambahkan produk.",
        });
      }
      supplierId = companyProfile.id;
    }

    const finalSlug = await generateUniqueSlug(prisma.product, nama);

    const product = await prisma.product.create({
      data: {
        ...(supplierId ? { supplier: { connect: { id: supplierId } } } : {}),
        ...(categoryId ? { category: { connect: { id: Number(categoryId) } } } : {}),
        nama,
        description: description || null,
        spectification: spectification || null,
        min_order: Number(min_order),
        price_min: Number(price_min),
        price_max: Number(price_max),
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
    const {
      nama,
      description,
      spectification,
      min_order,
      price_min,
      price_max,
      unit,
      hs_code,
      categoryId,
    } = req.body;

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

    // Validate price range if either value is being updated
    const nextPriceMin = price_min !== undefined ? Number(price_min) : Number(existingProduct.price_min);
    const nextPriceMax = price_max !== undefined ? Number(price_max) : Number(existingProduct.price_max);
    if (nextPriceMin > nextPriceMax) {
      return res.status(400).json({
        success: false,
        message: "price_min tidak boleh lebih besar dari price_max.",
      });
    }

    const data = {
      ...(nama ? { nama } : {}),
      ...(description !== undefined ? { description: description || null } : {}),
      ...(spectification !== undefined ? { spectification: spectification || null } : {}),
      ...(min_order ? { min_order: Number(min_order) } : {}),
      ...(price_min !== undefined ? { price_min: Number(price_min) } : {}),
      ...(price_max !== undefined ? { price_max: Number(price_max) } : {}),
      ...(unit !== undefined ? { unit: unit || null } : {}),
      ...(hs_code !== undefined ? { hs_code: hs_code || null } : {}),
      ...(categoryId ? { category: { connect: { id: Number(categoryId) } } } : {}),
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

    const allowedStatus = ["Active", "Pending", "Rejected", "Draft"];
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
    const isSuperAdmin = req.user.role?.name_role === "Super_Admin";

    if (!isSuperAdmin) {
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
    } else {
      const existingProduct = await prisma.product.findUnique({
        where: { id: productId },
      });

      if (!existingProduct) {
        return res.status(404).json({
          success: false,
          message: "Produk tidak ditemukan.",
        });
      }
    }

    await prisma.productImages.deleteMany({ where: { productId } });
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
  getMyProducts,
  getProductById,
  getProductBySlug,
  getPopularProducts,
  createProduct,
  updateProduct,
  updateProductStatus,
  deleteProduct,
  deleteProductImage,
};