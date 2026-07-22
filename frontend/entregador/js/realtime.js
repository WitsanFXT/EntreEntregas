window.supabaseClient
  .channel(`entregador-${usuario.id}`)
  .on(
    "postgres_changes",
    {
      event: "*",
      schema: "public",
      table: "entregas",
    },
    () => {
      carregarMinhasEntregas();
    },
  )
  .subscribe();
