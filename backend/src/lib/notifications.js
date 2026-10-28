const ASSIGNEE_KEYS = Object.freeze({
  ALEX: ["ALEX"],
  SANDRA: ["SANDRA"],
  BOTH: ["ALEX", "SANDRA"],
});

const NOTIFICATION_TYPES = Object.freeze({
  TASK_ASSIGNED: "TASK_ASSIGNED",
  SHOPPING_ITEM_ADDED: "SHOPPING_ITEM_ADDED",
  SHOPPING_LIST_CLOSED: "SHOPPING_LIST_CLOSED",
});

/**
 * Crea una notificación para cada destinatario, sin duplicados.
 * Se ejecuta dentro de la misma transacción que la acción original.
 */
async function notifyUsers({
  tx,
  userIds,
  type,
  title,
  body = null,
  entityType = null,
  entityId = null,
}) {
  const recipients = [...new Set(userIds.filter(Boolean))];

  if (recipients.length === 0) return { count: 0 };

  return tx.notification.createMany({
    data: recipients.map((userId) => ({
      userId,
      type,
      title,
      body,
      entityType,
      entityId,
    })),
  });
}

/** Notifica a los miembros indicados, excluyendo siempre al autor de la acción. */
async function notifyMembers({
  tx,
  keys,
  actorId,
  type,
  title,
  body = null,
  entityType = null,
  entityId = null,
}) {
  const wanted = [...new Set(keys)].filter(Boolean);

  if (wanted.length === 0) return { count: 0 };

  const users = await tx.user.findMany({
    where: {
      assigneeKey: { in: wanted },
      id: { not: actorId },
    },
    select: { id: true },
  });

  return notifyUsers({
    tx,
    userIds: users.map((user) => user.id),
    type,
    title,
    body,
    entityType,
    entityId,
  });
}

/** Notifica al resto del hogar (todas las cuentas menos el autor). */
async function notifyHousehold({
  tx,
  actorId,
  type,
  title,
  body = null,
  entityType = null,
  entityId = null,
}) {
  const users = await tx.user.findMany({
    where: { id: { not: actorId } },
    select: { id: true },
  });

  return notifyUsers({
    tx,
    userIds: users.map((user) => user.id),
    type,
    title,
    body,
    entityType,
    entityId,
  });
}

module.exports = {
  ASSIGNEE_KEYS,
  NOTIFICATION_TYPES,
  notifyUsers,
  notifyMembers,
  notifyHousehold,
};
