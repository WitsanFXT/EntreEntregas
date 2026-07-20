const jwt = require("jsonwebtoken");
const supabase = require("../config/supabase");

const autenticar = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader) {
      return res.status(401).json({
        message: "Token não enviado.",
        code: "MISSING_TOKEN",
      });
    }

    const parts = authHeader.split(" ");

    if (parts.length !== 2 || parts[0] !== "Bearer") {
      return res.status(401).json({
        message: "Token inválido.",
        code: "INVALID_TOKEN_FORMAT",
      });
    }

    const token = parts[1];
    let decoded;

    // 1. Tenta validar via JWT próprio
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
      console.log("JWT DECODED:", decoded);
    } catch (jwtError) {
      // 2. Fallback: Tenta validar via Supabase Auth
      try {
        const {
          data: { user },
          error,
        } = await supabase.auth.getUser(token);

        if (error || !user) {
          throw new Error("Token Supabase inválido");
        }

        req.usuario = user;
        req.decodificado = { id: user.id, tipo: "supabase" };
        return next();
      } catch (supabaseError) {
        return res.status(401).json({
          message: "Token expirado ou inválido.",
          code: "TOKEN_INVALID",
        });
      }
    }

    // 3. Se o JWT próprio for válido, busca os dados do usuário no banco
    const { data: usuario, error } = await supabase
      .from("usuarios")
      .select("*")
      .eq("id", decoded.id)
      .single();

    if (error || !usuario) {
      return res.status(401).json({
        message: "Usuário não encontrado.",
        code: "USER_NOT_FOUND",
      });
    }

    req.usuario = usuario;
    req.decodificado = decoded;

    // 🔥 NOVO: Se for empresa, busca o empresa_id
    if (usuario.tipo === "empresa") {
      const { data: empresa } = await supabase
        .from("empresas")
        .select("id")
        .eq("usuario_id", usuario.id)
        .single();

      if (empresa) {
        req.empresaId = empresa.id;
        req.decodificado.empresa_id = empresa.id;
        console.log("🏢 Empresa ID:", req.empresaId);
      }
    }

    next();
  } catch (error) {
    console.error("❌ Erro na autenticação:", error);
    return res.status(401).json({
      message: "Erro ao autenticar.",
      code: "AUTH_ERROR",
    });
  }
};

// Permite importar tanto com `require('./auth')` quanto `const { autenticar } = require('./auth')`
module.exports = autenticar;
module.exports.autenticar = autenticar;
