const supabase = require("../config/supabase");
const redistribuirEntrega = require("./redistribuirEntrega");
const distribuirEntrega = require("./distribuicaoService");

const TIMEOUT_MS = 30 * 1000;

async function verificarTimeouts(io) {
  console.log("TICK verificarTimeouts", new Date().toISOString());
  try {
    const limite = new Date(Date.now() - TIMEOUT_MS).toISOString();

    const { data: expiradas, error } = await supabase
      .from("entregas")
      .select("id, entregador_id")
      .eq("status", "pendente")
      .not("entregador_id", "is", null)
      .lt("atribuido_em", limite);

    if (error) {
      console.log("Erro ao buscar entregas expiradas:", error);
      return;
    }

    if (expiradas && expiradas.length > 0) {
      for (const entrega of expiradas) {
        console.log(
          `Timeout: entrega ${entrega.id} sem resposta de ${entrega.entregador_id}, redistribuindo...`,
        );

        await supabase.from("recusas_entrega").insert({
          entrega_id: entrega.id,
          entregador_id: entrega.entregador_id,
        });

        const novoEntregador = await redistribuirEntrega(entrega.id);

        if (novoEntregador) {
          const { data: entregaAtualizada } = await supabase
            .from("entregas")
            .select("*")
            .eq("id", entrega.id)
            .single();

          io.to(`entregador:${novoEntregador.id}`).emit(
            "nova_entrega",
            entregaAtualizada,
          );
        }
      }
    }

    // entregas que "descansaram" depois que todos recusaram: reinicia a fila do zero
    const { data: prontasParaReiniciar, error: erroReiniciar } = await supabase
      .from("entregas")
      .select("id, reinicio_em")
      .eq("status", "pendente")
      .is("entregador_id", null)
      .not("reinicio_em", "is", null)
      .lt("reinicio_em", new Date().toISOString());

    if (erroReiniciar) {
      console.log("ERRO AO BUSCAR prontasParaReiniciar:", erroReiniciar);
    }

    // DEBUG temporário — remover depois de confirmar o problema
    const { data: debugPendentesSemDono } = await supabase
      .from("entregas")
      .select("id, reinicio_em, rodadas_tentadas")
      .eq("status", "pendente")
      .is("entregador_id", null);

    if (debugPendentesSemDono && debugPendentesSemDono.length > 0) {
      console.log("DEBUG pendentes sem dono agora:", new Date().toISOString());
      console.log(debugPendentesSemDono);
    }

    for (const entrega of prontasParaReiniciar || []) {
      console.log(`Reiniciando fila da entrega ${entrega.id}`);

      // zera as recusas antigas pra dar uma rodada nova completa
      await supabase
        .from("recusas_entrega")
        .delete()
        .eq("entrega_id", entrega.id);

      await supabase
        .from("entregas")
        .update({ reinicio_em: null })
        .eq("id", entrega.id);

      const escolhido = await distribuirEntrega(entrega.id);

      if (escolhido) {
        const { data: entregaAtualizada } = await supabase
          .from("entregas")
          .select("*")
          .eq("id", entrega.id)
          .single();

        io.to(`entregador:${escolhido.id}`).emit(
          "nova_entrega",
          entregaAtualizada,
        );
      }
    }
  } catch (error) {
    console.log("Erro no verificarTimeouts:", error);
  }
}

function iniciarVerificacaoTimeouts(io) {
  setInterval(() => verificarTimeouts(io), 5000);
  console.log("Verificação de timeout de entregas iniciada (30s).");
}

module.exports = iniciarVerificacaoTimeouts;
