const express = require("express");

const router = express.Router();


const auth =
require("../middleware/auth");


const permissao =
require("../middleware/permissao");


const empresaController =
require("../controllers/empresaController");



// ======================================
// ROTAS EMPRESA
// ======================================


router.get(
"/me",
auth,
permissao("empresa"),
empresaController.me
);



router.put(
"/me",
auth,
permissao("empresa"),
empresaController.atualizar
);



module.exports = router;