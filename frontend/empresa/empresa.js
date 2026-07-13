const API =
"http://localhost:3001";


const token =
localStorage.getItem("token");



if(!token){

window.location.href="../login/login.html";

}



const headers={

"Authorization":
`Bearer ${token}`,

"Content-Type":
"application/json"

};




// =================================
// PEGAR LOCALIZAÇÃO DA EMPRESA
// =================================


document
.getElementById("buscarLocalizacao")
.onclick = ()=>{


navigator.geolocation.getCurrentPosition(

(pos)=>{


document
.getElementById("latitude")
.value =
pos.coords.latitude;



document
.getElementById("longitude")
.value =
pos.coords.longitude;



alert(
"Localização capturada"
);



},

(error)=>{


alert(
"Erro ao pegar localização"
);


}

);


};







// =================================
// CRIAR ENTREGA
// =================================


document
.getElementById("btnCriarEntrega")
.onclick = async()=>{


const body={


cliente_nome:
document
.getElementById("cliente_nome")
.value,


cliente_telefone:
document
.getElementById("cliente_telefone")
.value,


endereco:
document
.getElementById("endereco")
.value,


bairro:
document
.getElementById("bairro")
.value,


cidade:
document
.getElementById("cidade")
.value,


descricao:
document
.getElementById("descricao")
.value,


latitude:
Number(
document
.getElementById("latitude")
.value
),


longitude:
Number(
document
.getElementById("longitude")
.value
)


};





const response =
await fetch(

`${API}/api/entregas`,

{

method:"POST",

headers,

body:
JSON.stringify(body)

}

);




const data =
await response.json();




console.log(data);



alert(
data.message
);



carregarEntregas();



};








// =================================
// LISTAR ENTREGAS
// =================================


async function carregarEntregas(){


const response =
await fetch(

`${API}/api/entregas/empresa`,

{

headers

}

);



const entregas =
await response.json();



const div =
document
.getElementById("listaEntregas");



div.innerHTML="";




if(!entregas.length){


div.innerHTML=
`
<p>
Nenhuma entrega.
</p>
`;


return;


}




entregas.forEach(entrega=>{


div.innerHTML +=

`

<div class="entrega">


<h4>

Cliente:
${entrega.cliente_nome}

</h4>



<p>
📍 ${entrega.endereco}
</p>


<p>
🏙️ ${entrega.bairro}
</p>



<p>
Status:
<strong>
${entrega.status}
</strong>
</p>


<p>
Latitude:
${entrega.latitude}
</p>


<p>
Longitude:
${entrega.longitude}
</p>



</div>

`;



});



}





carregarEntregas();