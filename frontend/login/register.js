// ======================================
// REGISTER.JS
// ======================================

const etapa1 = document.getElementById("etapa1");
const etapa2 = document.getElementById("etapa2");

const btnContinuar = document.getElementById("btnContinuar");
const btnVoltar = document.getElementById("btnVoltar");

const step1 = document.getElementById("step1Indicator");
const step2 = document.getElementById("step2Indicator");

const perfilCards = document.querySelectorAll(".perfil-card");

const tipoConta = document.getElementById("tipoConta");

const camposCliente = document.getElementById("camposCliente");
const camposEmpresa = document.getElementById("camposEmpresa");
const camposEntregador = document.getElementById("camposEntregador");

const registerForm = document.getElementById("registerForm");

// ======================================
// VALIDAÇÃO ETAPA 1
// ======================================

btnContinuar.addEventListener("click", () => {
  const nome = document.getElementById("nome").value.trim();
  const email = document.getElementById("email").value.trim();
  const telefone = document.getElementById("telefone").value.trim();
  const senha = document.getElementById("senha").value;
  const confirmarSenha = document.getElementById("confirmarSenha").value;

  if (!nome) {
    return alert("Informe seu nome.");
  }

  if (nome.length < 3) {
    return alert("Nome muito curto.");
  }

  if (!validarEmail(email)) {
    return alert("Email inválido.");
  }

  if (telefone.length < 10) {
    return alert("Telefone inválido.");
  }

  if (senha.length < 6) {
    return alert("Senha deve possuir no mínimo 6 caracteres.");
  }

  if (senha !== confirmarSenha) {
    return alert("As senhas não coincidem.");
  }

  etapa1.style.display = "none";
  etapa2.style.display = "block";

  step1.classList.remove("active");
  step1.classList.add("completed");

  step2.classList.add("active");
});

// ======================================
// VOLTAR
// ======================================

btnVoltar.addEventListener("click", () => {
  etapa2.style.display = "none";
  etapa1.style.display = "block";

  step1.classList.remove("completed");
  step1.classList.add("active");

  step2.classList.remove("active");
});

// ======================================
// SELEÇÃO DE PERFIL
// ======================================

perfilCards.forEach((card) => {
  card.addEventListener("click", () => {
    perfilCards.forEach((item) => {
      item.classList.remove("selected");
    });

    card.classList.add("selected");

    const tipo = card.dataset.tipo;

    tipoConta.value = tipo;

    camposCliente.style.display = "none";
    camposEmpresa.style.display = "none";
    camposEntregador.style.display = "none";

    if (tipo === "cliente") {
      camposCliente.style.display = "block";
    }

    if (tipo === "empresa") {
      camposEmpresa.style.display = "block";
    }

    if (tipo === "entregador") {
      camposEntregador.style.display = "block";
    }
  });
});

// ======================================
// ENVIO CADASTRO
// ======================================

registerForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  if (!tipoConta.value) {
    return alert("Selecione um perfil.");
  }

  const payload = {
    nome: document.getElementById("nome").value.trim(),
    email: document.getElementById("email").value.trim(),
    telefone: document.getElementById("telefone").value.trim(),
    senha: document.getElementById("senha").value,
    tipo: tipoConta.value,

    cliente: {
      cpf: document.getElementById("clienteCpf")?.value || "",
      nascimento: document.getElementById("clienteNascimento")?.value || "",
    },

    empresa: {
      cnpj: document.getElementById("empresaCnpj")?.value || "",
      nomeFantasia: document.getElementById("empresaNomeFantasia")?.value || "",
      categoria: document.getElementById("empresaCategoria")?.value || "",
    },

    entregador: {
      cpf: document.getElementById("entregadorCpf")?.value || "",
      cnh: document.getElementById("entregadorCnh")?.value || "",
      tipoVeiculo: document.getElementById("tipoVeiculo")?.value || "",
      placa: document.getElementById("placa")?.value || "",
    },
  };

  try {
    const response = await fetch("http://localhost:5500/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.message);
    }

    alert("Cadastro realizado com sucesso!");

    window.location.href = "login.html";
  } catch (error) {
    alert(error.message || "Erro ao cadastrar.");
  }
});

// ======================================
// EMAIL
// ======================================

function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  return regex.test(email);
}
