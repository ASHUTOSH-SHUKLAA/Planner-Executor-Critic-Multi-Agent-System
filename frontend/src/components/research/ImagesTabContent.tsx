"use client";

import React from "react";
import { getProxiedImageUrl } from "@/lib/api";

interface ImagesTabContentProps {
  images: {
    url: string;
    alt?: string;
    caption?: string;
  }[];
}

export function ImagesTabContent({ images }: ImagesTabContentProps) {
  if (!images || images.length === 0) {
    return (
      <div className="p-8 text-center text-xs text-[var(--text-muted)] rounded-2xl border border-[var(--border)] bg-[var(--surface)] max-w-xl mx-auto my-6">
        No images found for this research inquiry.
      </div>
    );
  }

  return (
    <div
      className="space-y-4 max-w-4xl mx-auto py-2"
      data-testid="images-tab-content"
    >
      <div className="pb-3 border-b border-[var(--border)]">
        <h2 className="text-base font-semibold text-[var(--text)]">
          Visual Artifacts &amp; Figures ({images.length})
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">
          Images captured from grounded research sources
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {images.map((img, idx) => {
          const proxied = getProxiedImageUrl(img.url);
          return (
            <div
              key={idx}
              className="rounded-2xl border border-[var(--border)] bg-[var(--surface)] p-3 shadow-xs overflow-hidden space-y-2 group"
            >
              <div className="aspect-video w-full rounded-xl bg-[var(--surface-hover)] overflow-hidden flex items-center justify-center">
                <img
                  src={proxied}
                  alt={img.alt || "Research figure"}
                  className="w-full h-full object-contain group-hover:scale-102 transition-transform duration-200"
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                  }}
                />
              </div>
              {img.caption && (
                <p className="text-xs text-[var(--text-muted)] truncate px-1 font-medium">
                  {img.caption}
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

