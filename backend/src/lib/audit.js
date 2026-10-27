const { prisma } = require("./prisma");

async function recordActivity({
  userId,
  action,
  entityType,
  entityId = null,
  description,
  metadata = null,
  tx,
}) {
  const client = tx || prisma;

  return client.activityLog.create({
    data: {
      userId,
      action,
      entityType,
      entityId,
      description,
      metadata,
    },
  });
}

module.exports = { recordActivity };
