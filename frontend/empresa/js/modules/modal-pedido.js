// ---------- Modal Novo Pedido ----------
let mapaPedido = null;
let marcadorPedido = null;

function iniciarMapaPedido() {
  if (mapaPedido) return;

  mapaPedido = L.map("mapaPedido").setView([-16.3605, -46.8845], 13);

  L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "&copy; OpenStreetMap",
  }).addTo(mapaPedido);

  mapaPedido.on("click", async function (e) {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    adicionarMarcador(lat, lng);

    await buscarEnderecoPeloMapa(lat, lng);
  });

  setTimeout(() => {
    mapaPedido.invalidateSize();
  }, 500);
}

function adicionarMarcador(lat, lng) {
  console.log("ADICIONANDO MARCADOR:", lat, lng);

  const posicao = [Number(lat), Number(lng)];

  if (marcadorPedido) {
    marcadorPedido.setLatLng(posicao);
  } else {
    marcadorPedido = L.marker(posicao, {
      draggable: true,
    })
      .addTo(mapaPedido)
      .bindPopup(
        `
    <strong>📍 Cliente</strong><br>
    Local da entrega
`,
      )
      .openPopup();
  }

  mapaPedido.setView(posicao, 18, {
    animate: true,
  });

  document.getElementById("np_latitude").value = Number(lat).toFixed(8);

  document.getElementById("np_longitude").value = Number(lng).toFixed(8);
}

function abrirModalNovoPedido() {
  document.getElementById("overlayNovoPedido").classList.add("ativo");

  document.getElementById("modalNovoPedido").classList.add("ativo");

  setTimeout(() => {
    iniciarMapaPedido();

    mapaPedido.invalidateSize(true);
  }, 800);
}

function fecharModalNovoPedido() {
  document.getElementById("overlayNovoPedido").classList.remove("ativo");
  document.getElementById("modalNovoPedido").classList.remove("ativo");
  [
    "np_cliente_nome",
    "np_cliente_telefone",
    "np_itens",
    "np_valor_total",
    "np_endereco",
    "np_bairro",
    "np_cidade",
  ].forEach((id) => (document.getElementById(id).value = ""));
  document.getElementById("np_origem").value = "manual";
}

document.getElementById("btnNovoPedido").onclick = abrirModalNovoPedido;
document.getElementById("btnCancelarNovoPedido").onclick =
  fecharModalNovoPedido;

document.getElementById("btnConfirmarNovoPedido").onclick = async function () {
  const botao = this;

  const body = {
    cliente_nome: document.getElementById("np_cliente_nome").value,

    cliente_telefone: document.getElementById("np_cliente_telefone").value,

    itens: document.getElementById("np_itens").value,

    valor_total: Number(document.getElementById("np_valor_total").value) || 0,

    valor_entrega: valorEntregaAtual,

    origem: document.getElementById("np_origem").value,

    endereco: document.getElementById("np_endereco").value,

    bairro: document.getElementById("np_bairro").value,

    cidade: document.getElementById("np_cidade").value,

    latitude: Number(document.getElementById("np_latitude").value) || null,

    longitude: Number(document.getElementById("np_longitude").value) || null,
  };

  botao.disabled = true;
  botao.textContent = "Criando...";

  try {
    const response = await fetch(`${API}/api/empresa/pedidos`, {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });

    const data = await response.json();
    mostrarToast(
      data.message || "Pedido criado",
      response.ok ? "sucesso" : "erro",
    );

    if (response.ok) {
      fecharModalNovoPedido();
      carregarPedidos();
      carregarEntregas();
      carregarDashboardKpis();
    }
  } catch (error) {
    console.error(error);
    mostrarToast("Não foi possível criar o pedido", "erro");
  } finally {
    botao.disabled = false;
    botao.textContent = "Criar pedido";
  }
};

// =================================
// EXPORTAR FUNÇÕES GLOBAIS
// =================================

window.abrirModalNovoPedido = abrirModalNovoPedido;

window.fecharModalNovoPedido = fecharModalNovoPedido;

window.iniciarMapaPedido = iniciarMapaPedido;

window.adicionarMarcador = adicionarMarcador;
