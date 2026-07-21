// =================================
// CONFIG / AUTENTICAÇÃO
// =================================
window.API =
  window.location.hostname === "localhost" ||
  window.location.hostname === "127.0.0.1"
    ? "http://localhost:5500"
    : "";

window.token = localStorage.getItem("token");

if (!window.token) {
  window.location.href = "../login/login.html";
}

window.headers = {
  Authorization: `Bearer ${window.token}`,
  "Content-Type": "application/json",
};
