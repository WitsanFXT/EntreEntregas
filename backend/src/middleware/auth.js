const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const auth = req.headers.authorization;

  if (!auth) {
    return res.status(401).json({
      message: "Token não enviado.",
    });
  }

  const parts = auth.split(" ");

  if (parts.length !== 2) {
    return res.status(401).json({
      message: "Token inválido.",
    });
  }

  const token = parts[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    console.log("JWT DECODED:", decoded);

    req.usuario = decoded;

    next();
  } catch (error) {
    return res.status(401).json({
      message: "Token expirado ou inválido.",
    });
  }
};
