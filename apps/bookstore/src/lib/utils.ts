// Truncate a string to a max length, adding ellipsis if needed
export function truncate(str: string, maxLength: number): string {
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength - 1) + '…';
}
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const slugify = (str: string) =>
  str.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');

export function capitalizeWords(text: string): string {
  if (!text) return text;
  return text
    .toLowerCase()
    .replace(/\b\w/g, char => char.toUpperCase());
}