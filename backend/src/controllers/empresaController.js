const supabase = require("../config/supabase");


// ======================================
// BUSCAR EMPRESA LOGADA
// GET /api/empresa/me
// ======================================

exports.me = async(req,res)=>{

    try{


        const usuarioId = req.usuario.id;



        const {data:empresa,error}=

            await supabase
            .from("empresas")
            .select("*")
            .eq("usuario_id",usuarioId)
            .single();



        if(error){

            return res.status(404).json({

                message:"Empresa não encontrada."

            });

        }



        return res.json(empresa);



    }catch(error){


        console.log(error);


        return res.status(500).json({

            message:"Erro interno."

        });


    }

};




// ======================================
// ATUALIZAR EMPRESA
// PUT /api/empresa/me
// ======================================

exports.atualizar = async(req,res)=>{


    try{


        const usuarioId = req.usuario.id;


        const {

            nome_fantasia,
            telefone_comercial,
            endereco,
            bairro,
            cidade,
            latitude,
            longitude,
            categoria

        } = req.body;




        const {data:empresa,error}=

            await supabase
            .from("empresas")
            .update({

                nome_fantasia,
                telefone_comercial,
                endereco,
                bairro,
                cidade,
                latitude,
                longitude,
                categoria

            })
            .eq(
                "usuario_id",
                usuarioId
            )
            .select()
            .single();





        if(error){

            console.log(error);


            return res.status(400).json({

                message:"Erro ao atualizar empresa."

            });

        }



        return res.json({

            message:
            "Empresa atualizada com sucesso.",


            empresa

        });



    }catch(error){


        console.log(error);


        return res.status(500).json({

            message:"Erro interno."

        });


    }


};