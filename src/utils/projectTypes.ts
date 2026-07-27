/**
 * Parses the comma-joined `projects.type` column into a clean, de-duplicated
 * list of labels. De-duping here also papers over legacy rows that got the
 * same labels saved twice (e.g. from the old opportunity→project conversion
 * bug), without requiring a data migration.
 */
export const getProjectTypes = (type: string | null | undefined): string[] => {
  if (!type) return [];
  return Array.from(new Set(type.split(",").map((t) => t.trim()).filter(Boolean)));
};
