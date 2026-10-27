const { AppError } = require("./app-error");

function parse(schema, data, message = "Revisa los datos enviados") {
  const result = schema.safeParse(data);

  if (!result.success) {
    throw new AppError(message, 422, result.error.flatten());
  }

  return result.data;
}

module.exports = { parse };
