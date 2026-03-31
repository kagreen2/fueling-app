/**
 * Green lightning bolt SVG — replaces the ⚡ emoji throughout the app
 * for consistent branding. Matches the Fuel Different green (#22C55E).
 *
 * Usage: <LightningBolt className="w-10 h-10" />
 */
export default function LightningBolt({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M13 2L4.09 12.63a1 1 0 00.77 1.62H11l-1 7.25a.5.5 0 00.86.42L19.91 11.37a1 1 0 00-.77-1.62H13l1-7.25a.5.5 0 00-.86-.42z"
        fill="#22C55E"
        stroke="#16A34A"
        strokeWidth="0.5"
      />
    </svg>
  )
}
