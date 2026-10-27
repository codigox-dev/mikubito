const path = require("path");
const dotenv = require("dotenv");

dotenv.config({ path: path.resolve(__dirname, "../../.env") });

function required(name, fallback) {
  const value = process.env[name] || fallback;

  if (!value) {
    throw new Error(`Falta la variable de entorno ${name}`);
  }

  return value;
}

const nodeEnv = process.env.NODE_ENV || "development";
const jwtSecret = required("JWT_SECRET");

if (nodeEnv === "production" && jwtSecret.length < 32) {
  throw new Error("JWT_SECRET debe tener al menos 32 caracteres en producción");
}

const corsOrigins = (process.env.CORS_ORIGINS || "http://localhost:3000")
  .split(",")
  .map((origin) => origin.trim().replace(/\/$/, ""))
  .filter(Boolean);

const config = {
  nodeEnv,
  isProduction: nodeEnv === "production",
  port: Number(process.env.PORT || 4000),
  databaseUrl: required("DATABASE_URL"),
  jwtSecret,
  jwtSessionExpiresIn: process.env.JWT_SESSION_EXPIRES_IN || "12h",
  jwtRememberExpiresIn: process.env.JWT_REMEMBER_EXPIRES_IN || "30d",
  corsOrigins,
  loginRateLimit: Number(process.env.LOGIN_RATE_LIMIT || 10),
  loginRateWindowMinutes: Number(process.env.LOGIN_RATE_WINDOW_MINUTES || 15),
};

module.exports = { config };
