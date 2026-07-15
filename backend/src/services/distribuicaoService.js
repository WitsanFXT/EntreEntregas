const supabase =
require("../config/supabase");



const calcularDistancia = require("./distanciaService");





// =====================================
// DISTRIBUIR ENTREGA
// =====================================


async function distribuirEntrega(entregaId){


try{


// buscar entrega


const {data:entrega,error}=

await supabase

.from("entregas")

.select("*")

.eq(
"id",
entregaId
)

.single();




if(error || !entrega){

console.log(
"Entrega não encontrada"
);

return;

}







// buscar entregadores online


const {data:entregadores}=

await supabase

.from("entregadores")

.select("*")

.eq(
"online",
true
)







if(!entregadores || entregadores.length===0){


console.log(
"Nenhum entregador online"
);


return;

}







// calcular distancia


const candidatos = entregadores.map(entregador=>{


const distancia =

calcularDistancia(

entrega.latitude,

entrega.longitude,

entregador.latitude,

entregador.longitude

);



return {

...entregador,

distancia

};


});







// ordenar pelo mais perto


candidatos.sort(

(a,b)=>

a.distancia-b.distancia

);






const entregadorEscolhido =
candidatos[0];






// atualizar entrega


await supabase

.from("entregas")

.update({

entregador_id:
entregadorEscolhido.id,

})

.eq(

"id",

entregaId

);






console.log(

"Entrega enviada para:",

entregadorEscolhido.id

);




return entregadorEscolhido;



}catch(error){


console.log(error);


}


}





module.exports =
distribuirEntrega;