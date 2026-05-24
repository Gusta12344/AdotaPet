import { api } from "../api.js";
import { saveAdminCredentials } from "../auth.js";
import { $, setFeedback } from "../ui.js";

const form = $("#admin-login-form");
const feedback = $("#admin-login-feedback");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFeedback(feedback, "Validando credenciais...");

  const data = new FormData(form);
  const email = String(data.get("email") || "").trim();
  const senha = String(data.get("senha") || "").trim();

  try {
    const response = await api.post("/admin/login", { email, senha });
    if (!response.autenticado) {
      throw new Error(response.mensagem || "Credenciais invalidas");
    }

    saveAdminCredentials(sessionStorage, email, senha);
    window.location.href = "admin-painel.html";
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
});
