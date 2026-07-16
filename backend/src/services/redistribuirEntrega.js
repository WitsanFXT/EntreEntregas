const supabase = require("../config/supabase");
const calcularDistancia = require("./distanciaService");

async function redistribuirEntrega(entregaId) {

    try {

        // Buscar entrega
        const { data: entrega, error: erroEntrega } = await supabase
            .from("entregas")
            .select("*")
            .eq("id", entregaId)
            .single();

        if (erroEntrega || !entrega) {
            console.log("Entrega não encontrada");
            return null;
        }

        // Buscar entregadores recusados
        const { data: recusas } = await supabase
            .from("recusas_entrega")
            .select("entregador_id")
            .eq("entrega_id", entregaId);

        const idsRecusados =
            recusas?.map(r => r.entregador_id) || [];

        // Buscar entregadores online
        const { data: entregadores } = await supabase
            .from("entregadores")
            .select("*")
            .eq("online", true);

        if (!entregadores || entregadores.length === 0) {

            console.log("Nenhum entregador online");

            await supabase
                .from("entregas")
                .update({
                    entregador_id: null
                })
                .eq("id", entregaId);

            return null;
        }

        // Remover quem recusou
        const candidatos = entregadores.filter(
            e => !idsRecusados.includes(e.id)
        );

        if (candidatos.length === 0) {

            console.log("Todos recusaram");

            await supabase
                .from("entregas")
                .update({
                    entregador_id: null
                })
                .eq("id", entregaId);

            return null;
        }

        // Calcular distância
        const ordenados = candidatos.map(entregador => {

            const distancia = calcularDistancia(
                entrega.latitude,
                entrega.longitude,
                entregador.latitude,
                entregador.longitude
            );

            return {
                ...entregador,
                distancia
            };

        });

        ordenados.sort(
            (a, b) => a.distancia - b.distancia
        );

        const proximo = ordenados[0];

        // Atualizar entrega
        await supabase
            .from("entregas")
            .update({
                entregador_id: proximo.id
            })
            .eq("id", entregaId);

        console.log(
            `Entrega ${entregaId} redistribuída para ${proximo.id}`
        );

        return proximo;

    } catch (error) {

        console.log(error);
        return null;

    }

}

module.exports = redistribuirEntrega;