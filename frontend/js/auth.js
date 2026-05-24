const ADMIN_SESSION_KEY = "adotapet.admin.credentials";

export function buildBasicAuthHeader(email, senha) {
  const cleanEmail = String(email || "").trim();
  const cleanSenha = String(senha || "").trim();

  if (!cleanEmail || !cleanSenha) {
    throw new Error("Credenciais administrativas ausentes");
  }

  const credentials = `${cleanEmail}:${cleanSenha}`;
  const bytes = new TextEncoder().encode(credentials);
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }

  return `Basic ${btoa(binary)}`;
}

export function saveAdminCredentials(storage, email, senha) {
  const cleanEmail = String(email || "").trim();
  const cleanSenha = String(senha || "").trim();

  if (!cleanEmail || !cleanSenha) {
    throw new Error("Informe e-mail e senha");
  }

  storage.setItem(ADMIN_SESSION_KEY, JSON.stringify({
    email: cleanEmail,
    senha: cleanSenha,
  }));
}

export function readAdminCredentials(storage) {
  const raw = storage.getItem(ADMIN_SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    const credentials = JSON.parse(raw);
    if (!credentials.email || !credentials.senha) {
      return null;
    }

    return {
      email: String(credentials.email),
      senha: String(credentials.senha),
    };
  } catch {
    return null;
  }
}

export function clearAdminCredentials(storage) {
  storage.removeItem(ADMIN_SESSION_KEY);
}

export function getAdminAuthorization(storage) {
  const credentials = readAdminCredentials(storage);
  if (!credentials) {
    throw new Error("Sessao administrativa expirada");
  }

  return buildBasicAuthHeader(credentials.email, credentials.senha);
}
