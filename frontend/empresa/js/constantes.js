const STATUS_LABELS = {
  pendente: "Pendente",
  aceita: "Aceita",
  aceito: "Aceita",
  retirada: "Retirada",
  em_rota: "Em rota",
  a_caminho: "A caminho",
  entregue: "Entregue",
  finalizada: "Entregue",
  concluida: "Entregue",
  concluido: "Entregue",
  cancelada: "Cancelada",
  cancelado: "Cancelado",
  sem_entregador: "Sem entregador",
  aguardando: "Aguardando",
  confirmado: "Confirmado",
  em_preparo: "Em preparo",
  saiu_para_entrega: "Saiu p/ entrega",
};

const ORIGEM_LABELS = {
  ifood: "iFood",
  manual: "Manual",
  site: "Site próprio",
};

const STATUS_SEQUENCIA = [
  "aguardando",
  "confirmado",
  "em_preparo",
  "saiu_para_entrega",
  "entregue",
];

const STATUS_PROXIMA_ACAO = {
  aguardando: "Confirmar",
  confirmado: "Em preparo",
  em_preparo: "Saiu p/ entrega",
  saiu_para_entrega: "Marcar entregue",
};

window.STATUS_LABELS = STATUS_LABELS;
window.ORIGEM_LABELS = ORIGEM_LABELS;
window.STATUS_SEQUENCIA = STATUS_SEQUENCIA;
window.STATUS_PROXIMA_ACAO = STATUS_PROXIMA_ACAO;
