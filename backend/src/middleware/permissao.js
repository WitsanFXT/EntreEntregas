module.exports = (...tiposPermitidos)=>{


    return (req,res,next)=>{


        if(!req.usuario){

            return res.status(401).json({

                message:
                "Usuário não autenticado."

            });

        }



        if(
            !tiposPermitidos.includes(
                req.usuario.tipo
            )
        ){

            return res.status(403).json({

                message:
                "Sem permissão para acessar essa área."

            });

        }



        next();


    };


};