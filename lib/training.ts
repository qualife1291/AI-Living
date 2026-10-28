import type { World } from './world';
import { worldTime, weatherAt } from './clock';
import { eventSchema, type EventInput } from './event-schema';
import {selectContextCards,type ContextCard,type ContextOptions} from './living/context-cards';
export {neighborhoodContexts} from './living/context-cards';
export type {ContextCard} from './living/context-cards';
import goldenEpisodesData from '../data/training/sft-golden-episodes.json';
import dpoPairsData from '../data/training/dpo-preference-pairs.json';
import curriculumData from '../data/training/self-play-curriculum.json';

export type DpoPreferencePair = {
  id: string;
  dimension: string;
  scenario: string;
  chosen: Record<string, unknown>;
  rejected: Record<string, unknown>;
  critique: string;
};

export type CurriculumStage = {
  level: number;
  code: string;
  title: string;
  objective: string;
  requiredConstraints: string[];
  targetScore: number;
};

export type EvaluationReport = {
  validSchema: boolean;
  totalScore: number; // 0..100
  metrics: {
    schemaAndBounds: number; // 0..25
    coLocationAndTiming: number; // 0..25
    naturalVietnamese: number; // 0..20
    repetitionPenalty: number; // 0..15 (15 = no repetition)
    continuityAndEthics: number; // 0..15
  };
  issues: string[];
  reflexionPrompt: string;
};

export const goldenEpisodes: EventInput[] = goldenEpisodesData as EventInput[];
export const dpoPreferencePairs: DpoPreferencePair[] = dpoPairsData as DpoPreferencePair[];
export const selfPlayCurriculum: CurriculumStage[] = curriculumData as CurriculumStage[];

/**
 * Selects the top matching situational context cards for the current world state,
 * phase of day, weather, and resident needs, using a deterministic PRNG tie-breaker.
 */
export function selectActiveContexts(
  world: World,
  nowMs: number,
  count = 2,
  options:ContextOptions={},
): ContextCard[] {
  return selectContextCards(world,nowMs,count,options);
}

/**
 * Synthesizes a multi-context director prompt combining WorldTime, Weather,
 * resident needs, witness-bound memories, and few-shot exemplars.
 */
export function synthesizeContextPrompt(
  world: World,
  nowMs: number,
  revision = 0,
): string {
  const wt = worldTime(world, nowMs);
  const weather = weatherAt(world.born || 'xom-ai', wt, world.clock?.weatherOverride);
  const cards = selectActiveContexts(world, nowMs, 2);
  const exemplar = goldenEpisodes[wt.dayIndex % goldenEpisodes.length];

  const residentSummary = world.people
    .map(
      (p) =>
        `- ${p.name} (${p.id}): tại "${p.location}", đang "${p.activity}", tiền ${p.money}đ, năng lượng ${p.energy}/100, độ đói ${p.hunger}/100, kỹ năng ${p.skill}/100. Mục tiêu: "${p.goal}". Ký ức gần nhất: "${p.memories.at(-1) ?? 'Chưa có'}".`,
    )
    .join('\n');

  const contextSection = cards
    .map(
      (c, i) =>
        `[Bối cảnh gợi ý #${i + 1}: ${c.title} (${c.category})]\n  Mô tả: ${c.promptHint}\n  Địa điểm gợi ý: ${c.locations.join(', ')}\n  Hoạt động gợi ý: ${c.suggestedActivities.join(' · ')}`,
    )
    .join('\n\n');

  return [
    `=== TỔNG HỢP BỐI CẢNH LƯỢT SINH HOẠT XÓM AI (Revision ${revision}) ===`,
    `Thời gian mô phỏng: Ngày thứ ${wt.dayIndex + 1} · ${wt.phaseLabel} (${wt.hour.toFixed(1)}h) · ${wt.seasonLabel}`,
    `Thời tiết hiện tại: ${weather.label} (${weather.kind}, ~${weather.tempC}°C)`,
    '',
    'TRẠNG THÁI CƯ DÂN:',
    residentSummary,
    '',
    'BỐI CẢNH BIÊN TẬP GỢI Ý (không phải sự kiện đã diễn ra hoặc ký ức đã chứng kiến):',
    contextSection,
    '',
    'MẪU GOLDEN EPISODE THAM KHẢO (FEW-SHOT):',
    JSON.stringify(
      {
        title: exemplar.title,
        summary: exemplar.summary,
        dialogue: exemplar.dialogue.slice(0, 2),
      },
      null,
      2,
    ),
  ].join('\n');
}

function extractBigrams(text: string): Set<string> {
  const words = text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean);
  const out = new Set<string>();
  for (let i = 0; i < words.length - 1; i++) {
    out.add(`${words[i]} ${words[i + 1]}`);
  }
  return out;
}

/**
 * Evaluates a candidate AI event against the 5 quality metrics from XOM-AI_REVIEW.md §6.9
 * and generates a self-critique Reflexion prompt for iterative self-training.
 */
export function evaluateCandidateEvent(
  candidate: unknown,
  recentEvents: { title?: string; summary?: string; dialogue?: { text: string }[] }[] = [],
  world?: World,
): EvaluationReport {
  const issues: string[] = [];
  const parsed = eventSchema.safeParse(candidate);

  if (!parsed.success) {
    const schemaIssues = parsed.error.issues.map(
      (i) => `Schema [${i.path.join('.') || 'root'}]: ${i.message}`,
    );
    return {
      validSchema: false,
      totalScore: 0,
      metrics: {
        schemaAndBounds: 0,
        coLocationAndTiming: 0,
        naturalVietnamese: 0,
        repetitionPenalty: 0,
        continuityAndEthics: 0,
      },
      issues: schemaIssues,
      reflexionPrompt: `Bản nháp sự kiện chưa đạt chuẩn schema:\n${schemaIssues.join('\n')}\nHãy sửa đúng cấu trúc JSON của eventSchema.`,
    };
  }

  const ev = parsed.data;
  let schemaAndBounds = 25;
  let coLocationAndTiming = 25;
  let naturalVietnamese = 20;
  let repetitionPenalty = 15;
  let continuityAndEthics = 15;

  // 1. Check duplicate character changes & money bounds
  const changeIds = ev.changes.map((c) => c.id);
  if (new Set(changeIds).size !== changeIds.length) {
    schemaAndBounds -= 15;
    issues.push('Nhân vật bị lặp lại nhiều lần trong mảng changes.');
  }
  if (world) {
    for (const c of ev.changes) {
      const person = world.people.find((p) => p.id === c.id);
      if (person && person.money + c.moneyDelta < 0) {
        schemaAndBounds -= 15;
        issues.push(`Nhân vật ${c.id} bị âm tiền sau khi cộng moneyDelta.`);
      }
    }
  }

  // 2. Co-location and timing check
  const timedLines = ev.dialogue.filter((d) => typeof d.atSecond === 'number');
  for (let i = 0; i < timedLines.length; i++) {
    const line = timedLines[i];
    if ((line.atSecond ?? 0) < 20) {
      coLocationAndTiming -= 6;
      issues.push(
        `Câu thoại của ${line.speaker} ở giây ${line.atSecond} quá sớm (< 20s), chưa đủ thời gian đi bộ tới điểm hẹn.`,
      );
    }
    if (i > 0) {
      const prev = timedLines[i - 1];
      const gap = (line.atSecond ?? 0) - (prev.atSecond ?? 0);
      if (gap < 5) {
        coLocationAndTiming -= 5;
        issues.push(
          `Khoảng cách giữa hai câu thoại liên tiếp (${prev.atSecond}s → ${line.atSecond}s) nhỏ hơn 5 giây.`,
        );
      }
    }
  }

  // Verify dialogue location matches at least one step in speaker's plan or final location
  for (const line of ev.dialogue) {
    if (!line.location) continue;
    const ch = ev.changes.find((c) => c.id === line.speaker);
    if (ch) {
      const validLocs = new Set([
        ch.location,
        ...(ch.plan?.map((s) => s.location) ?? []),
      ]);
      if (!validLocs.has(line.location as typeof ch.location)) {
        coLocationAndTiming -= 8;
        issues.push(
          `Địa điểm thoại "${line.location}" của ${line.speaker} không khớp với location hoặc các bước trong plan.`,
        );
      }
    }
  }

  // 3. Natural Vietnamese dialogue check
  const corporateBuzzwords = ['tối ưu hóa', 'chiến lược', 'hiệu suất toàn diện', 'quy trình'];
  for (const line of ev.dialogue) {
    const lower = line.text.toLowerCase();
    if (corporateBuzzwords.some((bw) => lower.includes(bw))) {
      naturalVietnamese -= 6;
      issues.push(`Câu thoại của ${line.speaker} dùng từ ngữ hành chính/khẩu hiệu kém tự nhiên.`);
    }
    if (line.text.length > 220) {
      naturalVietnamese -= 4;
      issues.push(`Câu thoại của ${line.speaker} quá dài (${line.text.length} ký tự); nên giữ ngắn gọn đời thường.`);
    }
  }

  // 4. N-gram repetition check against recent events
  if (recentEvents.length > 0) {
    const currentText = [ev.title, ev.summary, ...ev.dialogue.map((d) => d.text)].join(' ');
    const currentBigrams = extractBigrams(currentText);
    let maxOverlap = 0;
    for (const old of recentEvents.slice(0, 10)) {
      const oldText = [
        old.title ?? '',
        old.summary ?? '',
        ...(old.dialogue?.map((d) => d.text) ?? []),
      ].join(' ');
      const oldBigrams = extractBigrams(oldText);
      if (currentBigrams.size > 0 && oldBigrams.size > 0) {
        let shared = 0;
        for (const bg of currentBigrams) {
          if (oldBigrams.has(bg)) shared++;
        }
        const ratio = shared / currentBigrams.size;
        if (ratio > maxOverlap) maxOverlap = ratio;
      }
    }
    if (maxOverlap > 0.35) {
      repetitionPenalty -= Math.min(15, Math.round((maxOverlap - 0.25) * 30));
      issues.push(
        `Tỷ lệ trùng lặp cụm từ với các cảnh trước khá cao (${Math.round(maxOverlap * 100)}%).`,
      );
    }
  }

  // 5. Continuity & ethical ecology check
  const combinedLower = `${ev.summary} ${ev.changes.map((c) => c.memory).join(' ')}`.toLowerCase();
  if (combinedLower.includes('đuổi bắt sẻ') || combinedLower.includes('săn chim sẻ')) {
    continuityAndEthics -= 15;
    issues.push('Vi phạm nguyên tắc sinh thái: không cho mèo săn hoặc chó đuổi đàn sẻ.');
  }

  schemaAndBounds = Math.max(0, schemaAndBounds);
  coLocationAndTiming = Math.max(0, coLocationAndTiming);
  naturalVietnamese = Math.max(0, naturalVietnamese);
  repetitionPenalty = Math.max(0, repetitionPenalty);
  continuityAndEthics = Math.max(0, continuityAndEthics);

  const totalScore =
    schemaAndBounds +
    coLocationAndTiming +
    naturalVietnamese +
    repetitionPenalty +
    continuityAndEthics;

  const reflexionPrompt =
    issues.length === 0
      ? 'Bản nháp đạt chuẩn chất lượng cao (không phát hiện lỗi logic hay giọng điệu). Có thể ghi vào thế giới.'
      : `Điểm tự đánh giá: ${totalScore}/100. Hãy tự hiệu chỉnh các điểm sau trước khi gửi POST /api/events:\n` +
        issues.map((item, idx) => `${idx + 1}. ${item}`).join('\n');

  return {
    validSchema: true,
    totalScore,
    metrics: {
      schemaAndBounds,
      coLocationAndTiming,
      naturalVietnamese,
      repetitionPenalty,
      continuityAndEthics,
    },
    issues,
    reflexionPrompt,
  };
}
