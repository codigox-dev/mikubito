const { ZodError } = require("zod");
const { Prisma } = require("@prisma/client");
const { config } = require("../config/env");
const { AppError } = require("../lib/app-error");

function notFound(req, res) {
  res.status(404).json({
    error: { message: `Ruta no encontrada: ${req.method} ${req.originalUrl}` },
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = error.status || 500;
  let message = error.message || "Ha ocurrido un error inesperado";
  let details = error.details;

  if (error instanceof ZodError) {
    status = 422;
    message = "Revisa los datos enviados";
    details = error.flatten();
  } else if (error.type === "entity.parse.failed") {
    status = 400;
    message = "El cuerpo de la petición no contiene JSON válido";
  } else if (error instanceof Prisma.PrismaClientKnownRequestError) {
    if (error.code === "P2002") {
      status = 409;
      message = "Ya existe un registro con esos datos";
      details = { fields: error.meta?.target };
    } else if (error.code === "P2025") {
      status = 404;
      message = "El registro que buscas no existe";
    } else {
      status = 500;
      message = "No se pudo completar la operación en la base de datos";
    }
  } else if (error instanceof Prisma.PrismaClientValidationError) {
    status = 422;
    message = "Los datos no coinciden con el modelo de la base de datos";
  }

  if (!error.isOperational && status >= 500) {
    console.error("[cubito-api]", error);
  }

  const payload = { error: { message } };

  if (details) {
    payload.error.details = details;
  }

  if (!config.isProduction && status >= 500) {
    payload.error.stack = error.stack;
  }

  res.status(status).json(payload);
}

module.exports = { notFound, errorHandler, AppError };
