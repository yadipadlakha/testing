/* eslint-disable @next/next/no-img-element */

// Andeverywhere logo.
//
// Preferred: the real artwork at /public/andeverywhere-logo.png (or .svg).
// Drop the file there and set USE_IMAGE = true for a pixel-perfect mark.
// Until then we render a close CSS wordmark: a red ornate ampersand next to
// a stacked navy "and" / "everywhere" with a red accent letter.

const USE_IMAGE = false;
const LOGO_SRC = "/andeverywhere-logo.png";

export default function Logo({ compact = false }: { compact?: boolean }) {
  if (USE_IMAGE) {
    return (
      <img
        src={LOGO_SRC}
        alt="Andeverywhere"
        className={compact ? "h-9 w-auto" : "h-10 w-auto"}
      />
    );
  }

  return (
    <span className="flex items-center gap-1.5">
      <span className="font-serif text-[2rem] font-bold leading-none text-accent-500">
        &amp;
      </span>
      {!compact && (
        <span className="flex flex-col leading-[0.82]">
          <span className="text-sm font-extrabold lowercase tracking-tight text-brand-700">
            and
          </span>
          <span className="text-lg font-extrabold lowercase tracking-tight text-brand-700">
            everyw<span className="text-accent-500">h</span>ere
          </span>
        </span>
      )}
    </span>
  );
}
