import { api } from "../api.js";
import { buildAdotantePayload } from "../forms.js";
import { saveAdotanteId, saveCurrentUser } from "../state.js";
import { $, setFeedback } from "../ui.js";

const form = $("#cadastro-form");
const feedback = $("#cadastro-feedback");

form?.addEventListener("submit", async (event) => {
  event.preventDefault();
  setFeedback(feedback, "Enviando cadastro...");

  try {
    const payload = buildAdotantePayload(new FormData(form));
    const adotante = await api.post("/adotantes", payload);
    saveAdotanteId(localStorage, adotante.id);
    saveCurrentUser(sessionStorage, {
      id: adotante.id,
      nome: adotante.nome,
      cpf: adotante.cpf || payload.cpf,
      email: adotante.email,
      tipo: "adotante",
      telefone: adotante.telefone,
      endereco: adotante.endereco,
      tipoMoradia: adotante.tipoMoradia,
      temCriancas: adotante.temCriancas,
      temOutrosAnimais: adotante.temOutrosAnimais,
      nivelAtividade: adotante.nivelAtividade,
      preferenciaPorte: adotante.preferenciaPorte,
      preferenciaEspecie: adotante.preferenciaEspecie,
    });
    window.location.href = "recomendados.html";
  } catch (error) {
    setFeedback(feedback, error.message, "error");
  }
});
