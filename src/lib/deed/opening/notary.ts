import { toTitleCase } from "../../formatter";

export function formatNotaryName(rawName: string, upperCase: boolean = false) {
  const normalized = rawName
    .replace(/\bSH\b\.?/gi, "Sarjana Hukum")
    .replace(/\bM\b\.?\s*\bKn\b\.?/gi, "Magister Kenotariatan");
  return upperCase ? normalized.toUpperCase() : toTitleCase(normalized);
}
