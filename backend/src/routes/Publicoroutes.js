const express = require("express");
const supabase = require("../config/supabase");

const router = express.Router();

// Rotas públicas — de propósito SEM o middleware "auth".
// Quem chama aqui é o app do cliente final, que não tem login de
// parceiro nem token JWT de empresa.
const publicoController = require("../controllers/publicoController");

router.get("/empresas/:empresaId/cardapio", publicoController.buscarCardapio);

router.get("/tabela-precos", async (req, res) => {
  try {
    console.log("📡 Buscando tabela de preços...");

    const { data, error } = await supabase
      .from("tabela_precos")
      .select("*")
      .order("bairro", { ascending: true });

    if (error) {
      console.error("❌ Erro Supabase:", error);
      return res.status(500).json({
        error: error.message,
        details: error.details,
      });
    }

    console.log(`✅ ${data?.length || 0} bairros carregados`);
    res.json(data || []);
  } catch (error) {
    console.error("❌ Erro ao buscar tabela de preços:", error);
    res.status(500).json({
      error: "Erro ao buscar tabela de preços",
      message: error.message,
    });
  }
});
router.get(
  "/empresas/:empresaId/tabela-precos",
  publicoController.listarTabelaPrecos,
);

router.post("/empresas/:empresaId/pedidos", publicoController.criarPedido);

module.exports = router;
