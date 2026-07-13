const express = require("express");

const router = express.Router();

const auth =
    require("../middleware/auth");

const permissao =
    require("../middleware/permissao");



// ======================================
// TESTE PERFIL LOGADO
// ======================================

router.get(
    "/",
    auth,
    (req,res)=>{


        res.json({

            message:
            "Usuário autenticado com sucesso.",


            usuario:{

                id:
                req.usuario.id,


                tipo:
                req.usuario.tipo

            }

        });


    }

);



// ======================================
// ROTA SOMENTE CLIENTE
// ======================================

router.get(
    "/cliente",

    auth,

    permissao("cliente"),

    (req,res)=>{


        res.json({

            message:
            "Área do cliente liberada."

        });


    }

);




// ======================================
// ROTA SOMENTE EMPRESA
// ======================================

router.get(
    "/empresa",

    auth,

    permissao("empresa"),

    (req,res)=>{


        res.json({

            message:
            "Área da empresa liberada."

        });


    }

);




// ======================================
// ROTA SOMENTE ENTREGADOR
// ======================================

router.get(
    "/entregador",

    auth,

    permissao("entregador"),

    (req,res)=>{


        res.json({

            message:
            "Área do entregador liberada."

        });


    }

);



module.exports = router;