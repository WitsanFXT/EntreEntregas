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



// BUSCAR VALOR DO BAIRRO

const {data:tabelaPreco,error:erroPreco} =

await supabase

.from("tabela_precos")

.select("valor")

.eq(
"bairro",
bairro
)

.single();

if(erroPreco || !tabelaPreco){

return res.status(400).json({

message:
"Valor de entrega não encontrado para esse bairro."

});

}






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

status:"pendente",

valor:
tabelaPreco.valor

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
"aceita",

aceita_em:
new Date()

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


exports.coletarEntrega = async(req,res)=>{

try{

const entregaId =
req.params.id;

const { data, error } =

await supabase

.from("entregas")

.update({

status:"coletada",

retirada_em:new Date()

})

.eq("id", entregaId)

.select()

.single();



if(error){

return res.status(400).json({

message:"Erro ao coletar entrega."

});

}

return res.json({

message:"Entrega coletada.",

entrega:data

});

}catch(error){

console.log(error);

return res.status(500).json({

message:"Erro interno."

});

}

};



exports.retirarEntrega = async (req,res)=>{

try{

const entregaId = req.params.id;

const { data,error } = await supabase

.from("entregas")

.update({

status:"retirada",

retirada_em:new Date()

})

.eq("id",entregaId)

.select()

.single();

if(error){

return res.status(400).json(error);

}

return res.json({

message:"Pedido retirado.",

entrega:data

});

}catch(error){

console.log(error);

return res.status(500).json({

message:"Erro interno"

});

}

};

exports.finalizarEntrega = async (req,res)=>{

try{

const entregaId = req.params.id;

const { data:entrega,error } = await supabase

.from("entregas")

.select("*")

.eq("id",entregaId)

.single();

if(error || !entrega){

return res.status(404).json({

message:"Entrega não encontrada"

});

}


if(entrega.status === "finalizada"){

return res.status(400).json({

message:"Entrega já foi finalizada."

});

}

const valorEntrega =
Number(entrega.valor || 0);


// FINALIZA ENTREGA

await supabase

.from("entregas")

.update({

status:"finalizada",

finalizada_em:new Date()

})

.eq(
"id",
entregaId
);


// CRIA O LANÇAMENTO FINANCEIRO

await supabase

.from("extrato_entregadores")

.insert({

entregador_id: entrega.entregador_id,

entrega_id: entrega.id,

valor: valorEntrega,

tipo:"credito",

bairro: entrega.bairro,

cliente_nome: entrega.cliente_nome,

descricao:
`Entrega ${entrega.bairro}`

});

const { data:entregador } = await supabase

.from("entregadores")

.select("saldo")

.eq("id",entrega.entregador_id)

.single();

await supabase

.from("entregadores")

.update({

saldo:
Number(entregador?.saldo || 0) + valorEntrega

})

.eq("id",entrega.entregador_id);

return res.json({

message:"Entrega finalizada.",

valor:
valorEntrega,

});

}catch(error){

console.log(error);

return res.status(500).json({

message:"Erro interno"

});

}

};