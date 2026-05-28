import { API_BASE_URL } from "./api.js";

const RANDOM_DOG_API = "https://dog.ceo/api/breeds/image/random";
const RANDOM_CAT_API = "https://api.thecatapi.com/v1/images/search";
const FALLBACK_IMAGE = "assets/adotapet-mark.svg";

export function fallbackAnimalImageUrl() {
  return FALLBACK_IMAGE;
}

export async function chooseAnimalImageUrl(animal, { fetchImpl = globalThis.fetch } = {}) {
  const registeredUrl = firstRegisteredImageUrl(animal);
  if (registeredUrl) {
    return toAbsoluteImageUrl(registeredUrl);
  }

  if (!fetchImpl) {
    return FALLBACK_IMAGE;
  }

  try {
    if (animal?.especie === "cao") {
      const response = await fetchImpl(RANDOM_DOG_API);
      if (!response.ok) {
        return FALLBACK_IMAGE;
      }
      const data = await response.json();
      return typeof data.message === "string" ? data.message : FALLBACK_IMAGE;
    }

    if (animal?.especie === "gato") {
      const response = await fetchImpl(RANDOM_CAT_API);
      if (!response.ok) {
        return FALLBACK_IMAGE;
      }
      const data = await response.json();
      const url = Array.isArray(data) ? data[0]?.url : null;
      return typeof url === "string" ? url : FALLBACK_IMAGE;
    }
  } catch (error) {
    return FALLBACK_IMAGE;
  }

  return FALLBACK_IMAGE;
}

function firstRegisteredImageUrl(animal) {
  if (!Array.isArray(animal?.imagemUrls)) {
    return "";
  }

  for (const url of animal.imagemUrls) {
    const cleanUrl = String(url || "").trim();
    if (cleanUrl) {
      return cleanUrl;
    }
  }

  return "";
}

function toAbsoluteImageUrl(url) {
  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("/")) {
    return `${API_BASE_URL}${url}`;
  }

  return url;
}
