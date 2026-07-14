const API = "http://localhost:3001";

const token = localStorage.getItem("token");

let ultimaLista = [];

let ultimoPedidoNotificado = null;

let rotaAtual = null;

let ultimaQuantidade = 0;

let entregaAtual = null;

let contadorInterval = null;

const somNovaEntrega =
new Audio("../assets/nova-entrega.mp3");

somNovaEntrega.volume = 1;

let alertaSonoro = null;

function iniciarAlertaEntrega(){

    somNovaEntrega.currentTime = 0;

    somNovaEntrega.play()
    .catch(()=>{});

    alertaSonoro = setInterval(() => {

        somNovaEntrega.currentTime = 0;

        somNovaEntrega.play()
        .catch(()=>{});

    }, 3000);


    setTimeout(() => {

        pararAlertaEntrega();

    }, 30000);

}



function pararAlertaEntrega(){

    if(alertaSonoro){

        clearInterval(alertaSonoro);

        alertaSonoro = null;

    }

}


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

let linhaRota = null;


// ícone customizado: pontinho pulsante estilo "localização ao vivo"
const gpsIcon = L.divIcon({

    className: "gps-marker",

    html: `
        <div class="gps-marker-pulse"></div>
        <div class="gps-marker-dot"></div>
    `,

    iconSize: [22, 22],

    iconAnchor: [11, 11]

});



function iniciarMapa(){


    mapa =
    L.map("mapa", {

        zoomControl: false

    })
    .setView(
        [-16.359,-46.906],
        15
    );



    L.tileLayer(
        "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
        {

            attribution:
            "&copy; OpenStreetMap",

            maxZoom: 19

        }

    ).addTo(mapa);


    // zoom reposicionado, estilo app de entrega (canto inferior direito)
    L.control.zoom({

        position: "bottomright"

    }).addTo(mapa);



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

        L.marker(posicao, {

            icon: gpsIcon

        })

        .addTo(mapa)

        .bindPopup(
            "🚴 Você está aqui",
            {

                className: "popup-entregador",

                closeButton: false

            }
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

function desenharRota(origem,destino){

    if(rotaAtual){

        mapa.removeLayer(rotaAtual);

    }

    rotaAtual = L.polyline(
        [
            origem,
            destino
        ]
    ).addTo(mapa);

}
if(rotaAtual){

    mapa.removeLayer(rotaAtual);

    rotaAtual = null;

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



const entregas = await response.json();

const idsAtuais =
entregas.map(e => e.id);

const existemNovas =

idsAtuais.some(
    id => !ultimaLista.some(
        antiga => antiga.id === id
    )
);

if(existemNovas){

    abrirModalEntrega(
        entregas[0]
    );

}

if(
    JSON.stringify(entregas) ===
    JSON.stringify(ultimaLista)
){
    return;
}

ultimaLista = [...entregas];

ultimaQuantidade =
entregas.length;



const container =
document.getElementById("entregas");

container.innerHTML = "";





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

<div class="entrega-card-header">
    <span class="entrega-card-badge">📦 Nova corrida</span>
    <span class="entrega-card-valor">R$ ${entrega.valor}</span>
</div>


<h3 class="entrega-cliente-label">
Cliente
</h3>


<p class="entrega-cliente">
${entrega.cliente_nome}
</p>


<p class="entrega-endereco">
📍 ${entrega.endereco}
</p>


<p class="entrega-bairro">
🏘️ ${entrega.bairro}
</p>


${entrega.descricao ? `
<p class="entrega-descricao">
${entrega.descricao}
</p>
` : ""}



<button class="btn-aceitar-corrida" onclick="aceitarEntrega('${entrega.id}')">

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

async function carregarEntregaAtual(){

try{

    const response = await fetch(

        `${API}/api/entregador/minhas-entregas`,

        {
            headers
        }

    );

    const entregas =
    await response.json();

    const container =
    document.getElementById("entregaAtual");



    const ativas = entregas.filter(e=>

        e.status === "aceita" ||
        e.status === "retirada"

    );



    if(!ativas.length){

        container.innerHTML =

        `
        <div class="sem-entrega">
            Nenhuma entrega em andamento.
        </div>
        `;

        return;

    }



    container.innerHTML = ativas.map(entrega => {

        const emRota =
        entrega.status === "retirada";

        return `

        <div class="entrega-atual">

            <div class="entrega-atual-topo">

                <span class="entrega-atual-status">

                    ${
                        emRota
                        ? "🟢 Em rota"
                        : "🟡 Aguardando coleta"
                    }

                </span>

            </div>

            <h3>
                ${entrega.cliente_nome}
            </h3>

            <p>
                📍 ${entrega.endereco}
            </p>

            <p>
                🏘️ ${entrega.bairro}
            </p>

            <p>
                💰 R$ ${Number(entrega.valor).toFixed(2)}
            </p>

            <div class="entrega-atual-botoes">

                ${
                    entrega.status === "aceita"

                    ?

                    `
                    <button
                    class="btn-retirar"
                    onclick="retirarEntrega('${entrega.id}')"
                    >
                    📦 Retirei pedido
                    </button>
                    `

                    :

                    `
                    <button
                    class="btn-finalizar"
                    onclick="finalizarEntrega('${entrega.id}')"
                    >
                    ✅ Finalizar
                    </button>
                    `
                }

            </div>

        </div>

        `;

    }).join("");


}catch(error){

    console.log(error);

}

}


function abrirModalEntrega(entrega){

    entregaAtual = entrega;

    document
    .getElementById("modalCliente")
    .innerHTML =
    `Cliente: ${entrega.cliente_nome}`;


    document
    .getElementById("modalEndereco")
    .innerHTML =
    `📍 ${entrega.endereco}`;

    document
    .getElementById("modalBairro")
    .innerHTML =
    `🏘️ ${entrega.bairro}`;


    document
    .getElementById("modalValor")
    .innerHTML =
    `💰 R$ ${entrega.valor}`;


    document
    .getElementById("modalDescricao")
    .innerHTML =
    entrega.descricao || "";


    iniciarAlertaEntrega();


    document
    .getElementById("modalEntrega")
    .classList.add("ativo");


    let tempo = 30;


    document
    .getElementById("contadorEntrega")
    .innerHTML = tempo;


    clearInterval(contadorInterval);


    contadorInterval = setInterval(()=>{

        tempo--;

        document
        .getElementById("contadorEntrega")
        .innerHTML = tempo;


        if(tempo <= 0){

            fecharModalEntrega();

        }

    },1000);

}

function fecharModalEntrega(){

    pararAlertaEntrega();

    clearInterval(
        contadorInterval
    );

    document
    .getElementById("modalEntrega")
    .classList.remove("ativo");

}

document
.getElementById("btnAceitarModal")
.onclick = async()=>{

    if(!entregaAtual){

        return;

    }

    await aceitarEntrega(
        entregaAtual.id
    );

    fecharModalEntrega();

};

document
.getElementById("btnRecusarModal")
.onclick = ()=>{

    fecharModalEntrega();

};






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

GPS ativo · precisão de ${Math.round(precisao)}m

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


async function carregarFinanceiro(){

    const response = await fetch(

        `${API}/api/financeiro/resumo`,

        { headers }

    );

    const data = await response.json();

    document.getElementById("ganhosHoje").innerHTML =
    `R$ ${data.hoje.toFixed(2)}`;

    document.getElementById("ganhosSemana").innerHTML =
    `R$ ${data.semana.toFixed(2)}`;

    document.getElementById("ganhosMes").innerHTML =
    `R$ ${data.mes.toFixed(2)}`;

    document.getElementById("saldoCarteira").innerHTML =
    `R$ ${data.saldo.toFixed(2)}`;
}



async function retirarEntrega(id){

const response =
await fetch(

`${API}/api/entregas/${id}/retirar`,

{
method:"PUT",
headers
}

);

const data =
await response.json();

alert(data.message);

carregarEntregas();
carregarEntregaAtual();

}

async function finalizarEntrega(id){

const response =
await fetch(

`${API}/api/entregas/${id}/finalizar`,

{
method:"PUT",
headers
}

);

const data =
await response.json();

alert(data.message);

carregarEntregas();
carregarEntregaAtual();
carregarFinanceiro();

}



// =======================
// INICIAR SISTEMA
// =======================
iniciarMapa();

carregarPerfil();

carregarEntregas();
carregarEntregaAtual();
carregarFinanceiro();

iniciarGPS();


setInterval(()=>{

    carregarEntregas();

    carregarEntregaAtual();

    carregarFinanceiro();

},3000);