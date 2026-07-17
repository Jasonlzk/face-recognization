import { AlertTriangle, ShieldAlert, Info, X } from "lucide-react"
import { WARNING_META } from "@/lib/warning"
import type { EmotionWarningState } from "@/hooks/useEmotionWarning"

interface WarningBannerProps {
  state: EmotionWarningState
  onDismiss: () => void
}

/**
 * 三级预警展示：
 *  - 三级 blocked：全屏紧急干预浮层（阻断）
 *  - 二级 notifying：右下角通知浮窗（已通知相关方）
 *  - 一级 level1：顶部轻提示条（后台已记录）
 * 保持非阻断、不干扰原有识别与展示。
 */
export function WarningBanner({ state, onDismiss }: WarningBannerProps) {
  const { warning, blocked, notifying } = state
  const level = warning.level

  // 三级：紧急干预 / 阻断浮层
  if (blocked) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-rose-950/70 p-4">
        <div className="max-w-md rounded-2xl bg-white p-6 text-center shadow-xl">
          <ShieldAlert className="mx-auto h-12 w-12 text-rose-600" />
          <h2 className="mt-3 text-xl font-bold text-rose-700">
            {WARNING_META.level3.label} · 紧急干预
          </h2>
          <p className="mt-2 text-sm text-slate-600">
            检测到重度负面（{warning.dominantNegative?.label ?? "情绪"}），系统已暂停采集并启动干预流程。
          </p>
          <button
            onClick={onDismiss}
            className="mt-5 rounded-xl bg-rose-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-rose-500"
          >
            我已处理 · 解除阻断
          </button>
        </div>
      </div>
    )
  }

  // 二级：通知相关方浮窗
  if (notifying) {
    return (
      <div className="fixed bottom-4 right-4 z-40 flex max-w-sm items-start gap-3 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 shadow-lg">
        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" />
        <div className="text-sm">
          <div className="font-semibold text-amber-800">
            {WARNING_META.level2.label} · 已通知相关方
          </div>
          <div className="text-amber-700">
            检测到中度负面：{warning.dominantNegative?.label ?? "情绪"}（
            {((warning.dominantNegative?.confidence ?? 0) * 100).toFixed(0)}%）
          </div>
        </div>
        <button
          onClick={onDismiss}
          className="ml-2 shrink-0 text-amber-500 transition hover:text-amber-700"
          aria-label="关闭"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    )
  }

  // 一级：轻提示条（后台已记录）
  if (level === "level1") {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-700">
        <Info className="h-4 w-4 shrink-0" />
        一级关注：检测到轻度负面（{warning.dominantNegative?.label ?? "情绪"}），已后台记录。
      </div>
    )
  }

  return null
}
