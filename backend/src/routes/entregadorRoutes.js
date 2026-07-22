const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const permissao = require("../middleware/permissao");

const entregadorController = require("../controllers/entregadorController");

const {
  confirmarRetirada,
  confirmarEntrega,
  iniciarRota,
} = require("../controllers/entregadorController");

const {
  online,
  offline,
  localizacao,
  me,
  minhasEntregas,
  aceitarEntrega,
} = require("../controllers/entregadorController");

router.post("/:id/aceitar", auth, permissao("entregador"), aceitarEntrega);

// ============================
// FICAR ONLINE
// ============================

router.post("/online", auth, permissao("entregador"), online);

// ============================
// FICAR OFFLINE
// ============================

router.post("/offline", auth, permissao("entregador"), offline);

//===============================
//ROTA CODIGOS DE CONFIRMAÇÃO
//===============================

router.post(
  "/entrega/:id/confirmar-retirada",
  auth,
  permissao("entregador"),
  confirmarRetirada,
);

router.post(
  "/entrega/:id/confirmar-entrega",
  auth,
  permissao("entregador"),
  confirmarEntrega,
);

router.post(
  "/entrega/:id/iniciar-rota",
  auth,
  permissao("entregador"),
  iniciarRota,
);

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
