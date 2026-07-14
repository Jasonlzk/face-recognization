import type { EmotionMeta } from "@/lib/emotions"

interface EmotionBarProps {
  meta: EmotionMeta
  value: number
  active: boolean
}

export function EmotionBar({ meta, value, active }: EmotionBarProps) {
  const pct = Math.max(0, Math.min(100, value * 100))
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-sm">
        <span className={active ? "font-semibold text-slate-900" : "text-slate-500"}>
          <span className="mr-1">{meta.emoji}</span>
          {meta.label}
        </span>
        <span className="tabular-nums text-slate-400">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-slate-200">
        <div
          className="h-full rounded-full transition-[width] duration-150 ease-out"
          style={{ width: `${pct}%`, backgroundColor: meta.color }}
        />
      </div>
    </div>
  )
}
