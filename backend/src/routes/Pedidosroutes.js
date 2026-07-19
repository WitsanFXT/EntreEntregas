const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");
const permissao = require("../middleware/permissao");
const pedidosController = require("../controllers/PedidosController");

router.post("/", auth, permissao("empresa"), pedidosController.criarPedido);

router.get("/", auth, permissao("empresa"), pedidosController.listarPedidos);

router.patch(
  "/:id/status",
  auth,
  permissao("empresa"),
  pedidosController.atualizarStatusPedido,
);

router.get(
  "/dashboard-kpis",
  auth,
  permissao("empresa"),
  pedidosController.dashboardKpis,
);

module.exports = router;
