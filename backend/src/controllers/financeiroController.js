const supabase =
require("../config/supabase");



// =====================================
// RESUMO FINANCEIRO
// =====================================

exports.resumo = async(req,res)=>{

try{

const usuarioId =
req.usuario.id;



const { data:entregador } =
await supabase

.from("entregadores")

.select("*")

.eq(
"usuario_id",
usuarioId
)

.single();



if(!entregador){

return res.status(404).json({

message:"Entregador não encontrado"

});

}



const hoje =
new Date();

hoje.setHours(0,0,0,0);



const semana =
new Date();

semana.setDate(
semana.getDate() - 7
);



const mes =
new Date();

mes.setDate(
mes.getDate() - 30
);



// HOJE

const { data:ganhosHoje } =
await supabase

.from("extrato_entregadores")

.select("valor")

.eq(
"entregador_id",
entregador.id
)

.gte(
"created_at",
hoje.toISOString()
);



// SEMANA

const { data:ganhosSemana } =
await supabase

.from("extrato_entregadores")

.select("valor")

.eq(
"entregador_id",
entregador.id
)

.gte(
"created_at",
semana.toISOString()
);



// MES

const { data:ganhosMes } =
await supabase

.from("extrato_entregadores")

.select("valor")

.eq(
"entregador_id",
entregador.id
)

.gte(
"created_at",
mes.toISOString()
);



const soma = arr =>

arr.reduce(

(total,item)=>

total + Number(item.valor),

0

);



return res.json({

hoje:
soma(ganhosHoje || []),

semana:
soma(ganhosSemana || []),

mes:
soma(ganhosMes || []),

saldo:
Number(entregador.saldo || 0)

});



}catch(error){

console.log(error);

return res.status(500).json({

message:"Erro interno"

});

}

};



// =====================================
// EXTRATO
// =====================================

exports.extrato = async(req,res)=>{

try{

const usuarioId =
req.usuario.id;



const { data:entregador } =
await supabase

.from("entregadores")

.select("id")

.eq(
"usuario_id",
usuarioId
)

.single();



const {
inicio,
fim,
periodo
}=req.query;



let query =

supabase

.from("extrato_entregadores")

.select(`
id,
valor,
descricao,
bairro,
cliente_nome,
tipo,
created_at
`)

.eq(
"entregador_id",
entregador.id
)

.order(
"created_at",
{
ascending:false
}
);


const agora = new Date();


if(periodo==="hoje"){

agora.setHours(0,0,0,0);

query =
query.gte(
"created_at",
agora.toISOString()
);

}



if(periodo==="30"){

const data30 =
new Date();

data30.setDate(
data30.getDate()-30
);


query =
query.gte(
"created_at",
data30.toISOString()
);

}

if(inicio){

query =
query.gte(
"created_at",
inicio
);

}



if(fim){

query =
query.lte(
"created_at",
fim
);

}



const { data,error } =
await query;



if(error){

return res.status(400).json(error);

}



return res.json(data);



}catch(error){

console.log(error);

return res.status(500).json({

message:"Erro interno"

});

}

};