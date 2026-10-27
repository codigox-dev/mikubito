const jwt = require("jsonwebtoken");
const { config } = require("../config/env");

const JWT_ISSUER = "cubito-api";
const JWT_AUDIENCE = "cubito-web";

function issueToken(user, remember = false) {
  const expiresIn = remember
    ? config.jwtRememberExpiresIn
    : config.jwtSessionExpiresIn;

  const token = jwt.sign(
    {
      sub: user.id,
      email: user.email,
      name: user.name,
    },
    config.jwtSecret,
    {
      expiresIn,
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    }
  );

  return { token, expiresIn };
}

function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret, {
    issuer: JWT_ISSUER,
    audience: JWT_AUDIENCE,
  });
}

module.exports = { issueToken, verifyToken };
