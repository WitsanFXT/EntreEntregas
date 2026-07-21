// =================================
// SUPABASE REALTIME
// =================================

const SUPABASE_URL = "https://gnrhxvbyxnixnrppwnul.supabase.co";
const SUPABASE_PUBLISHABLE_KEY =
  "sb_publishable_FzazGW0YE3mAcFO6NlUk6g_e5_pq_Nw";

window.supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_PUBLISHABLE_KEY,
);

// =================================
// ESTADO GLOBAL
// =================================

window.empresaAtual = null;

window.entregasCache = new Map();

window.pedidosCache = [];

window.entregaProblema = null;

window.bairrosTabela = [];

window.valorEntregaAtual = 0;
