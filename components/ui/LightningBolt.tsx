/**
 * Green lightning bolt SVG — the canonical Fuel Different brand bolt.
 * Tall, narrow, solid-filled shape with angular notch in the middle-left.
 * Matches the brand logo used across all marketing materials.
 *
 * Usage: <LightningBolt className="w-10 h-10" />
 */
export default function LightningBolt({ className = 'w-8 h-8' }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 100 160"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <polygon
        points="58,0 10,90 45,90 42,160 90,65 55,65 58,0"
        fill="#4ade80"
      />
    </svg>
  )
}
