import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/**
 * Utility to merge Tailwind CSS classes dynamically with clsx conditionally
 */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}