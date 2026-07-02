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

const getAllCategories = async (req, res) => {
  try {
    const { page = 1, limit = 10, search } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const where = search
      ? {
          OR: [
            { name_categories: { contains: search, mode: "insensitive" } },
            { slug: { contains: search, mode: "insensitive" } },
          ],
        }
      : {};

    const [categories, total] = await Promise.all([
      prisma.categories.findMany({
        where,
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
      }),
      prisma.categories.count({ where }),
    ]);

    return res.status(200).json({
      success: true,
      message: "Categories retrieved successfully",
      data: categories,
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

const getCategoryById = async (req, res) => {
  try {
    const category = await prisma.categories.findUnique({
      where: { id: parseInt(req.params.id) },
      include: {
        products: {
          select: {
            id: true,
            nama: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      data: category,
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

const getCategoryBySlug = async (req, res) => {
  try {
    const { slug } = req.params;

    const category = await prisma.categories.findUnique({
      where: { slug },
      include: {
        products: {
          select: {
            id: true,
            nama: true,
            slug: true,
            status: true,
          },
        },
      },
    });

    if (!category) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Category retrieved successfully",
      data: category,
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

const createCategory = async (req, res) => {
  try {
    const { name_categories, slug } = req.body;

    if (!name_categories) {
      return res.status(400).json({
        success: false,
        message: "name_categories is required",
      });
    }

    const baseSlug = slug || generateSlug(name_categories);

    const existingSlug = await prisma.categories.findFirst({
      where: { slug: baseSlug },
    });

    const finalSlug = existingSlug ? `${baseSlug}-${Date.now()}` : baseSlug;

    const category = await prisma.categories.create({
      data: {
        name_categories,
        slug: finalSlug,
      },
    });

    return res.status(201).json({
      success: true,
      message: "Category created successfully",
      data: category,
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

const updateCategory = async (req, res) => {
  try {
    const { name_categories, slug } = req.body;

    const existing = await prisma.categories.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    const newSlug = slug || (name_categories ? generateSlug(name_categories) : existing.slug);

    const slugTaken = await prisma.categories.findFirst({
      where: {
        slug: newSlug,
        NOT: { id: existing.id },
      },
    });

    const finalSlug = slugTaken ? `${newSlug}-${Date.now()}` : newSlug;

    const updated = await prisma.categories.update({
      where: { id: existing.id },
      data: {
        ...(name_categories && { name_categories }),
        ...(slug || name_categories ? { slug: finalSlug } : {}),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Category updated successfully",
      data: updated,
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

const deleteCategory = async (req, res) => {
  try {
    const existing = await prisma.categories.findUnique({
      where: { id: parseInt(req.params.id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Category not found",
      });
    }

    await prisma.categories.delete({
      where: { id: existing.id },
    });

    return res.status(200).json({
      success: true,
      message: "Category deleted successfully",
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
  getAllCategories,
  getCategoryById,
  getCategoryBySlug,
  createCategory,
  updateCategory,
  deleteCategory,
};
