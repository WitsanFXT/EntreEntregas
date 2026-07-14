const express =
require("express");

const router =
express.Router();

const auth =
require("../middleware/auth");

const permissao =
require("../middleware/permissao");

const {

resumo,
extrato

} = require("../controllers/financeiroController");



router.get(

"/resumo",

auth,

permissao("entregador"),

resumo

);



router.get(

"/extrato",

auth,

permissao("entregador"),

extrato

);



module.exports = router;