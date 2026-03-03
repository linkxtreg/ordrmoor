import type { ImgHTMLAttributes } from 'react';

const LOGO_ASPECT = 366 / 199; // width / height (uploaded OrdrMoor logo)

interface LogoProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  /** Height in pixels; width scales to preserve aspect ratio */
  height?: number;
}

export function Logo({ height = 32, className, style, ...rest }: LogoProps) {
  const h = height ?? 32;
  const w = Math.round(LOGO_ASPECT * h);
  return (
    <img
      src="/Images/ordrmoor-logo.png"
      alt=""
      width={w}
      height={h}
      className={className}
      style={{ display: 'block', ...style }}
      aria-hidden
      {...rest}
    />
  );
}
