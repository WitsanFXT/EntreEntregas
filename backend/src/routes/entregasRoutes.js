const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const permissao = require("../middleware/permissao");

// ============================================
// CONTROLLER DE ENTREGAS
// src/controllers/entregasController.js
// ============================================

const {
  criarEntrega,
  listarEntregasEmpresa,
  listarEntregasEntregador,
  listarMinhasEntregas,
  dashboardEntregador,
  aceitarEntrega,
  recusarEntrega,
  retirarEntrega,
  finalizarEntrega,
} = require("../controllers/entregasController");

// ============================================
// CONTROLLER ENTREGADOR
// src/controllers/entregadorController.js
// ============================================

const { confirmarEntrega } = require("../controllers/entregadorController");

// =====================================================
// EMPRESA CRIA ENTREGA
// POST /api/entregas
// =====================================================

router.post("/", auth, permissao("empresa"), criarEntrega);

// =====================================================
// EMPRESA LISTA SUAS ENTREGAS
// GET /api/entregas/empresa
// =====================================================

router.get("/empresa", auth, permissao("empresa"), listarEntregasEmpresa);

// =====================================================
// ENTREGADOR BUSCA ENTREGAS DISPONÍVEIS
// GET /api/entregas/disponiveis
// =====================================================

router.get(
  "/disponiveis",
  auth,
  permissao("entregador"),
  listarEntregasEntregador,
);

// =====================================================
// ENTREGADOR ACEITA ENTREGA
// PUT /api/entregas/:id/aceitar
// =====================================================

router.put("/:id/aceitar", auth, permissao("entregador"), aceitarEntrega);

// =====================================================
// ENTREGADOR RETIRA PEDIDO NA EMPRESA
//
// Fluxo:
// aceita
// ↓
// cozinha entrega pedido
// ↓
// muda para em_rota
//
// O código NÃO é digitado pelo entregador.
// Ele apenas informa presencialmente.
// =====================================================

router.put("/:id/retirar", auth, permissao("entregador"), retirarEntrega);

// =====================================================
// CLIENTE CONFIRMA ENTREGA
//
// Fluxo:
// em_rota
// ↓
// cliente informa código
// ↓
// entregue
//
// Código digitado aqui.
// =====================================================

router.post(
  "/:id/confirmar-entrega",
  auth,
  permissao("entregador"),
  confirmarEntrega,
);

// =====================================================
// FINALIZAR ENTREGA
// (administrativo/manual)
// =====================================================

router.put("/:id/finalizar", auth, permissao("entregador"), finalizarEntrega);

// =====================================================
// RECUSAR ENTREGA
// =====================================================

router.put("/:id/recusar", auth, permissao("entregador"), recusarEntrega);

// =====================================================
// MINHAS ENTREGAS
// =====================================================

router.get("/minhas", auth, permissao("entregador"), listarMinhasEntregas);

// =====================================================
// DASHBOARD ENTREGADOR
// =====================================================

router.get("/dashboard", auth, permissao("entregador"), dashboardEntregador);

module.exports = router;
