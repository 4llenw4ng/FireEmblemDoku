import { useEffect, useState } from "react";

// .gif first so an animated class icon (extracted ROM idle animation) is
// preferred automatically when one exists, falling back to a static image.
const EXTENSIONS = ["gif", "png", "svg", "webp"];

interface Props {
  /** path with no extension, e.g. "/icons/weapons/sword" */
  base: string;
  alt: string;
  className?: string;
  /** Fires once, only if every extension fails to load. Lets a caller that
   * hid its text label in favor of this icon (e.g. game-logo headers) fall
   * back to showing the label instead of rendering nothing. */
  onAllFailed?: () => void;
}

/**
 * Tries base.gif, then .png, .svg, .webp; renders nothing once all have
 * failed. Lets trait definitions point at an icon before the art exists
 * (e.g. class icons, sourced manually) without breaking the layout.
 */
export function IconImg({ base, alt, className, onAllFailed }: Props) {
  const [attempt, setAttempt] = useState(0);
  // Reset when the icon target changes (e.g. a new puzzle swaps traits) —
  // otherwise a prior failure count would carry over to the new path.
  useEffect(() => setAttempt(0), [base]);
  if (attempt >= EXTENSIONS.length) {
    return null;
  }
  return (
    <img
      src={`${base}.${EXTENSIONS[attempt]}`}
      alt={alt}
      className={className}
      onError={() => {
        setAttempt((n) => {
          const next = n + 1;
          if (next >= EXTENSIONS.length) onAllFailed?.();
          return next;
        });
      }}
    />
  );
}
