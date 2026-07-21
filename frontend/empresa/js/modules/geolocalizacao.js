async function buscarEnderecoPeloMapa(lat, lng) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`;

    const resposta = await fetch(url, {
      headers: {
        "Accept-Language": "pt-BR",
      },
    });

    const dados = await resposta.json();

    console.log("ENDEREÇO REVERSO:", dados);

    const endereco = dados.address;

    if (!endereco) {
      mostrarToast("Não foi possível identificar endereço", "erro");

      return;
    }

    // BAIRRO

    const bairro =
      endereco.suburb || endereco.neighbourhood || endereco.quarter || "";

    // CIDADE

    const cidade =
      endereco.city || endereco.town || endereco.municipality || "";

    // RUA (opcional)

    const rua = endereco.road || "";

    if (bairro) {
      document.getElementById("np_bairro").value = bairro;

      // procura valor da tabela
      const encontrado = bairrosTabela.find(
        (b) => b.bairro.toLowerCase() === bairro.toLowerCase(),
      );

      if (encontrado) {
        valorEntregaAtual = Number(encontrado.valor);

        document.getElementById("np_taxa_entrega").value =
          valorEntregaAtual.toFixed(2);

        calcularTotalPedido();
      }
    }

    if (cidade) {
      document.getElementById("np_cidade").value = cidade;
    }

    mostrarToast("Local preenchido pelo mapa", "sucesso");
  } catch (error) {
    console.error(error);

    mostrarToast("Erro ao buscar endereço", "erro");
  }
}

window.buscarEnderecoPeloMapa = buscarEnderecoPeloMapa;
