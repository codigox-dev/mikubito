const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { serializeNotification } = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const listQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).optional().default(20),
  unread: z
    .enum(["true", "false"])
    .optional()
    .transform((value) => value === "true"),
});

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const { limit, unread } = parse(listQuerySchema, req.query);

    const where = {
      userId: req.user.id,
      ...(unread ? { readAt: null } : {}),
    };

    const [notifications, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        take: limit,
      }),
      prisma.notification.count({
        where: { userId: req.user.id, readAt: null },
      }),
    ]);

    res.set("Cache-Control", "no-store");
    res.json({
      notifications: notifications.map(serializeNotification),
      unreadCount,
    });
  })
);

router.post(
  "/read-all",
  asyncHandler(async (req, res) => {
    const result = await prisma.notification.updateMany({
      where: { userId: req.user.id, readAt: null },
      data: { readAt: new Date() },
    });

    res.json({ updated: result.count });
  })
);

router.post(
  "/:id/read",
  asyncHandler(async (req, res) => {
    const notification = await prisma.notification.findFirst({
      where: { id: req.params.id, userId: req.user.id },
    });

    if (!notification) {
      throw new AppError("La notificación no existe", 404);
    }

    const updated = notification.readAt
      ? notification
      : await prisma.notification.update({
          where: { id: notification.id },
          data: { readAt: new Date() },
        });

    res.json({ notification: serializeNotification(updated) });
  })
);

module.exports = router;
