import Image from "next/image";

interface BrandMarkProps {
  className?: string;
  title?: string;
}

/** Frames the supplied logo's black mark while leaving its source asset untouched. */
export function BrandMark({ className = "", title = "Synora" }: BrandMarkProps) {
  // The source file remains unchanged; CSS frames its central rounded-square mark.
  const sizingClasses = className
    .split(/\s+/)
    .filter((name) => name && !/^w-/.test(name))
    .join(" ");

  return (
    <span className={`brand-mark ${sizingClasses}`} role="img" aria-label={title}>
      <Image
        className="brand-mark-image"
        src="/brand/synora-logo.png"
        alt=""
        width={822}
        height={543}
        priority
      />
    </span>
  );
}
