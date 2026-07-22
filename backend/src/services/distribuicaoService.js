const supabase = require("../config/supabase");

const calcularDistancia = require("./distanciaService");

// =====================================
// DISTRIBUIR ENTREGA
// =====================================

async function distribuirEntrega(entregaId) {
  try {
    // BUSCAR ENTREGA

    const { data: entrega, error } = await supabase
      .from("entregas")
      .select("*")
      .eq("id", entregaId)
      .single();

    if (error || !entrega) {
      console.log("Entrega não encontrada");

      return null;
    }

    // BUSCAR ENTREGADORES ONLINE

    const { data: entregadores, error: erroEntregadores } = await supabase
      .from("entregadores")
      .select("*")
      .eq("online", true);

    if (erroEntregadores || !entregadores || entregadores.length === 0) {
      console.log("Nenhum entregador online");

      await supabase
        .from("entregas")
        .update({
          status: "sem_entregador",

          entregador_id: null,
        })
        .eq("id", entregaId);

      return null;
    }

    // CALCULAR DISTÂNCIA

    const candidatos = entregadores.map((entregador) => {
      const distancia = calcularDistancia(
        Number(entrega.latitude),

        Number(entrega.longitude),

        Number(entregador.latitude),

        Number(entregador.longitude),
      );

      return {
        ...entregador,

        distancia,
      };
    });

    // ORDENAR MAIS PRÓXIMO

    candidatos.sort((a, b) => a.distancia - b.distancia);

    const entregadorEscolhido = candidatos[0];

    console.log(
      "Escolhido:",
      entregadorEscolhido.id,
      "distância:",
      entregadorEscolhido.distancia,
    );

    // SALVAR NA ENTREGA

    const { error: updateError } = await supabase
      .from("entregas")
      .update({
        entregador_id: entregadorEscolhido.id,
        status: "pendente",
        atribuido_em: new Date(),
      })
      .eq("id", entregaId);

    if (updateError) {
      console.log(updateError);

      return null;
    }

    return entregadorEscolhido;
  } catch (error) {
    console.log(error);

    return null;
  }
}

module.exports = distribuirEntrega;
