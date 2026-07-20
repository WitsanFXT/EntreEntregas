const express = require("express");

const router = express.Router();

// Rotas públicas — de propósito SEM o middleware "auth".
// Quem chama aqui é o app do cliente final, que não tem login de
// parceiro nem token JWT de empresa.
const publicoController = require("../controllers/publicoController");

router.get("/empresas/:empresaId/cardapio", publicoController.buscarCardapio);

router.get(
  "/empresas/:empresaId/tabela-precos",
  publicoController.listarTabelaPrecos,
);

router.post("/empresas/:empresaId/pedidos", publicoController.criarPedido);

module.exports = router;
