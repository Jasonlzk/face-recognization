import { EMOTIONS, dominant, type ExpressionScores } from "@/lib/emotions"
import { EmotionBar } from "./EmotionBar"

interface EmotionPanelProps {
  scores: ExpressionScores
  hasFace: boolean
  active: boolean
}

export function EmotionPanel({ scores, hasFace, active }: EmotionPanelProps) {
  const top = dominant(scores)
  const topPct = (scores[top.key] * 100).toFixed(0)

  return (
    <div className="flex h-full flex-col gap-4 rounded-2xl border border-slate-200 bg-white/80 p-5 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-medium text-slate-500">实时情绪分析</h2>
        <span
          className={`inline-flex items-center gap-1 text-xs ${
            active ? "text-emerald-600" : "text-slate-400"
          }`}
        >
          <span
            className={`h-2 w-2 rounded-full ${
              active ? "animate-pulse bg-emerald-500" : "bg-slate-300"
            }`}
          />
          {active ? "识别中" : "待机"}
        </span>
      </div>

      {/* 主导情绪 */}
      <div className="flex flex-col items-center justify-center gap-1 rounded-xl bg-slate-50 py-6">
        <div className="text-5xl leading-none">{top.emoji}</div>
        <div className="text-lg font-semibold text-slate-800">{top.label}</div>
        <div className="text-xs text-slate-400">置信度 {topPct}%</div>
      </div>

      {/* 7 类情绪概率条 */}
      <div className="space-y-3">
        {EMOTIONS.map((meta) => (
          <EmotionBar
            key={meta.key}
            meta={meta}
            value={scores[meta.key]}
            active={meta.key === top.key && active}
          />
        ))}
      </div>

      {active && !hasFace && (
        <p className="mt-auto text-center text-xs text-amber-600">
          未检测到人脸，请将面部置于画面中央
        </p>
      )}
    </div>
  )
}
