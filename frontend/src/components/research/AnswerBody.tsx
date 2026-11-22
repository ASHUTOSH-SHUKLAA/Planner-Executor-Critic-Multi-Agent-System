"use client";

import React, { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { ExternalLink, ShoppingCart, Globe } from "lucide-react";
import { SourceItem } from "@/lib/research-view-model";
import { getProxiedImageUrl } from "@/lib/api";

interface AnswerBodyProps {
  markdown: string;
  sources?: SourceItem[];
  highlightedDomain?: string | null;
  onHoverDomain?: (domain: string | null) => void;
}

export function AnswerBody({
  markdown,
  sources = [],
  highlightedDomain,
  onHoverDomain,
}: AnswerBodyProps) {
  const [hoveredCitation, setHoveredCitation] = useState<{
    source: SourceItem;
    x: number;
    y: number;
  } | null>(null);

  // Helper to find source by URL or domain
  const findSource = (urlOrDomain: string): SourceItem | undefined => {
    return sources.find(
      (s) =>
        s.url.toLowerCase() === urlOrDomain.toLowerCase() ||
        s.domain.toLowerCase() === urlOrDomain.toLowerCase() ||
        (urlOrDomain.includes(s.domain.toLowerCase()) && s.domain.length > 3)
    );
  };

  return (
    <div
      className="research-answer-body relative text-[var(--text)] font-sans"
      data-testid="research-answer-body"
    >
      <div className="prose dark:prose-invert max-w-none text-[var(--text)]">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          components={{
            h1: ({ children }) => (
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-[var(--text)] mt-8 mb-4 border-b border-[var(--border)] pb-3 font-headline">
                {children}
              </h1>
            ),
            h2: ({ children }) => (
              <h2 className="text-lg sm:text-xl font-bold text-[var(--text)] mt-7 mb-3 tracking-tight flex items-center gap-2 font-headline before:content-[''] before:inline-block before:w-1.5 before:h-5 before:rounded-full before:bg-[var(--accent)]">
                {children}
              </h2>
            ),
            h3: ({ children }) => (
              <h3 className="text-base sm:text-lg font-bold text-[var(--text)] mt-5 mb-2 tracking-tight font-headline">
                {children}
              </h3>
            ),
            p: ({ children }) => (
              <p className="mb-4 leading-[1.7] text-[var(--text)] text-[15.5px] sm:text-[16.5px] w-full">
                {children}
              </p>
            ),
            ul: ({ children }) => (
              <ul className="list-disc pl-5 my-3.5 space-y-2 text-[var(--text)] text-[15.5px] sm:text-[16.5px] w-full">
                {children}
              </ul>
            ),
            ol: ({ children }) => (
              <ol className="list-decimal pl-5 my-3.5 space-y-2 text-[var(--text)] text-[15.5px] sm:text-[16.5px] w-full">
                {children}
              </ol>
            ),
            li: ({ children }) => (
              <li className="leading-[1.7] text-[var(--text)]">{children}</li>
            ),
            table: ({ children }) => (
              <div className="overflow-x-auto my-6 rounded-2xl border border-[var(--border)] shadow-xs bg-[var(--surface)]">
                <table className="min-w-full divide-y divide-[var(--border)] text-xs text-left">
                  {children}
                </table>
              </div>
            ),
            thead: ({ children }) => (
              <thead className="bg-[var(--surface-hover)] text-[var(--text)] font-semibold font-mono text-[11px] uppercase tracking-wider">
                {children}
              </thead>
            ),
            tbody: ({ children }) => (
              <tbody className="divide-y divide-[var(--border)] bg-[var(--surface)]">
                {children}
              </tbody>
            ),
            tr: ({ children }) => (
              <tr className="hover:bg-[var(--surface-hover)]/60 transition-colors">
                {children}
              </tr>
            ),
            th: ({ children }) => (
              <th className="px-4 py-3 font-semibold text-[var(--text)] uppercase tracking-wider text-[11px] font-mono">
                {children}
              </th>
            ),
            td: ({ children }) => (
              <td className="px-4 py-3 text-[var(--text)] whitespace-normal leading-relaxed text-xs">
                {children}
              </td>
            ),
            code: ({ inline, className, children, ...props }: any) => {
              if (inline) {
                return (
                  <code className="px-1.5 py-0.5 rounded-md bg-[var(--surface-hover)] border border-[var(--border)] font-mono text-xs text-[var(--accent)] font-medium">
                    {children}
                  </code>
                );
              }
              return (
                <div className="relative my-4 rounded-xl border border-[var(--border)] bg-[#121929] text-[#f4f1f8] overflow-hidden shadow-xs">
                  <pre className="p-4 overflow-x-auto text-xs font-mono leading-relaxed">
                    <code {...props}>{children}</code>
                  </pre>
                </div>
              );
            },
            blockquote: ({ children }) => (
              <blockquote className="border-l-4 border-[var(--accent)] pl-4 py-2.5 bg-[var(--accent)]/5 rounded-r-xl my-4 text-[var(--text)] not-italic border-y border-r border-[var(--border)]/60">
                {children}
              </blockquote>
            ),
            img: ({ src, alt }) => {
              const originalSrc = typeof src === "string" ? src : "";
              const proxied = getProxiedImageUrl(originalSrc);
              return (
                <span className="block my-4 not-prose">
                  <span className="relative inline-block max-w-full rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-md overflow-hidden transition-transform hover:scale-[1.01]">
                    <img
                      src={proxied}
                      alt={alt || "Illustration"}
                      className="max-h-72 w-auto object-contain mx-auto rounded-xl"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      onError={(e) => {
                        const target = e.currentTarget;
                        if (originalSrc && target.src !== originalSrc) {
                          target.src = originalSrc;
                        } else {
                          // Hide broken image container cleanly without hardcoded mock imagery
                          target.style.display = "none";
                          const parentCard = target.closest("span.not-prose");
                          if (parentCard) {
                            (parentCard as HTMLElement).style.display = "none";
                          }
                        }
                      }}
                    />
                    {alt && (
                      <span className="block text-center text-[11px] font-semibold text-[var(--text-muted)] mt-2 truncate max-w-xs sm:max-w-md mx-auto">
                        {alt}
                      </span>
                    )}
                  </span>
                </span>
              );
            },
            a: ({ href, children }) => {
              if (!href) return <span>{children}</span>;
              const lower = href.toLowerCase();

              // Safe retail link rendering: show shopping button
              const isEdu =
                lower.includes(".edu") ||
                lower.includes(".ac.in") ||
                lower.includes("nirfindia.org");
              const isRetail =
                (lower.includes("amazon.") ||
                  lower.includes("flipkart.") ||
                  lower.includes("croma.") ||
                  lower.includes("reliancedigital.")) &&
                !isEdu;

              if (isRetail) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1 my-0.5 rounded-lg text-xs font-semibold bg-[var(--accent)]/10 text-[var(--accent)] border border-[var(--accent)]/25 hover:bg-[var(--accent)]/20 transition-all shadow-2xs no-underline"
                  >
                    <ShoppingCart className="h-3.5 w-3.5 text-[var(--accent)]" />
                    <span>{children}</span>
                    <ExternalLink className="h-2.5 w-2.5 opacity-60 ml-0.5" />
                  </a>
                );
              }

              // Check if this link corresponds to a grounded source citation
              const matchingSource = findSource(href);
              const isMatchingHighlighted =
                matchingSource &&
                highlightedDomain &&
                matchingSource.domain.toLowerCase() ===
                highlightedDomain.toLowerCase();

              return (
                <span className="relative inline-block">
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    onMouseEnter={(e) => {
                      if (matchingSource) {
                        const rect = e.currentTarget.getBoundingClientRect();
                        setHoveredCitation({
                          source: matchingSource,
                          x: rect.left,
                          y: rect.bottom + window.scrollY,
                        });
                        onHoverDomain?.(matchingSource.domain);
                      }
                    }}
                    onMouseLeave={() => {
                      setHoveredCitation(null);
                      onHoverDomain?.(null);
                    }}
                    className={`inline-flex items-center gap-1 font-medium transition-colors cursor-pointer ${matchingSource
                      ? "text-[var(--accent)] hover:underline decoration-1"
                      : "text-[var(--accent)] hover:underline"
                      } ${isMatchingHighlighted ? "ring-2 ring-[var(--accent)] rounded px-0.5 bg-[var(--accent)]/10" : ""}`}
                  >
                    <span>{children}</span>
                    <ExternalLink className="h-2.5 w-2.5 inline opacity-70" />
                  </a>
                </span>
              );
            },
          }}
        >
          {markdown}
        </ReactMarkdown>
      </div>

      {/* Citation Popover / Hover Card */}
      {hoveredCitation && (
        <div
          className="fixed z-50 w-72 rounded-xl border border-[var(--border)] bg-[var(--surface-elevated)] p-3 shadow-xl pointer-events-none animate-in fade-in zoom-in-95 duration-100"
          style={{
            left: `${Math.min(window.innerWidth - 300, Math.max(16, hoveredCitation.x - 30))}px`,
            top: `${hoveredCitation.y - window.scrollY + 8}px`,
          }}
        >
          <div className="flex items-center gap-2 mb-1.5">
            {hoveredCitation.source.faviconUrl ? (
              <img
                src={hoveredCitation.source.faviconUrl}
                alt=""
                className="h-3.5 w-3.5 rounded-xs shrink-0 object-contain"
              />
            ) : (
              <Globe className="h-3.5 w-3.5 text-[var(--accent)] shrink-0" />
            )}
            <span className="font-mono text-[11px] font-semibold text-[var(--text-muted)] truncate">
              {hoveredCitation.source.domain}
            </span>
          </div>
          <p className="text-xs font-semibold text-[var(--text)] line-clamp-2 leading-snug mb-1">
            {hoveredCitation.source.title}
          </p>
          {hoveredCitation.source.snippet && (
            <p className="text-[11px] text-[var(--text-muted)] italic line-clamp-2 mb-2 leading-tight">
              &quot;{hoveredCitation.source.snippet}&quot;
            </p>
          )}
          <div className="flex items-center gap-1 text-[10px] text-[var(--accent)] font-medium">
            <span>View source</span>
            <ExternalLink className="h-2.5 w-2.5" />
          </div>
        </div>
      )}
    </div>
  );
}

