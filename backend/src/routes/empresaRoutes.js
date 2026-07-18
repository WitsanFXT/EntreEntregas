const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const permissao = require("../middleware/permissao");
const empresaController = require("../controllers/empresaController");

// ======================================
// ROTAS EMPRESA
// ======================================

router.get("/me", auth, permissao("empresa"), empresaController.me);

router.put("/me", auth, permissao("empresa"), empresaController.atualizar);

// --------------------------------------
// Fluxo "sem entregador" — estavam faltando,
// por isso o front recebia 404 nessas 3 rotas.
// --------------------------------------

router.post(
  "/entrega/:id/tentar-novamente",
  auth,
  permissao("empresa"),
  empresaController.tentarNovamente,
);

router.post(
  "/entrega/:id/cancelar",
  auth,
  permissao("empresa"),
  empresaController.cancelarEntrega,
);

router.post(
  "/entrega/:id/externo",
  auth,
  permissao("empresa"),
  empresaController.marcarExterno,
);

module.exports = router;
