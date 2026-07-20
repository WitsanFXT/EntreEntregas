const express = require("express");
const router = express.Router();
const publicRoutes = require("./routes/publicoRoutes"); // 🔥 NOME CORRETO (com p minúsculo)
const supabase = require("../config/supabase");

// Rota do cardápio
router.get("/empresas/:empresaId/cardapio", publicoController.buscarCardapio);

// Rota: Listar todas as empresas (lojas)
router.get("/empresas", async (req, res) => {
  try {
    console.log("📡 Buscando todas as empresas...");

    const { data, error } = await supabase
      .from("empresas")
      .select(
        "id, nome_fantasia, categoria, logo_url, banner_url, bairro, cidade, ativo",
      )
      .eq("ativo", true)
      .order("nome_fantasia", { ascending: true });

    if (error) {
      console.error("❌ Erro ao buscar empresas:", error);
      return res.status(500).json({
        message: "Erro ao buscar empresas",
        error: error.message,
      });
    }

    console.log(`✅ ${data?.length || 0} empresas encontradas`);
    res.json(data || []);
  } catch (error) {
    console.error("❌ Erro ao listar empresas:", error);
    res.status(500).json({
      message: "Erro ao listar empresas",
      error: error.message,
    });
  }
});

// Rota pública para tabela de preços
router.get("/tabela-precos", async (req, res) => {
  try {
    const { data, error } = await supabase
      .from("tabela_precos")
      .select("*")
      .order("bairro");

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    res.json(data || []);
  } catch (error) {
    console.error("Erro ao buscar tabela de preços:", error);
    res.status(500).json({ error: "Erro ao buscar tabela de preços" });
  }
});

module.exports = router;
