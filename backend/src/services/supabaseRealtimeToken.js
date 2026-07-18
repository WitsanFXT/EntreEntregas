const jwt = require("jsonwebtoken");

const SUPABASE_JWT_SECRET = process.env.SUPABASE_JWT_SECRET;

function gerarTokenRealtime(claims) {
  if (!SUPABASE_JWT_SECRET) {
    throw new Error("SUPABASE_JWT_SECRET não configurado.");
  }

  return jwt.sign(
    {
      role: "authenticated",
      ...claims,
    },
    SUPABASE_JWT_SECRET,
    {
      expiresIn: "12h",
    },

    console.log("SUPABASE JWT:", process.env.SUPABASE_JWT_SECRET),
  );
}

module.exports = {
  gerarTokenRealtime,
};
