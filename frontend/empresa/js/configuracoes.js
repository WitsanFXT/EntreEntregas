// ---------- Personalização da loja (logo e banner) ----------
// Estratégia: comprime a imagem no navegador e transforma num data URL
// (base64) que entra no MESMO campo de texto da URL (logoLojaUrl /
// bannerLojaUrl). Assim o salvamento sempre passa pelo mesmo caminho
// simples — PUT /api/empresa/personalizacao com { logo_url, banner_url }
// como texto — sem depender de um endpoint de upload/Storage separado.

const logoLoja = document.getElementById("logoLoja");

if (logoLoja) {
  logoLoja.addEventListener("change", async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    try {
      const dataUrl = await comprimirImagemParaDataUrl(arquivo, 500, 0.85);
      logoLojaUrl.value = dataUrl;
      atualizarPreviewImagem(
        logoLojaUrl,
        previewLogoImg,
        previewLogoPlaceholder,
        removeLogoBtn,
      );
      atualizarPreview();
      mostrarToast(
        'Logo pronta! Clique em "Salvar personalização" para aplicar.',
        "sucesso",
      );
    } catch (error) {
      console.error(error);
      mostrarToast("Não foi possível processar essa imagem", "erro");
    } finally {
      evento.target.value = "";
    }
  });
}

const bannerLoja = document.getElementById("bannerLoja");

if (bannerLoja) {
  bannerLoja.addEventListener("change", async (evento) => {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;

    try {
      const dataUrl = await comprimirImagemParaDataUrl(arquivo, 1200, 0.8);
      bannerLojaUrl.value = dataUrl;
      atualizarPreviewImagem(
        bannerLojaUrl,
        previewBannerImg,
        previewBannerPlaceholder,
        removeBannerBtn,
      );
      atualizarPreview();
      mostrarToast(
        'Banner pronto! Clique em "Salvar personalização" para aplicar.',
        "sucesso",
      );
    } catch (error) {
      console.error(error);
      mostrarToast("Não foi possível processar essa imagem", "erro");
    } finally {
      evento.target.value = "";
    }
  });
}

const btnSalvarPersonalizacao = document.getElementById(
  "btnSalvarPersonalizacao",
);

if (btnSalvarPersonalizacao) {
  btnSalvarPersonalizacao.addEventListener("click", async () => {
    const logo_url = logoLojaUrl.value.trim();
    const banner_url = bannerLojaUrl.value.trim();

    const textoOriginal = btnSalvarPersonalizacao.textContent;
    btnSalvarPersonalizacao.disabled = true;
    btnSalvarPersonalizacao.textContent = "Salvando...";

    try {
      const response = await fetch(`${API}/api/empresa/personalizacao`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ logo_url, banner_url }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.message || "Erro ao salvar personalização");
      }

      // guarda localmente pra sobreviver a troca de aba sem precisar
      // buscar tudo de novo no servidor
      if (empresaAtual) {
        empresaAtual.logo_url = logo_url;
        empresaAtual.banner_url = banner_url;
      }

      mostrarToast("Personalização salva!", "sucesso");
      atualizarPreview();
    } catch (error) {
      console.error(error);
      mostrarToast(
        error.message || "Não foi possível salvar a personalização",
        "erro",
      );
    } finally {
      btnSalvarPersonalizacao.disabled = false;
      btnSalvarPersonalizacao.textContent = textoOriginal;
    }
  });
}

// =================================
// INICIALIZAR PERSONALIZAÇÃO
// =================================

function inicializarPersonalizacao() {
  const logoLoja = document.getElementById("logoLoja");

  if (logoLoja) {
    console.log("Personalização de logo carregada");
  }

  const bannerLoja = document.getElementById("bannerLoja");

  if (bannerLoja) {
    console.log("Personalização de banner carregada");
  }
}

window.inicializarPersonalizacao = inicializarPersonalizacao;
