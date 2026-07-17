const supabase = require("../config/supabase");
const calcularDistancia = require("./distanciaService");
const { getIO } = require("../socket/socket");

const LIMITE_RODADAS = 3;

async function redistribuirEntrega(entregaId) {
  try {
    const { data: entrega, error: erroEntrega } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", entregaId)
      .single();

    if (erroEntrega || !entrega) {
      console.log("Entrega não encontrada");
      return null;
    }

    const { data: recusas } = await supabase
      .from("recusas_entrega")
      .select("entregador_id")
      .eq("entrega_id", entregaId);

    const idsRecusados = recusas?.map((r) => r.entregador_id) || [];

    const { data: entregadores } = await supabase
      .from("entregadores")
      .select("*")
      .eq("online", true);

    if (!entregadores || entregadores.length === 0) {
      console.log("Nenhum entregador online");

      await supabase
        .from("entregas")
        .update({ entregador_id: null })
        .eq("id", entregaId);

      return null;
    }

    // Remove quem já recusou
    const candidatos = entregadores.filter((e) => !idsRecusados.includes(e.id));

    if (candidatos.length === 0) {
      const rodadas = (entrega.rodadas_tentadas || 0) + 1;

      if (rodadas >= LIMITE_RODADAS) {
        console.log(
          `Entrega ${entregaId} sem entregador após ${rodadas} rodadas — desistindo`,
        );

        await supabase
          .from("entregas")
          .update({
            entregador_id: null,
            status: "sem_entregador",
            reinicio_em: null,
            rodadas_tentadas: rodadas,
          })
          .eq("id", entregaId);

        // avisa a empresa que precisa intervir manualmente
        getIO().emit("entrega_sem_entregador", { id: entregaId });

        return null;
      }

      console.log(
        `Rodada ${rodadas}/${LIMITE_RODADAS} sem sucesso — aguardando 20s pra reiniciar`,
      );

      await supabase
        .from("entregas")
        .update({
          entregador_id: null,
          reinicio_em: new Date(Date.now() + 20000).toISOString(),
          rodadas_tentadas: rodadas,
        })
        .eq("id", entregaId)
        .then(({ error }) => {
          if (error) console.log("ERRO AO GRAVAR reinicio_em:", error);
        });

      return null;
    }

    // Calcula distância e ordena pelo mais próximo
    const ordenados = candidatos.map((entregador) => ({
      ...entregador,
      distancia: calcularDistancia(
        entrega.latitude,
        entrega.longitude,
        entregador.latitude,
        entregador.longitude,
      ),
    }));

    ordenados.sort((a, b) => a.distancia - b.distancia);

    const proximo = ordenados[0];

    await supabase
      .from("entregas")
      .update({
        entregador_id: proximo.id,
        atribuido_em: new Date().toISOString(),
      })
      .eq("id", entregaId);

    console.log(`Entrega ${entregaId} redistribuída para ${proximo.id}`);

    // quem notifica o entregador é sempre quem chamou (controller/verificarTimeouts),
    // usando o retorno desta função — evita duplicar o modal
    return proximo;
  } catch (error) {
    console.log(error);
    return null;
  }
}

module.exports = redistribuirEntrega;
