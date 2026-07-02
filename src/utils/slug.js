const generateSlug = (text) => {
  return text
    .toString()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
};

const generateUniqueSlug = async (prismaModel, text, excludeId = null) => {
  const rawSlug = generateSlug(text);

  const existing = await prismaModel.findUnique({
    where: { slug: rawSlug },
  });

  if (!existing || (excludeId && existing.id === excludeId)) {
    return rawSlug;
  }

  return `${rawSlug}-${Date.now()}`;
};

module.exports = { generateSlug, generateUniqueSlug };