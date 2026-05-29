import { API_BASE_URL } from "./api.js";

const RANDOM_DOG_API = "https://dog.ceo/api/breeds/image/random";
const RANDOM_CAT_API = "https://api.thecatapi.com/v1/images/search";
const FALLBACK_IMAGE = "assets/adotapet-mark.svg";
const IMAGE_CACHE_PREFIX = "adotapet:animal-image:";

export function fallbackAnimalImageUrl() {
  return FALLBACK_IMAGE;
}

export function getCachedAnimalImageUrl(animal, { storage = globalThis.sessionStorage } = {}) {
  const key = animalImageCacheKey(animal);
  if (!key || !storage) {
    return "";
  }

  try {
    const cachedUrl = String(storage.getItem(key) || "").trim();
    return cachedUrl && cachedUrl !== FALLBACK_IMAGE ? cachedUrl : "";
  } catch {
    return "";
  }
}

export async function chooseAnimalImageUrl(animal, {
  fetchImpl = globalThis.fetch,
  storage = globalThis.sessionStorage,
} = {}) {
  const registeredUrl = firstRegisteredImageUrl(animal);
  if (registeredUrl) {
    return toAbsoluteImageUrl(registeredUrl);
  }

  const cachedUrl = getCachedAnimalImageUrl(animal, { storage });
  if (cachedUrl) {
    return cachedUrl;
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
      return cacheResolvedImageUrl(animal, data.message, { storage });
    }

    if (animal?.especie === "gato") {
      const response = await fetchImpl(RANDOM_CAT_API);
      if (!response.ok) {
        return FALLBACK_IMAGE;
      }
      const data = await response.json();
      const url = Array.isArray(data) ? data[0]?.url : null;
      return cacheResolvedImageUrl(animal, url, { storage });
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

function cacheResolvedImageUrl(animal, url, { storage }) {
  const cleanUrl = typeof url === "string" ? url.trim() : "";
  if (!cleanUrl) {
    return FALLBACK_IMAGE;
  }

  const key = animalImageCacheKey(animal);
  if (key && storage && cleanUrl !== FALLBACK_IMAGE) {
    try {
      storage.setItem(key, cleanUrl);
    } catch {
      // Image cache is an optimization only; failures should not break rendering.
    }
  }

  return cleanUrl;
}

function animalImageCacheKey(animal) {
  const identity = animal?.id ?? animal?.nome;
  const cleanIdentity = String(identity || "").trim().toLowerCase();
  const cleanSpecies = String(animal?.especie || "animal").trim().toLowerCase();

  if (!cleanIdentity) {
    return "";
  }

  return `${IMAGE_CACHE_PREFIX}${cleanSpecies}:${cleanIdentity}`;
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
