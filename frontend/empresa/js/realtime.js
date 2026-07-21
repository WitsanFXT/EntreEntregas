// =================================
// SUPABASE REALTIME
// =================================

async function iniciarRealtime() {
  try {
    const response = await fetch(`${API}/api/empresa/token-realtime`, {
      headers,
    });
    const { token: tokenRealtime } = await response.json();

    if (!tokenRealtime) {
      console.log("Token realtime não recebido");
      return;
    }

    supabaseClient.realtime.setAuth(tokenRealtime);

    window.supabaseClient
      .channel(`empresa-${empresaAtual.id}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entregas",
          filter: `empresa_id=eq.${empresaAtual.id}`,
        },
        (payload) => {
          console.log("REALTIME:", payload);

          carregarEntregas();
        },
      )
      .subscribe((status) => {
        const el = document.getElementById("statusRealtime");
        if (status === "SUBSCRIBED") {
          el.textContent = "Conectado em tempo real";
          el.classList.add("conectado");
        } else {
          el.textContent = "Reconectando...";
          el.classList.remove("conectado");
        }
      });
  } catch (error) {
    console.log(error);
  }
}

// =================================
// EXPORTAR REALTIME
// =================================

window.iniciarRealtime = iniciarRealtime;
