import { readAuthenticatedAdotanteId, readLastSolicitacao, requestLoginOnHome } from "../state.js";
import { $, clearNode, element } from "../ui.js";

const target = $("#confirmacao-detalhes");
const adotanteId = readAuthenticatedAdotanteId();
const solicitacao = adotanteId ? readLastSolicitacao(sessionStorage) : null;

if (!adotanteId) {
  requestLoginOnHome();
  if (globalThis.window?.location) {
    globalThis.window.location.href = "index.html?login=required";
  }
} else if (target) {
  clearNode(target);

  if (solicitacao) {
    target.append(
      element("dl", { className: "detail-grid compact" }, [
        fact("Solicitacao", `#${solicitacao.id}`),
        fact("Animal", solicitacao.animalNome || "-"),
        fact("Adotante", solicitacao.adotanteNome || "-"),
        fact("Status", "Pendente"),
      ])
    );
  } else {
    target.append(element("p", { className: "empty-state", text: "Sua solicitacao foi registrada. O administrador acompanhara a fila." }));
  }
}

function fact(label, value) {
  return element("div", { className: "detail-fact" }, [
    element("dt", { text: label }),
    element("dd", { text: value }),
  ]);
}
