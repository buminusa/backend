const prisma = require("../config/prisma");

const getBuyerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = id ? parseInt(id) : req.user?.id;

    if (!userId) {
      return res.status(400).json({
        success: false,
        message: "User ID is required",
      });
    }

    const buyerProfile = await prisma.buyerProfiles.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            role: {
              select: {
                id: true,
                name_role: true,
              },
            },
          },
        },
      },
    });

    if (!buyerProfile) {
      return res.status(404).json({
        success: false,
        message: "Buyer profile not found",
      });
    }

    return res.status(200).json({
      success: true,
      message: "Buyer profile retrieved successfully",
      data: buyerProfile,
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

const getAllBuyerProfiles = async (req, res) => {
  try {
    const { page = 1, limit = 10 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [buyers, total] = await Promise.all([
      prisma.buyerProfiles.findMany({
        skip,
        take: parseInt(limit),
        orderBy: { createdAt: "desc" },
        include: {
          user: {
            select: {
              id: true,
              email: true,
              role: {
                select: {
                  id: true,
                  name_role: true,
                },
              },
            },
          },
        },
      }),
      prisma.buyerProfiles.count(),
    ]);

    return res.status(200).json({
      success: true,
      message: "Buyer profiles retrieved successfully",
      data: buyers,
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

const updateBuyerProfile = async (req, res) => {
  try {
    const { id } = req.params;
    const { full_name, address, province, country, phone } = req.body;

    const existing = await prisma.buyerProfiles.findUnique({
      where: { userId: parseInt(id) },
    });

    if (!existing) {
      return res.status(404).json({
        success: false,
        message: "Buyer profile not found",
      });
    }

    const updated = await prisma.buyerProfiles.update({
      where: { userId: parseInt(id) },
      data: {
        ...(full_name && { full_name }),
        ...(address && { address }),
        ...(province && { province }),
        ...(country && { country }),
        ...(phone && { phone }),
      },
    });

    return res.status(200).json({
      success: true,
      message: "Buyer profile updated successfully",
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

module.exports = {
  getBuyerProfile,
  getAllBuyerProfiles,
  updateBuyerProfile,
};
