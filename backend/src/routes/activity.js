const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { serializeActivity, userSummarySelect } = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const querySchema = z.object({
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  entityType: z
    .enum(["ALL", "TASK", "FINANCE", "TRIP", "SHOPPING"])
    .optional()
    .default("ALL"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { page, limit, entityType } = parse(
      querySchema,
      req.query,
      "Filtros de actividad no válidos"
    );

    const where = entityType === "ALL" ? {} : { entityType };

    const [activities, total] = await Promise.all([
      prisma.activityLog.findMany({
        where,
        include: { user: userSummarySelect },
        orderBy: { createdAt: "desc" },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.activityLog.count({ where }),
    ]);

    res.json({
      activities: activities.map(serializeActivity),
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total,
      },
    });
  })
);

module.exports = router;
