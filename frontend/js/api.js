import { getAdminAuthorization } from "./auth.js";

export const API_BASE_URL = "http://localhost:8080";

export class ApiError extends Error {
  constructor(message, { status = 0, details = null } = {}) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.details = details;
  }
}

export function getErrorMessage(details, { status = 0 } = {}) {
  if (status === 401) {
    return "CPF ou senha invalidos";
  }

  if (!details || typeof details !== "object") {
    return "Nao foi possivel concluir a operacao";
  }

  const message = details.message || details.error || "Nao foi possivel concluir a operacao";
  if (!details.fields || typeof details.fields !== "object") {
    return message;
  }

  const fieldMessages = Object.entries(details.fields)
    .map(([field, value]) => `${field} - ${value}`)
    .join("; ");

  return fieldMessages ? `${message}: ${fieldMessages}` : message;
}

async function parseBody(response) {
  const text = await response.text();
  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function createApiClient({
  baseUrl = API_BASE_URL,
  fetchImpl = globalThis.fetch,
  storage = globalThis.sessionStorage,
} = {}) {
  if (typeof fetchImpl !== "function") {
    throw new Error("Fetch API indisponivel");
  }

  async function request(path, { method = "GET", body = null, auth = false } = {}) {
    const headers = {};
    const options = {
      method,
      headers,
    };

    if (body !== null) {
      headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(body);
    }

    if (auth) {
      headers.Authorization = getAdminAuthorization(storage);
    }

    const response = await fetchImpl(`${baseUrl}${path}`, options);
    const parsed = await parseBody(response);

    if (!response.ok) {
      const message = typeof parsed === "string" ? parsed : getErrorMessage(parsed, { status: response.status });
      throw new ApiError(message, {
        status: response.status,
        details: parsed,
      });
    }

    return parsed;
  }

  async function requestForm(path, { method = "POST", body, auth = false } = {}) {
    const headers = {};
    const options = {
      method,
      headers,
      body,
    };

    if (auth) {
      headers.Authorization = getAdminAuthorization(storage);
    }

    const response = await fetchImpl(`${baseUrl}${path}`, options);
    const parsed = await parseBody(response);

    if (!response.ok) {
      const message = typeof parsed === "string" ? parsed : getErrorMessage(parsed, { status: response.status });
      throw new ApiError(message, {
        status: response.status,
        details: parsed,
      });
    }

    return parsed;
  }

  return {
    get(path, options = {}) {
      return request(path, { ...options, method: "GET" });
    },
    post(path, body, options = {}) {
      return request(path, { ...options, method: "POST", body });
    },
    postForm(path, body, options = {}) {
      return requestForm(path, { ...options, method: "POST", body });
    },
    put(path, body, options = {}) {
      return request(path, { ...options, method: "PUT", body });
    },
  };
}

export const api = createApiClient();
