// =================================
// TOAST
// =================================
function mostrarToast(mensagem, tipo = "") {
  const container = document.getElementById("toastContainer");
  const toast = document.createElement("div");
  toast.className = `toast ${tipo}`.trim();
  toast.textContent = mensagem;
  container.appendChild(toast);

  requestAnimationFrame(() => toast.classList.add("mostrar"));
  setTimeout(() => {
    toast.classList.remove("mostrar");
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

window.mostrarToast = mostrarToast;
