const API = "http://localhost:3001";

const token = localStorage.getItem("token");


if(!token){

    window.location.href="../login/login.html";

}



const usuario =
JSON.parse(
    localStorage.getItem("usuario")
);



const headers = {

    "Authorization":
    `Bearer ${token}`

};



// =======================
// MAPA
// =======================


let mapa;

let marcador;



function iniciarMapa(){


    mapa =
    L.map("mapa")
    .setView(
        [-16.359,-46.906],
        15
    );



    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            attribution:
            "&copy; OpenStreetMap"

        }

    ).addTo(mapa);



}






function atualizarMapa(latitude,longitude){


    if(!mapa){

        return;

    }



    const posicao = [

        Number(latitude),

        Number(longitude)

    ];



    if(!marcador){


        marcador =

        L.marker(posicao)

        .addTo(mapa)

        .bindPopup(
            "🚴 Você está aqui"
        )

        .openPopup();


    }

    else{


        marcador
        .setLatLng(posicao);


    }



    mapa
    .setView(
        posicao,
        16
    );


}







// =======================
// PERFIL
// =======================


async function carregarPerfil(){


try{


    const response =

    await fetch(

        `${API}/api/entregador/me`,

        {

            headers

        }

    );



    const data =
    await response.json();



    document
    .getElementById("nomeUsuario")
    .innerHTML =
    data.nome || "Entregador";



    document
    .getElementById("veiculo")
    .innerHTML =
    data.tipo_veiculo || "-";



    document
    .getElementById("placa")
    .innerHTML =
    data.placa || "-";



    atualizarStatus(
        data.online
    );



    if(data.latitude && data.longitude){


        atualizarMapa(

            data.latitude,

            data.longitude

        );


    }



}catch(error){


    console.log(error);


}


}








// =======================
// STATUS
// =======================


function atualizarStatus(online){


    document
    .getElementById("status")
    .innerHTML =


    online

    ?

    "🟢 Online"

    :

    "🔴 Offline";


}







// =======================
// ONLINE
// =======================


document
.getElementById("btnOnline")
.onclick = async()=>{


try{


const response =

await fetch(

`${API}/api/entregador/online`,

{

method:"POST",

headers

}

);



const data =
await response.json();



if(response.ok){

    atualizarStatus(true);

}



alert(data.message);



}catch(error){

console.log(error);

}


};








// =======================
// OFFLINE
// =======================


document
.getElementById("btnOffline")
.onclick = async()=>{


try{


const response =

await fetch(

`${API}/api/entregador/offline`,

{

method:"POST",

headers

}

);



const data =
await response.json();



if(response.ok){

    atualizarStatus(false);

}



alert(data.message);



}catch(error){

console.log(error);

}


};








// =======================
// ENTREGAS DISPONÍVEIS
// =======================


async function carregarEntregas(){


try{


const response =

await fetch(

`${API}/api/entregas/disponiveis`,

{

headers

}

);



const entregas =
await response.json();



const container =

document.getElementById("entregas");



container.innerHTML="";




if(!entregas.length){


container.innerHTML =

`
<p>
Nenhuma entrega disponível.
</p>
`;


return;


}




entregas.forEach(entrega=>{


const div =
document.createElement("div");


div.className =
"entrega-card";



div.innerHTML =

`

<h3>
📦 Entrega
</h3>


<p>
Cliente:
${entrega.cliente_nome}
</p>


<p>
📍 ${entrega.endereco}
</p>


<p>
Bairro:
${entrega.bairro}
</p>


<p>
${entrega.descricao || ""}
</p>



<button onclick="aceitarEntrega('${entrega.id}')">

Aceitar entrega

</button>


`;



container.appendChild(div);



});



}catch(error){


console.log(error);


}



}








// =======================
// ACEITAR ENTREGA
// =======================


async function aceitarEntrega(id){


try{


const response =

await fetch(

`${API}/api/entregas/${id}/aceitar`,

{

method:"PUT",

headers

}

);



const data =
await response.json();



alert(data.message);



carregarEntregas();



}catch(error){


console.log(error);


}



}









// =======================
// GPS
// =======================


let watchId;



function iniciarGPS(){



if(!navigator.geolocation){


alert(
"GPS não disponível"
);


return;


}





watchId =

navigator.geolocation.watchPosition(

async(pos)=>{


const latitude =
pos.coords.latitude;


const longitude =
pos.coords.longitude;



const precisao =
pos.coords.accuracy;



document
.getElementById("localizacao")
.innerHTML =

`

Latitude:
${latitude}

<br>

Longitude:
${longitude}

<br>

Precisão:
${Math.round(precisao)} metros

`;




// envia para backend

if(precisao <=100){



await fetch(

`${API}/api/entregador/localizacao`,

{

method:"PUT",

headers:{

...headers,

"Content-Type":
"application/json"

},


body:JSON.stringify({

latitude,

longitude

})


}

);



}




atualizarMapa(

latitude,

longitude

);



},


(error)=>{


console.log(
"Erro GPS",
error
);


},


{

enableHighAccuracy:true,

timeout:15000,

maximumAge:0

}


);



}







// =======================
// LOGOUT
// =======================


document
.getElementById("logout")
.onclick = ()=>{


localStorage.removeItem("token");


localStorage.removeItem("usuario");


window.location.href =
"../login/login.html";


};









// =======================
// INICIAR SISTEMA
// =======================
iniciarMapa();

carregarPerfil();

carregarEntregas();

iniciarGPS();


// atualizar entregas automaticamente

setInterval(()=>{

    carregarEntregas();

},5000);