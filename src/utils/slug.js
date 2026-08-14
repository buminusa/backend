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
  const baseSlug = generateSlug(text);
  let slug = baseSlug;

  let existing = await prismaModel.findUnique({ where: { slug } });
  while (existing && !(excludeId && existing.id === excludeId)) {
    slug = `${baseSlug}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    existing = await prismaModel.findUnique({ where: { slug } });
  }

  return slug;
};

module.exports = { generateSlug, generateUniqueSlug };