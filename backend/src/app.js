const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const { config } = require("./config/env");
const { AppError } = require("./lib/app-error");
const { notFound, errorHandler } = require("./middleware/error-handler");

const authRoutes = require("./routes/auth");
const userRoutes = require("./routes/users");
const taskRoutes = require("./routes/tasks");
const financeRoutes = require("./routes/finance");
const tripRoutes = require("./routes/trips");
const shoppingRoutes = require("./routes/shopping");
const notificationRoutes = require("./routes/notifications");
const activityRoutes = require("./routes/activity");
const dashboardRoutes = require("./routes/dashboard");

const app = express();

app.disable("x-powered-by");
app.set("trust proxy", 1);

app.use(helmet());
app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);

      const normalized = origin.replace(/\/$/, "");
      const allowed =
        config.corsOrigins.includes("*") || config.corsOrigins.includes(normalized);

      if (allowed) return callback(null, true);

      return callback(new AppError("Origen no permitido por CORS", 403));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400,
  })
);
app.use(express.json({ limit: "1mb" }));

if (config.nodeEnv !== "test") {
  app.use(
    morgan(config.isProduction ? "combined" : "dev", {
      skip: (req) => req.path === "/health" || req.path === "/api/health",
    })
  );
}

app.get("/health", (req, res) => {
  res.json({ status: "ok", service: "cubito-api", timestamp: new Date().toISOString() });
});

app.get("/api/health", (req, res) => {
  res.json({ status: "ok", service: "cubito-api", timestamp: new Date().toISOString() });
});

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/finance", financeRoutes);
app.use("/api/trips", tripRoutes);
app.use("/api/shopping", shoppingRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/activity", activityRoutes);
app.use("/api/dashboard", dashboardRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
