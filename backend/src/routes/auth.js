const { Router } = require("express");
const bcrypt = require("bcryptjs");
const rateLimit = require("express-rate-limit");
const { z } = require("zod");
const { config } = require("../config/env");
const { prisma } = require("../lib/prisma");
const { AppError } = require("../lib/app-error");
const { asyncHandler } = require("../lib/async-handler");
const { parse } = require("../lib/validate");
const { issueToken } = require("../lib/token");
const { requireAuth } = require("../middleware/auth");

const router = Router();

const loginLimiter = rateLimit({
  windowMs: config.loginRateWindowMinutes * 60 * 1000,
  limit: config.loginRateLimit,
  standardHeaders: "draft-7",
  legacyHeaders: false,
  skipSuccessfulRequests: true,
  handler: (req, res) => {
    res.status(429).json({
      error: {
        message:
          "Demasiados intentos de inicio de sesión. Espera unos minutos y vuelve a intentarlo.",
      },
    });
  },
});

const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .email("Introduce un email válido")
    .max(200)
    .transform((value) => value.toLowerCase()),
  password: z.string().min(1, "Introduce tu contraseña").max(200),
  remember: z.boolean().optional().default(false),
});

// Hash de comparación para mantener un tiempo de respuesta similar
// cuando el email no existe (evita enumerar usuarios).
const dummyHash = bcrypt.hashSync("cubito-timing-dummy-password", 12);

router.post(
  "/login",
  loginLimiter,
  asyncHandler(async (req, res) => {
    const { email, password, remember } = parse(
      loginSchema,
      req.body,
      "Revisa tus credenciales"
    );

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      await bcrypt.compare(password, dummyHash);
      throw new AppError("Email o contraseña incorrectos", 401);
    }

    const passwordMatches = await bcrypt.compare(password, user.passwordHash);

    if (!passwordMatches) {
      throw new AppError("Email o contraseña incorrectos", 401);
    }

    const { token, expiresIn } = issueToken(user, remember);

    res.set("Cache-Control", "no-store");
    res.json({
      token,
      expiresIn,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
      },
    });
  })
);

router.get(
  "/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    res.set("Cache-Control", "no-store");
    res.json({
      user: {
        id: req.user.id,
        name: req.user.name,
        email: req.user.email,
      },
    });
  })
);

router.post("/logout", requireAuth, (req, res) => {
  // El JWT es stateless: el cliente elimina el token.
  res.status(204).end();
});

module.exports = router;
