const express = require("express");

const router = express.Router();

const auth = require("../middleware/auth");

const categoriaController = require("../controllers/categoriaController");

const produtoController = require("../controllers/produtoController");

router.post("/categorias", auth, categoriaController.criarCategoria);

router.get("/categorias", auth, categoriaController.listarCategorias);

router.put("/categorias/:id", auth, categoriaController.editarCategoria);

router.delete("/categorias/:id", auth, categoriaController.excluirCategoria);

router.post("/produtos", auth, produtoController.criarProduto);

router.get("/produtos", auth, produtoController.listarProdutos);

router.put("/produtos/:id", auth, produtoController.editarProduto);

router.delete("/produtos/:id", auth, produtoController.excluirProduto);

module.exports = router;
