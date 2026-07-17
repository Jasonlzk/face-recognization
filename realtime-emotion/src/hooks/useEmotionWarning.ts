import { useCallback, useEffect, useRef, useState } from "react"
import {
  buildPayload,
  computeWarning,
  defaultNotify,
  DEFAULT_WARNING_CONFIG,
  EMPTY_STATE,
  type WarningConfig,
  type WarningLevel,
  type WarningPayload,
  type WarningState,
} from "@/lib/warning"
import type { ExpressionScores } from "@/lib/emotions"

/** 后台日志记录条目（一级即记录） */
export interface WarningLogEntry {
  level: WarningLevel
  timestamp: number
  label: string
  confidence: number
  note: string
}

/** 预警回调：二级通知相关方 / 三级紧急干预 */
export interface WarningHandlers {
  onLevel2?: (p: WarningPayload) => void
  onLevel3?: (p: WarningPayload) => void
}

export interface EmotionWarningState {
  warning: WarningState
  warningLog: WarningLogEntry[]
  /** 二级：是否正在展示通知浮窗 */
  notifying: boolean
  /** 三级：是否已触发阻断（需手动解除） */
  blocked: boolean
  dismiss: () => void
}

/**
 * 将实时情绪分数转化为三级预警状态。
 * 与原有 useFaceEmotion 解耦：仅消费 scores，不改变识别结果。
 *
 * @param scores  来自 useFaceEmotion 的 7 类情绪概率
 * @param active  识别是否进行中（running）
 * @param config  预警阈值配置（可覆盖 DEFAULT_WARNING_CONFIG）
 * @param handlers 二级/三级回调（如通知、阻断），可选
 */
export function useEmotionWarning(
  scores: ExpressionScores,
  active: boolean,
  config: WarningConfig = DEFAULT_WARNING_CONFIG,
  handlers: WarningHandlers = {},
): EmotionWarningState {
  const [warning, setWarning] = useState<WarningState>(EMPTY_STATE)
  const [warningLog, setWarningLog] = useState<WarningLogEntry[]>([])
  const [notifying, setNotifying] = useState(false)
  const [blocked, setBlocked] = useState(false)

  const persistenceRef = useRef(0)
  const lastLevelRef = useRef<WarningLevel>("none")
  const notifyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  // 用 ref 持有 handlers，避免内联对象导致 effect 频繁重跑
  const handlersRef = useRef(handlers)
  handlersRef.current = handlers

  const pushLog = useCallback(
    (level: WarningLevel, w: WarningState) => {
      const ln = w.dominantNegative
      setWarningLog((prev) =>
        [
          {
            level,
            timestamp: Date.now(),
            label: ln?.label ?? "负面情绪",
            confidence: ln?.confidence ?? w.weightedIntensity,
            note:
              level === "level1"
                ? "后台记录"
                : level === "level2"
                  ? "已通知相关方"
                  : "已启动紧急干预/阻断",
          },
          ...prev,
        ].slice(0, 50),
      )
    },
    [],
  )

  useEffect(() => {
    if (!active) {
      // 停止识别时仅清掉实时等级显示；
      // 保留 blocked / notifying，直到用户手动 dismiss，避免阻断浮窗被立刻清掉。
      persistenceRef.current = 0
      lastLevelRef.current = "none"
      setWarning(EMPTY_STATE)
      return
    }

    const w0 = computeWarning(scores, persistenceRef.current, config)
    const negativePresent = w0.allNegatives.length > 0
    persistenceRef.current = negativePresent ? persistenceRef.current + 1 : 0

    const w = negativePresent
      ? computeWarning(scores, persistenceRef.current, config)
      : w0
    setWarning(w)

    const level = w.level
    if (level !== lastLevelRef.current) {
      const payload = buildPayload(w)
      if (level === "level1") {
        pushLog("level1", w)
      } else if (level === "level2") {
        handlersRef.current.onLevel2?.(payload)
        defaultNotify(payload)
        setNotifying(true)
        if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current)
        notifyTimerRef.current = setTimeout(() => setNotifying(false), 6000)
        pushLog("level2", w)
      } else if (level === "level3") {
        // 三级：紧急干预 / 阻断（由上层 onLevel3 处理，如停止采集）
        handlersRef.current.onLevel3?.(payload)
        setBlocked(true)
        pushLog("level3", w)
      }
      lastLevelRef.current = level
    }
  }, [scores, active, config, pushLog])

  const dismiss = useCallback(() => {
    setNotifying(false)
    setBlocked(false)
  }, [])

  useEffect(() => {
    return () => {
      if (notifyTimerRef.current) clearTimeout(notifyTimerRef.current)
    }
  }, [])

  return { warning, warningLog, notifying, blocked, dismiss }
}
