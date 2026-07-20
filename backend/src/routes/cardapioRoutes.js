const express = require("express");
const router = express.Router();
const auth = require("../middleware/auth");
const categoriaController = require("../controllers/categoriaController");
const produtoController = require("../controllers/produtoController");

// ======================================
// MIDDLEWARE PARA OBTER EMPRESA_ID (se não veio do auth)
// ======================================

const obterEmpresaId = async (req, res, next) => {
  try {
    // Se já tiver no req (veio do auth), usa
    if (req.empresaId) {
      return next();
    }

    // Se tiver no decoded, usa
    if (req.decodificado?.empresa_id) {
      req.empresaId = req.decodificado.empresa_id;
      return next();
    }

    // Se não, busca do banco
    const supabase = require("../config/supabase");
    const { data: empresa, error } = await supabase
      .from("empresas")
      .select("id")
      .eq("usuario_id", req.usuario.id)
      .single();

    if (error || !empresa) {
      return res.status(404).json({
        message: "Empresa não encontrada",
      });
    }

    req.empresaId = empresa.id;
    next();
  } catch (error) {
    console.error("❌ Erro ao obter empresa:", error);
    res.status(500).json({
      message: "Erro ao obter empresa",
    });
  }
};

// ======================================
// ROTAS DE CATEGORIAS
// ======================================

router.post("/categorias", auth, obterEmpresaId, categoriaController.criar);
router.get("/categorias", auth, obterEmpresaId, categoriaController.listar);
router.put("/categorias/:id", auth, categoriaController.atualizar);
router.delete("/categorias/:id", auth, categoriaController.excluir);

// ======================================
// ROTAS DE PRODUTOS
// ======================================

router.post("/produtos", auth, obterEmpresaId, produtoController.criar);
router.get("/produtos", auth, obterEmpresaId, produtoController.listar);
router.put("/produtos/:id", auth, produtoController.atualizar);
router.delete("/produtos/:id", auth, produtoController.excluir);

module.exports = router;
