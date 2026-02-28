type SVGsign2Props = {
  className?: string;
};

export default function SVGsign2({ className }: SVGsign2Props) {
  return (
    <svg
      viewBox="0 0 640 140"
      preserveAspectRatio="xMidYMid meet"
      className={className ?? "h-full w-full"}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <polygon points="16,112 284,26 624,112" fill="black" />
      <text
        x="360"
        y="84"
        textAnchor="middle"
        fontSize="72"
        fontFamily="monospace"
        fill="black"
      >
        StakeUp
      </text>
      <line x1="294" y1="96" x2="504" y2="96" stroke="black" strokeWidth="4" />
    </svg>
  );
}
