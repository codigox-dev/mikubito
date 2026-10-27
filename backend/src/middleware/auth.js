const { AppError } = require("../lib/app-error");
const { prisma } = require("../lib/prisma");
const { verifyToken } = require("../lib/token");

async function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return next(new AppError("No has iniciado sesión", 401));
  }

  try {
    const payload = verifyToken(token);

    if (!payload.sub) {
      throw new Error("Token sin usuario");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: { id: true, name: true, email: true, createdAt: true },
    });

    if (!user) {
      return next(new AppError("La sesión ya no es válida", 401));
    }

    req.user = user;
    req.auth = payload;
    return next();
  } catch (error) {
    return next(new AppError("Tu sesión ha caducado. Vuelve a iniciar sesión.", 401));
  }
}

module.exports = { requireAuth };
