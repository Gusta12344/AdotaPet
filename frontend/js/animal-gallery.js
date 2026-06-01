export function galleryUrls(animal) {
  const urls = Array.isArray(animal?.imagemUrls)
    ? animal.imagemUrls.map((url) => String(url || "").trim()).filter(Boolean)
    : [];

  return urls.length ? urls : [""];
}
