const { Router } = require("express");
const { prisma } = require("../lib/prisma");
const { asyncHandler } = require("../lib/async-handler");
const { requireAuth } = require("../middleware/auth");

const router = Router();

router.use(requireAuth);

router.get(
  "/",
  asyncHandler(async (req, res) => {
    const users = await prisma.user.findMany({
      orderBy: { name: "asc" },
      select: { id: true, name: true, email: true },
    });

    res.json({ users });
  })
);

module.exports = router;
