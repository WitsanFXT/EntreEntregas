const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const permissao = require("../middleware/permissao");

const entregadorController = require("../controllers/entregadorController");

const {
  online,
  offline,
  localizacao,
  me,
  minhasEntregas,
} = require("../controllers/entregadorController");

// ============================
// FICAR ONLINE
// ============================

router.post("/online", auth, permissao("entregador"), online);

// ============================
// FICAR OFFLINE
// ============================

router.post("/offline", auth, permissao("entregador"), offline);

// ============================
// LOCALIZAÇÃO
// ============================

router.put("/localizacao", auth, permissao("entregador"), localizacao);

// ============================
// PERFIL ENTREGADOR
// ============================

router.get("/me", auth, permissao("entregador"), me);

router.get("/minhas-entregas", auth, permissao("entregador"), minhasEntregas);

router.get("/token-realtime", auth, entregadorController.tokenRealtime);

module.exports = router;
