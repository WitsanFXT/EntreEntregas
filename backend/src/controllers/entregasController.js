const supabase =
require("../config/supabase");





// =====================================
// CRIAR ENTREGA
// =====================================

exports.criarEntrega = async(req,res)=>{


try{


const usuarioId =
req.usuario.id;



const {data:empresa,error:erroEmpresa}=

await supabase

.from("empresas")

.select("*")

.eq(
"usuario_id",
usuarioId
)

.single();





if(erroEmpresa || !empresa){


return res.status(404).json({

message:
"Empresa não encontrada."

});


}




const {

cliente_nome,

cliente_telefone,

endereco,

bairro,

cidade,

descricao,

latitude,

longitude

}=req.body;






const {data:entrega,error}=

await supabase

.from("entregas")

.insert({

empresa_id:empresa.id,

cliente_nome,

cliente_telefone,

endereco,

bairro,

cidade,

descricao,

latitude,

longitude,

status:"pendente"

})

.select()

.single();






if(error){


console.log(error);


return res.status(400).json(error);


}






return res.status(201).json({

message:
"Entrega criada com sucesso.",

entrega

});





}catch(error){


console.log(error);


return res.status(500).json({

message:
"Erro interno."

});


}


};









// =====================================
// LISTAR ENTREGAS EMPRESA
// =====================================

exports.listarEntregasEmpresa = async(req,res)=>{


try{


const usuarioId =
req.usuario.id;



const {data:empresa}=

await supabase

.from("empresas")

.select("id")

.eq(
"usuario_id",
usuarioId
)

.single();






const {data,error}=

await supabase

.from("entregas")

.select("*")

.eq(
"empresa_id",
empresa.id
)

.order(
"created_at",
{
ascending:false
}
);





if(error){

return res.status(400).json(error);

}



res.json(data);




}catch(error){


console.log(error);


res.status(500).json({

message:"Erro interno"

});


}


};









// =====================================
// ENTREGADOR VER DISPONÍVEIS
// =====================================

exports.listarEntregasEntregador = async(req,res)=>{


try{



const {data,error}=

await supabase

.from("entregas")

.select("*")

.eq(

"status",

"pendente"

)

.is(

"entregador_id",

null

);






if(error){

return res.status(400).json(error);

}





res.json(data);





}catch(error){


console.log(error);


res.status(500).json({

message:"Erro interno"

});


}


};









// =====================================
// ENTREGADOR ACEITA ENTREGA
// =====================================

exports.aceitarEntrega = async(req,res)=>{


try{


const entregaId =
req.params.id;


const usuarioId =
req.usuario.id;




// buscar entregador


const {data:entregador,error:erroEntregador}=

await supabase

.from("entregadores")

.select("id")

.eq(
"usuario_id",
usuarioId
)

.single();




if(erroEntregador || !entregador){


return res.status(404).json({

message:
"Entregador não encontrado."

});


}





// buscar entrega livre


const {data:entrega,error}=

await supabase

.from("entregas")

.select("*")

.eq(
"id",
entregaId
)

.eq(
"status",
"pendente"
)

.is(
"entregador_id",
null
)

.single();





if(error || !entrega){


return res.status(400).json({

message:
"Entrega indisponível."

});


}






// atualizar


const {data:atualizada,error:updateError}=

await supabase

.from("entregas")

.update({

entregador_id:
entregador.id,

status:
"aceita"

})

.eq(
"id",
entregaId
)

.select()

.single();





if(updateError){


console.log(updateError);


return res.status(400).json({

message:
"Erro ao aceitar entrega."

});


}




return res.json({

message:
"Entrega aceita com sucesso.",

entrega:
atualizada

});





}catch(error){


console.log(error);


res.status(500).json({

message:
"Erro interno."

});


}


};

// =====================================
// ENTREGADOR ACEITA ENTREGA
// PUT /api/entregas/:id/aceitar
// =====================================


exports.aceitarEntrega = async(req,res)=>{


try{


const usuarioId =
req.usuario.id;



// buscar entregador pelo usuario


const {data:entregador,error:erroEntregador}=

await supabase

.from("entregadores")

.select("*")

.eq(
"usuario_id",
usuarioId
)

.single();



if(erroEntregador || !entregador){


return res.status(404).json({

message:
"Entregador não encontrado."

});


}




const entregaId =
req.params.id;





// verificar se entrega está livre


const {data:entrega,error:erroEntrega}=

await supabase

.from("entregas")

.select("*")

.eq(
"id",
entregaId
)

.single();





if(erroEntrega || !entrega){


return res.status(404).json({

message:
"Entrega não encontrada."

});


}





if(
entrega.entregador_id
){


return res.status(400).json({

message:
"Entrega já foi aceita."

});


}






// assumir entrega


const {data,error}=

await supabase

.from("entregas")

.update({

entregador_id:
entregador.id,

status:
"aceita"

})

.eq(
"id",
entregaId
)

.select()

.single();






if(error){


console.log(error);


return res.status(400).json({

message:
"Erro ao aceitar entrega."

});


}




return res.json({

message:
"Entrega aceita com sucesso.",

entrega:data

});




}catch(error){


console.log(error);


return res.status(500).json({

message:
"Erro interno."

});


}



};

// =====================================
// ENTREGADOR ACEITA ENTREGA
// PUT /api/entregas/:id/aceitar
// =====================================


exports.aceitarEntrega = async(req,res)=>{


try{


const entregaId = req.params.id;


const usuarioId = req.usuario.id;



// buscar entregador


const {data:entregador,error:erroEntregador}=

await supabase

.from("entregadores")

.select("id")

.eq(
"usuario_id",
usuarioId
)

.single();



if(erroEntregador || !entregador){


return res.status(404).json({

message:
"Entregador não encontrado."

});


}





// assumir entrega


const {data,error}=

await supabase

.from("entregas")

.update({

entregador_id:
entregador.id,

status:
"aceita"

})

.eq(
"id",
entregaId
)

.is(
"entregador_id",
null
)

.select()

.single();





if(error){


console.log(error);


return res.status(400).json({

message:
"Erro ao aceitar entrega."

});


}





return res.json({

message:
"Entrega aceita com sucesso.",

entrega:data

});




}catch(error){


console.log(error);


res.status(500).json({

message:
"Erro interno."

});


}


};