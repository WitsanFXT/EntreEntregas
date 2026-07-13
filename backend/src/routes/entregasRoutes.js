const express = require("express");

const router = express.Router();


const auth =
require("../middleware/auth");


const permissao =
require("../middleware/permissao");



const {

criarEntrega,
listarEntregasEmpresa,
listarEntregasEntregador,
aceitarEntrega

} = require("../controllers/entregasController");







// ==================================
// EMPRESA CRIA ENTREGA
// POST /api/entregas
// ==================================

router.post(

"/",

auth,

permissao("empresa"),

criarEntrega

);






// ==================================
// EMPRESA LISTA ENTREGAS
// GET /api/entregas/empresa
// ==================================

router.get(

"/empresa",

auth,

permissao("empresa"),

listarEntregasEmpresa

);







// ==================================
// ENTREGADOR BUSCA DISPONÍVEIS
// GET /api/entregas/disponiveis
// ==================================

router.get(

"/disponiveis",

auth,

permissao("entregador"),

listarEntregasEntregador

);







 
// ==================================
// ENTREGADOR ACEITA ENTREGA
// PUT /api/entregas/:id/aceitar
// ==================================

router.put(

"/:id/aceitar",

auth,

permissao("entregador"),

aceitarEntrega

);



module.exports = router;