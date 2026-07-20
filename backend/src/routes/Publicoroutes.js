const express = require("express");

const router = express.Router();

// Rotas públicas — de propósito SEM o middleware "auth".
// Quem chama aqui é o app do cliente final, que não tem login de
// parceiro nem token JWT de empresa.
const publicoController = require("../controllers/publicoController");

router.get("/empresas/:empresaId/cardapio", publicoController.buscarCardapio);

// 🔥 Rota pública para tabela de preços
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

router.get(
  "/empresas/:empresaId/tabela-precos",
  publicoController.listarTabelaPrecos,
);

router.post("/empresas/:empresaId/pedidos", publicoController.criarPedido);

module.exports = router;
