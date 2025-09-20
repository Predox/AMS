// ==================== Seletores ====================
const form = document.getElementById("orcamento-form");
const status = document.getElementById("status");

// ==================== Listener de Envio ====================
form.addEventListener("submit", async function(event) {
  event.preventDefault();

  status.textContent = "Enviando...";
  status.style.color = "#666";

  try {
    const response = await fetch(form.action, {
      method: form.method,
      body: new FormData(form),
      headers: { 'Accept': 'application/json' }
    });

    if (response.ok) {
      status.textContent = "Mensagem enviada com sucesso! Em breve retornaremos.";
      status.style.color = "green";
      form.reset();
    } else {
      status.textContent = "Ops! Algo deu errado, tente novamente.";
      status.style.color = "red";
    }
  } catch (err) {
    status.textContent = "Erro de conexão. Tente novamente mais tarde.";
    status.style.color = "red";
  }
});
