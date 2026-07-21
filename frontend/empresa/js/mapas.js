// =================================
// GEOLOCALIZAÇÃO (reutilizada no form de entrega e no de configurações)
// =================================

async function carregarBairros() {
  try {
    const resposta = await fetch(`${API}/api/tabela-precos`, {
      headers,
    });

    const dados = await resposta.json();

    bairrosTabela = dados;

    console.log("BAIRROS CARREGADOS:", bairrosTabela);
  } catch (error) {
    console.error("Erro bairros", error);
  }
}

const inputBairro = document.getElementById("np_bairro");

const listaBairros = document.getElementById("listaBairros");

inputBairro.addEventListener("input", () => {
  const texto = inputBairro.value.toLowerCase().trim();

  listaBairros.innerHTML = "";

  if (!texto) {
    listaBairros.classList.remove("ativo");
    return;
  }

  const encontrados = bairrosTabela.filter((b) => {
    return b.bairro
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .includes(texto.normalize("NFD").replace(/[\u0300-\u036f]/g, ""));
  });

  encontrados.forEach((bairro) => {
    const item = document.createElement("div");

    item.className = "item-bairro";

    item.innerHTML = `

        <span>
          ${bairro.bairro}
        </span>

        <strong>
          R$ ${Number(bairro.valor).toFixed(2)}
        </strong>

    `;

    item.onclick = () => {
      inputBairro.value = bairro.bairro;

      valorEntregaAtual = Number(bairro.valor);

      document.getElementById("np_taxa_entrega").value =
        valorEntregaAtual.toFixed(2);

      calcularTotalPedido();

      listaBairros.classList.remove("ativo");
    };

    listaBairros.appendChild(item);
  });

  if (encontrados.length) {
    listaBairros.classList.add("ativo");
  } else {
    listaBairros.classList.remove("ativo");
  }
});

document.getElementById("np_bairro").addEventListener("change", () => {
  const bairro = document.getElementById("np_bairro").value;

  const encontrado = bairrosTabela.find(
    (b) => b.bairro.toLowerCase() === bairro.toLowerCase(),
  );

  if (encontrado) {
    valorEntregaAtual = Number(encontrado.valor);

    document.getElementById("np_taxa_entrega").value =
      valorEntregaAtual.toFixed(2);

    calcularTotalPedido();
  }
});

function calcularTotalPedido() {
  const produtos =
    Number(document.getElementById("np_valor_produtos").value) || 0;

  const entrega = Number(valorEntregaAtual) || 0;

  const total = produtos + entrega;

  document.getElementById("np_valor_total").value = total.toFixed(2);

  console.log("TOTAL PEDIDO:", {
    produtos,
    entrega,
    total,
  });
}

document
  .getElementById("np_valor_produtos")
  .addEventListener("input", calcularTotalPedido);

async function buscarEnderecoPedido() {
  const endereco = document.getElementById("np_endereco").value;
  const bairro = document.getElementById("np_bairro").value;
  const cidade = document.getElementById("np_cidade").value;

  const tentativas = [
    `${endereco}, ${bairro}, ${cidade}, MG, Brasil`,
    `${endereco}, ${cidade}, MG, Brasil`,
    `${bairro}, ${cidade}, MG, Brasil`,
    `${cidade}, MG, Brasil`,
  ];

  for (const busca of tentativas) {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(busca)}`,
    );

    const data = await response.json();

    if (data.length) {
      const local = data[0];

      document.getElementById("np_latitude").value = local.lat;
      document.getElementById("np_longitude").value = local.lon;

      mostrarToast("Endereço localizado", "sucesso");

      return;
    }
  }

  mostrarToast("Endereço não encontrado. Selecione no mapa.", "erro");
}
document
  .getElementById("btnBuscarEndereco")
  .addEventListener("click", async () => {
    console.log("BOTÃO BUSCAR CLICADO");

    const endereco = document.getElementById("np_endereco").value.trim();

    const bairro = document.getElementById("np_bairro").value.trim();

    const cidade = document.getElementById("np_cidade").value.trim();

    if (!endereco) {
      mostrarToast("Digite o endereço primeiro", "erro");
      return;
    }

    if (!mapaPedido) {
      iniciarMapaPedido();
    }

    const tentativas = [
      `${endereco}, ${bairro}, ${cidade}, Minas Gerais, Brasil`,

      `${endereco}, ${cidade}, Minas Gerais, Brasil`,

      `${endereco}, Unaí, MG, Brasil`,

      `${bairro}, ${cidade}, Minas Gerais, Brasil`,
    ];

    console.log("TENTATIVAS:", tentativas);

    try {
      let encontrado = null;

      for (const busca of tentativas) {
        console.log("CONSULTANDO:", busca);

        const url = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(busca)}`;

        const resposta = await fetch(url, {
          headers: {
            "Accept-Language": "pt-BR",
          },
        });

        const dados = await resposta.json();

        console.log("RESULTADO:", dados);

        if (dados.length) {
          encontrado = dados[0];
          break;
        }
      }

      if (!encontrado) {
        mostrarToast("Não encontrei. Clique no mapa para marcar.", "erro");

        return;
      }

      const lat = Number(encontrado.lat);
      const lng = Number(encontrado.lon);

      console.log("COORDENADAS PESQUISA:", lat, lng);

      adicionarMarcador(lat, lng);

      document.getElementById("np_latitude").value = lat.toFixed(8);

      document.getElementById("np_longitude").value = lng.toFixed(8);

      mostrarToast("Endereço localizado", "sucesso");
    } catch (error) {
      console.error(error);

      mostrarToast("Erro ao buscar endereço", "erro");
    }
  });

// Inicializar mapa para seleção de coordenadas
let map = null;

function inicializarMapa() {
  const mapContainer = document.getElementById("mapa");
  if (!mapContainer) return;

  map = L.map("mapa").setView([-16.3518, -46.912], 13); // Unai como padrão

  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    attribution: "© OpenStreetMap contributors",
    maxZoom: 19,
  }).addTo(map);

  // Capturar clique no mapa para preenchimento de coordenadas
  map.on("click", async function (e) {
    console.log("CLICOU NO MAPA");
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    document.getElementById("np_latitude").value = lat.toFixed(8);
    document.getElementById("np_longitude").value = lng.toFixed(8);
    document.getElementById("np_bairro").value = "Centro";

    try {
      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`,
      );

      const data = await response.json();

      console.log(data);

      const bairro =
        data.address.suburb ||
        data.address.neighbourhood ||
        data.address.city_district ||
        "";

      if (bairro) {
        document.getElementById("np_bairro").value = bairro;

        // procura na tabela de preços
        const encontrado = bairrosTabela.find(
          (b) => b.bairro.toLowerCase().trim() === bairro.toLowerCase().trim(),
        );

        if (encontrado) {
          valorEntregaAtual = Number(encontrado.valor);

          document.getElementById("np_taxa_entrega").value =
            valorEntregaAtual.toFixed(2);

          calcularTotalPedido();
        }
      }

      mostrarToast("Localização selecionada", "sucesso");
    } catch (error) {
      console.error(error);
      mostrarToast("Erro ao identificar o bairro", "erro");
    }
  });
}

function ligarBotaoLocalizacao(idBotao, idLat, idLon, idStatus) {
  const el = document.getElementById(idBotao);
  if (!el) return;

  el.onclick = () => {
    const botao = document.getElementById(idBotao);
    const status = document.getElementById(idStatus);

    botao.disabled = true;
    botao.textContent = "Buscando localização...";

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        document.getElementById(idLat).value = pos.coords.latitude;
        document.getElementById(idLon).value = pos.coords.longitude;
        status.textContent = "✓ Localização capturada";
        botao.disabled = false;
        botao.textContent = "Usar minha localização";
      },
      () => {
        mostrarToast("Erro ao pegar localização", "erro");
        botao.disabled = false;
        botao.textContent = "Usar minha localização";
      },
    );
  };
}

ligarBotaoLocalizacao(
  "buscarLocalizacao",
  "latitude",
  "longitude",
  "gpsStatus",
);
ligarBotaoLocalizacao(
  "cfgBuscarLocalizacao",
  "cfg_latitude",
  "cfg_longitude",
  "cfgGpsStatus",
);

window.carregarBairros = carregarBairros;
window.inicializarMapa = inicializarMapa;
window.buscarEnderecoPedido = buscarEnderecoPedido;
window.calcularTotalPedido = calcularTotalPedido;
