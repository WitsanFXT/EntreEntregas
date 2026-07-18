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

// Token-ponte pro Supabase Realtime (empresa só recebe as próprias entregas)
router.get(
  "/token-realtime",
  auth,
  permissao("empresa"),
  empresaController.tokenRealtime,
);

module.exports = router;
