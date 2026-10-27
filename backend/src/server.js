const http = require("http");
const app = require("./app");
const { config } = require("./config/env");
const { prisma } = require("./lib/prisma");

const server = http.createServer(app);

server.listen(config.port, () => {
  console.log(`\n🏠 Cubito API escuchando en http://localhost:${config.port}`);
  console.log(`   Entorno: ${config.nodeEnv}`);
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  console.log(`\n${signal} recibido. Cerrando servidor...`);

  const forceExit = setTimeout(() => {
    console.error("Cierre forzado después de 10s");
    process.exit(1);
  }, 10000);

  forceExit.unref();

  server.close(async () => {
    try {
      await prisma.$disconnect();
      console.log("Servidor cerrado correctamente.");
      process.exit(0);
    } catch (error) {
      console.error("Error al cerrar la conexión con la base de datos:", error);
      process.exit(1);
    }
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("unhandledRejection", (reason) => {
  console.error("Promesa rechazada sin manejar:", reason);
});
