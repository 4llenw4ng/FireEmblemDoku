import { avatarBase } from "../game/index";
import { IconImg } from "./IconImg";

interface Props {
  name: string;
  className?: string;
}

/**
 * Circular character portrait with a plain placeholder background — renders
 * as just that background (no broken-image glyph) for the ~10% of names
 * without an avatar, so search rows and grid cells stay visually consistent
 * whether or not this particular character has art.
 */
export function Avatar({ name, className = "h-8 w-8" }: Props) {
  return (
    <span
      className={`inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-200 dark:bg-slate-700 ${className}`}
    >
      <IconImg base={avatarBase(name)} alt="" className="h-full w-full object-cover" />
    </span>
  );
}
