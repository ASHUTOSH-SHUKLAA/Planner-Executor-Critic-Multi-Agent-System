/**
 * Typography System Configuration
 *
 * Provides three curated font pairings with Option A as the production default.
 * Switching pairings across the entire platform is a one-line change here.
 */

export type TypographyPairing = "A" | "B" | "C";

export interface PairingDefinition {
  id: TypographyPairing;
  name: string;
  subtitle: string;
  badge: string;
  uiFont: string;
  headlineFont: string;
  monoFont: string;
  cssClass: string;
  description: string;
  features: string;
}

export const TYPOGRAPHY_PAIRINGS: Record<TypographyPairing, PairingDefinition> = {
  A: {
    id: "A",
    name: "Option A: Inter Clean",
    subtitle: "Plus Jakarta Sans + Inter Variable + JetBrains Mono",
    badge: "Modern UI",
    uiFont: "'Plus Jakarta Sans', 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Devanagari', 'Noto Sans Kannada', sans-serif",
    headlineFont: "'Plus Jakarta Sans', 'Outfit', 'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    monoFont: "'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    cssClass: "font-pairing-a",
    description: "Neutral, calm, and extraordinarily legible at small sizes. Uses OpenType disambiguation alternates (cv05/cv08) so uppercase I and lowercase l are instantly distinct. Closest to Perplexity's research feel.",
    features: '"cv05" 1, "cv08" 1, "calt" 1',
  },
  B: {
    id: "B",
    name: "Option B: Geist Modern",
    subtitle: "Geist Sans + Geist Mono",
    badge: "Technical AI",
    uiFont: "var(--font-geist-sans), 'Geist Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans Devanagari', sans-serif",
    headlineFont: "var(--font-geist-sans), 'Geist Sans', sans-serif",
    monoFont: "var(--font-geist-mono), 'Geist Mono', monospace",
    cssClass: "font-pairing-b",
    description: "Modern, sharp, and technical. Purpose-built for developers and AI interfaces with precise geometric proportions.",
    features: '"calt" 1',
  },
  C: {
    id: "C",
    name: "Option C: Editorial Research",
    subtitle: "Newsreader Serif + Inter + JetBrains Mono",
    badge: "Recommended Default",
    uiFont: "'Inter Variable', 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
    headlineFont: "'Newsreader Variable', 'Newsreader', Georgia, 'Times New Roman', serif",
    monoFont: "'JetBrains Mono', SFMono-Regular, Menlo, Monaco, Consolas, monospace",
    cssClass: "font-pairing-c",
    description: "Combines an authoritative, warm literary serif for the primary hero title and report headers with crisp Inter Variable UI copy for high-density tables and cards.",
    features: '"cv05" 1, "cv08" 1, "calt" 1',
  },
};

/**
 * Synora's production pairing uses Newsreader for editorial headings and Inter for UI text.
 * Change this single value to "A", "B", or "C" to switch typography platform-wide.
 */
export const ACTIVE_TYPOGRAPHY_PAIRING: TypographyPairing = "A";
