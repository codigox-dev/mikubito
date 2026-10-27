const { Router } = require("express");
const { z } = require("zod");
const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { requireAuth } = require("../middleware/auth");
const { ACTIONS } = require("../lib/activity-actions");
const { recordActivity } = require("../lib/audit");
const {
  serializeShoppingItem,
  serializeShoppingList,
  userSummarySelect,
} = require("../lib/serializers");

const router = Router();

router.use(requireAuth);

const listInclude = {
  createdBy: userSummarySelect,
  closedBy: userSummarySelect,
  items: {
    include: { addedBy: userSummarySelect },
    orderBy: [{ purchased: "asc" }, { createdAt: "desc" }],
  },
};

const listQuerySchema = z.object({
  status: z.enum(["all", "active", "closed"]).optional().default("all"),
});

const createListSchema = z.object({
  name: z.string().trim().min(1, "Ponle un nombre a la lista").max(120),
});

const createItemSchema = z.object({
  name: z.string().trim().min(1, "El producto necesita un nombre").max(160),
  quantity: z.string().trim().max(40).optional().nullable(),
});

const updateItemSchema = z
  .object({
    name: z.string().trim().min(1).max(160).optional(),
    quantity: z.string().trim().max(40).optional().nullable(),
    purchased: z.boolean().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "No hay cambios que guardar",
  });

async function findListOrThrow(id) {
  const list = await prisma.shoppingList.findUnique({
    where: { id },
    include: listInclude,
  });

  if (!list) {
    throw new AppError("La lista no existe", 404);
  }

  return list;
}

router.get(
  "/lists",
  asyncHandler(async (req, res) => {
    const { status } = parse(listQuerySchema, req.query);

    const lists = await prisma.shoppingList.findMany({
      where: status === "all" ? {} : { status: status === "active" ? "ACTIVE" : "CLOSED" },
      include: listInclude,
      orderBy: { createdAt: "desc" },
    });

    res.json({ lists: lists.map(serializeShoppingList) });
  })
);

router.get(
  "/lists/:id",
  asyncHandler(async (req, res) => {
    const list = await findListOrThrow(req.params.id);
    res.json({ list: serializeShoppingList(list) });
  })
);

router.post(
  "/lists",
  asyncHandler(async (req, res) => {
    const data = parse(createListSchema, req.body, "Revisa el nombre de la lista");

    const activeList = await prisma.shoppingList.findFirst({
      where: { status: "ACTIVE" },
      select: { id: true, name: true },
    });

    if (activeList) {
      throw new AppError(
        `Ya tienes una lista activa: «${activeList.name}». Ciérrala antes de crear otra.`,
        409
      );
    }

    const list = await prisma.$transaction(async (tx) => {
      const created = await tx.shoppingList.create({
        data: {
          name: data.name,
          createdById: req.user.id,
        },
        include: listInclude,
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.SHOPPING_LIST_CREATED,
        entityType: "SHOPPING",
        entityId: created.id,
        description: `${req.user.name} creó la lista de compra «${created.name}»`,
        metadata: { listName: created.name },
      });

      return created;
    });

    res.status(201).json({ list: serializeShoppingList(list) });
  })
);

router.post(
  "/lists/:id/items",
  asyncHandler(async (req, res) => {
    const data = parse(createItemSchema, req.body, "Revisa los datos del producto");
    const list = await findListOrThrow(req.params.id);

    if (list.status !== "ACTIVE") {
      throw new AppError("No se pueden añadir productos a una lista cerrada", 409);
    }

    const item = await prisma.$transaction(async (tx) => {
      const created = await tx.shoppingItem.create({
        data: {
          listId: list.id,
          name: data.name,
          quantity: data.quantity || null,
          addedById: req.user.id,
        },
        include: { addedBy: userSummarySelect },
      });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.SHOPPING_ITEM_ADDED,
        entityType: "SHOPPING",
        entityId: created.id,
        description: `${req.user.name} añadió «${created.name}» a la lista «${list.name}»`,
        metadata: { listName: list.name, itemName: created.name },
      });

      return created;
    });

    res.status(201).json({ item: serializeShoppingItem(item) });
  })
);

router.patch(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const data = parse(updateItemSchema, req.body, "Revisa los datos del producto");
    const existing = await prisma.shoppingItem.findUnique({
      where: { id: req.params.id },
      include: { list: true },
    });

    if (!existing) {
      throw new AppError("El producto no existe", 404);
    }

    if (existing.list.status !== "ACTIVE") {
      throw new AppError("La lista ya está cerrada", 409);
    }

    const updateData = {};

    if (data.name !== undefined) updateData.name = data.name;
    if (data.quantity !== undefined) updateData.quantity = data.quantity || null;

    const purchasedChanged =
      data.purchased !== undefined && data.purchased !== existing.purchased;

    if (data.purchased !== undefined) {
      updateData.purchased = data.purchased;
      updateData.purchasedAt = data.purchased ? new Date() : null;
    }

    const item = await prisma.$transaction(async (tx) => {
      const updated = await tx.shoppingItem.update({
        where: { id: existing.id },
        data: updateData,
        include: { addedBy: userSummarySelect },
      });

      if (purchasedChanged) {
        await recordActivity({
          tx,
          userId: req.user.id,
          action: updated.purchased
            ? ACTIONS.SHOPPING_ITEM_PURCHASED
            : ACTIONS.SHOPPING_ITEM_UNPURCHASED,
          entityType: "SHOPPING",
          entityId: updated.id,
          description: updated.purchased
            ? `${req.user.name} marcó «${updated.name}» como comprado`
            : `${req.user.name} desmarcó «${updated.name}»`,
          metadata: {
            listName: existing.list.name,
            itemName: updated.name,
          },
        });
      } else {
        await recordActivity({
          tx,
          userId: req.user.id,
          action: ACTIONS.SHOPPING_ITEM_UPDATED,
          entityType: "SHOPPING",
          entityId: updated.id,
          description: `${req.user.name} editó «${updated.name}» en la lista «${existing.list.name}»`,
          metadata: {
            listName: existing.list.name,
            itemName: updated.name,
          },
        });
      }

      return updated;
    });

    res.json({ item: serializeShoppingItem(item) });
  })
);

router.delete(
  "/items/:id",
  asyncHandler(async (req, res) => {
    const existing = await prisma.shoppingItem.findUnique({
      where: { id: req.params.id },
      include: { list: true },
    });

    if (!existing) {
      throw new AppError("El producto no existe", 404);
    }

    if (existing.list.status !== "ACTIVE") {
      throw new AppError("La lista ya está cerrada", 409);
    }

    await prisma.$transaction(async (tx) => {
      await tx.shoppingItem.delete({ where: { id: existing.id } });

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.SHOPPING_ITEM_DELETED,
        entityType: "SHOPPING",
        entityId: existing.id,
        description: `${req.user.name} quitó «${existing.name}» de la lista «${existing.list.name}»`,
        metadata: {
          listName: existing.list.name,
          itemName: existing.name,
        },
      });
    });

    res.status(204).end();
  })
);

router.post(
  "/lists/:id/close",
  asyncHandler(async (req, res) => {
    const list = await findListOrThrow(req.params.id);

    if (list.status === "CLOSED") {
      return res.json({ list: serializeShoppingList(list) });
    }

    const closedList = await prisma.$transaction(async (tx) => {
      const updated = await tx.shoppingList.update({
        where: { id: list.id },
        data: {
          status: "CLOSED",
          closedById: req.user.id,
          closedAt: new Date(),
        },
        include: listInclude,
      });

      const purchasedCount = updated.items.filter((item) => item.purchased).length;

      await recordActivity({
        tx,
        userId: req.user.id,
        action: ACTIONS.SHOPPING_LIST_CLOSED,
        entityType: "SHOPPING",
        entityId: updated.id,
        description: `${req.user.name} cerró la lista «${updated.name}»`,
        metadata: {
          listName: updated.name,
          itemCount: updated.items.length,
          purchasedCount,
        },
      });

      return updated;
    });

    res.json({ list: serializeShoppingList(closedList) });
  })
);

module.exports = router;
