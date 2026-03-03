type LoadingIconProps = {
  className?: string;
};

export function LoadingIcon({ className = 'w-8 h-8' }: LoadingIconProps) {
  return (
    <svg
      viewBox="0 0 200 200"
      className={`${className} animate-spin`}
      fill="none"
      aria-hidden
    >
      <path
        fillRule="evenodd"
        clipRule="evenodd"
        d="M153.666 65.0996L135.777 100.1L153.666 135.1H117.889L99.999 100.1L117.889 65.0996H153.666ZM99.666 100L81.7773 135H46L63.8887 100L46 65H81.7773L99.666 100Z"
        fill="black"
      />
    </svg>
  );
}
