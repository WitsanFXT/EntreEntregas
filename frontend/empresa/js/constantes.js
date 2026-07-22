const STATUS_LABELS = {
  aguardando: "Aguardando",
  confirmado: "Confirmado",
  em_preparo: "Preparando",
  pronto_retirada: "Pronto para retirada",
  aceita: "Aceita",
  retirada: "Retirada",
  em_rota: "Em rota",
  entregue: "Entregue",
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
  "pronto_retirada",
  "aceita",
  "retirada",
  "em_rota",
  "entregue",
];

const STATUS_PROXIMA_ACAO = {
  aguardando: "Confirmar",
  confirmado: "Em preparo",
  em_preparo: "Pronto p/ retirada",
};

window.STATUS_LABELS = STATUS_LABELS;
window.ORIGEM_LABELS = ORIGEM_LABELS;
window.STATUS_SEQUENCIA = STATUS_SEQUENCIA;
window.STATUS_PROXIMA_ACAO = STATUS_PROXIMA_ACAO;
