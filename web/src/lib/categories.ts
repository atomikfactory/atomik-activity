export type CategoryKey = "home" | "work" | "recurring" | "other";

export interface CategoryMeta {
  key: CategoryKey;
  label: string;
  color: string; // ring + dot color
  badge: string; // Tailwind classes for the pill badge
}

export const CATEGORY_OPTIONS: CategoryMeta[] = [
  {
    key: "home",
    label: "Home",
    color: "#10b981",
    badge:
      "bg-emerald-50 text-emerald-700 ring-emerald-600/20 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-500/30",
  },
  {
    key: "work",
    label: "Work",
    color: "#f59e0b",
    badge:
      "bg-amber-50 text-amber-800 ring-amber-600/20 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-500/30",
  },
  {
    key: "recurring",
    label: "Recurring",
    color: "#3b82f6",
    badge:
      "bg-blue-50 text-blue-700 ring-blue-600/20 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-500/30",
  },
  {
    key: "other",
    label: "Other",
    color: "#64748b",
    badge:
      "bg-slate-100 text-slate-700 ring-slate-500/20 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-500/30",
  },
];

const byKey = new Map(CATEGORY_OPTIONS.map((c) => [c.key, c]));

export function getCategoryMeta(category: string | undefined): CategoryMeta {
  if (!category) return byKey.get("other")!;
  return byKey.get(category as CategoryKey) ?? byKey.get("other")!;
}

export function getCategoryColor(
  category: string | undefined,
  override?: string | null,
): string {
  return override?.trim() || getCategoryMeta(category).color;
}
