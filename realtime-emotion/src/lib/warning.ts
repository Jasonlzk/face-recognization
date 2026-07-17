// ============================================================
// 负面情绪三级预警机制（v1.1.0 新增）
// ------------------------------------------------------------
// 需求：针对愤怒、沮丧等负面情绪，构建三级预警：
//   一级（轻度负面）  -> 后台记录 + 轻提示
//   二级（中度负面）  -> 警告通知相关方
//   三级（重度负面）  -> 紧急干预 / 阻断（停止采集）
//
// 兼容性：本模块完全独立于原有情绪识别逻辑，仅消费 ExpressionScores，
//         不改变 face-api 的识别结果，对现有功能零侵入。
// 可调性：所有阈值集中在 WarningConfig（DEFAULT_WARNING_CONFIG 为默认），
//         上层可传入自定义配置以调整触发灵敏度。
// ============================================================

import type { EmotionKey, ExpressionScores } from "@/lib/emotions"

export type WarningLevel = "none" | "level1" | "level2" | "level3"

/** 需重点关注的负面情绪定义（含各自触发阈值与加权） */
export interface NegativeEmotionDef {
  key: EmotionKey
  /** 中文名（愤怒 / 沮丧 等） */
  label: string
  /** 计入判定的最低置信度（低于此值视为未出现） */
  triggerConf: number
  /** 负向强度权重，用于「叠加负向」判定，>1 表示该情绪更危险 */
  weight: number
}

/** 预警配置接口 —— 上层可传入覆盖，以调整各级阈值 */
export interface WarningConfig {
  /** 一级：任一负面情绪置信度达到此值即记录（轻度） */
  level1Threshold: number
  /** 二级：主导负面情绪置信度达到此值即通知相关方（中度） */
  level2Threshold: number
  /** 三级：主导负面情绪置信度达到此值即启动干预/阻断（重度） */
  level3Threshold: number
  /** 二级：加权负向强度达到此值（捕捉多个负面情绪叠加） */
  level2Weight: number
  /** 三级：加权负向强度达到此值（重度叠加） */
  level3Weight: number
  /** 升级到三级所需的持续帧数，避免瞬时抖动误触发阻断 */
  sustainFrames: number
  /** 负面情绪集合（愤怒 / 沮丧 等） */
  negatives: NegativeEmotionDef[]
}

export const DEFAULT_WARNING_CONFIG: WarningConfig = {
  level1Threshold: 0.25,
  level2Threshold: 0.45,
  level3Threshold: 0.65,
  level2Weight: 0.55,
  level3Weight: 0.85,
  sustainFrames: 8,
  negatives: [
    // 愤怒：权重最高，最易触发二级/三级
    { key: "angry", label: "愤怒", triggerConf: 0.3, weight: 1.6 },
    // 沮丧：face-api 无专属类别，以 sad 作为面部代理信号
    { key: "sad", label: "沮丧", triggerConf: 0.3, weight: 1.3 },
    { key: "fearful", label: "恐惧", triggerConf: 0.35, weight: 1.2 },
    { key: "disgusted", label: "厌恶", triggerConf: 0.35, weight: 1.1 },
  ],
}

/** 识别出的单个负面情绪 */
export interface DetectedNegative {
  key: EmotionKey
  label: string
  confidence: number
}

/** 当前预警状态 */
export interface WarningState {
  level: WarningLevel
  dominantNegative: DetectedNegative | null
  allNegatives: DetectedNegative[]
  /** 加权负向强度（0~1） */
  weightedIntensity: number
}

/** 预警事件载荷（用于回调/通知） */
export interface WarningPayload extends WarningState {
  timestamp: number
}

export interface WarningMeta {
  label: string
  color: string
  desc: string
}

export const WARNING_META: Record<Exclude<WarningLevel, "none">, WarningMeta> = {
  level1: { label: "一级 · 关注", color: "#0ea5e9", desc: "轻度负面，已后台记录" },
  level2: { label: "二级 · 警告", color: "#f59e0b", desc: "中度负面，已通知相关方" },
  level3: { label: "三级 · 预警", color: "#ef4444", desc: "重度负面，启动紧急干预" },
}

/** 识别文本/交互中的愤怒、沮丧等负面情绪（按置信度降序） */
export function detectNegativeEmotions(
  scores: ExpressionScores,
  cfg: WarningConfig = DEFAULT_WARNING_CONFIG,
): DetectedNegative[] {
  return cfg.negatives
    .filter((n) => scores[n.key] >= n.triggerConf)
    .map((n) => ({ key: n.key, label: n.label, confidence: scores[n.key] }))
    .sort((a, b) => b.confidence - a.confidence)
}

export const EMPTY_STATE: WarningState = {
  level: "none",
  dominantNegative: null,
  allNegatives: [],
  weightedIntensity: 0,
}

/** 计算加权负向强度（0~1） */
function weightedIntensity(
  scores: ExpressionScores,
  cfg: WarningConfig,
): number {
  let sum = 0
  for (const n of cfg.negatives) sum += Math.max(0, scores[n.key]) * n.weight
  return Math.min(1, sum)
}

/**
 * 计算当前预警等级。
 * @param scores     原始 7 类情绪概率（来自 face-api，保持原样，不影响识别）
 * @param persistence 负面情绪已持续的帧数（用于三级需「持续」才阻断）
 */
export function computeWarning(
  scores: ExpressionScores,
  persistence = 0,
  cfg: WarningConfig = DEFAULT_WARNING_CONFIG,
): WarningState {
  const allNegatives = detectNegativeEmotions(scores, cfg)
  const dominantNegative = allNegatives[0] ?? null
  const wIntensity = weightedIntensity(scores, cfg)

  let level: WarningLevel = "none"
  if (dominantNegative) {
    const c = dominantNegative.confidence
    if (c >= cfg.level3Threshold || wIntensity >= cfg.level3Weight) {
      // 重度：必须持续若干帧，避免单帧抖动误触发阻断
      level = persistence >= cfg.sustainFrames ? "level3" : "level2"
    } else if (c >= cfg.level2Threshold || wIntensity >= cfg.level2Weight) {
      level = "level2"
    } else if (c >= cfg.level1Threshold) {
      level = "level1"
    }
  }

  return { level, dominantNegative, allNegatives, weightedIntensity: wIntensity }
}

/** 由 WarningState 构造带时间戳的事件载荷 */
export function buildPayload(state: WarningState): WarningPayload {
  return { ...state, timestamp: Date.now() }
}

/** 二级预警默认通知：后台告警 + 浏览器通知（如已授权） */
export function defaultNotify(payload: WarningPayload): void {
  const label = payload.dominantNegative?.label ?? "负面情绪"
  const conf = payload.dominantNegative
    ? (payload.dominantNegative.confidence * 100).toFixed(0)
    : (payload.weightedIntensity * 100).toFixed(0)
  const msg = `${label} 置信度 ${conf}%，已触发二级预警并通知相关方`
  console.warn(`[情绪预警·二级] ${msg}`)
  if (typeof Notification !== "undefined") {
    if (Notification.permission === "granted") {
      new Notification("情绪预警（二级）", { body: msg })
    } else if (Notification.permission !== "denied") {
      Notification.requestPermission().then((p) => {
        if (p === "granted") new Notification("情绪预警（二级）", { body: msg })
      })
    }
  }
}
