/**
 * progress.js - the progress summary shared by the header, checklist,
 * roadmap, missables and planner views.
 *
 * summarizeProgress(model, store) is a pure function of the frozen model and
 * the live store, so the app can memoize it on the store's change count.
 */

import { GRADE_WEIGHT, formatHours } from './data.js';

/** Count trophies earned per grade. */
export function gradeProgress(trophies, store) {
  const out = { platinum: 0, gold: 0, silver: 0, bronze: 0 };
  for (const t of trophies || []) {
    if (store.isEarned(t.name) && out[t.grade] != null) out[t.grade] += 1;
  }
  return out;
}

/** Produce the progress summary shared across the app. */
export function summarizeProgress(model, store) {
  const trophies = model.trophies;
  const total = trophies.length;

  const earnedNames = new Set();
  for (const t of trophies) {
    if (store.isEarned(t.name)) earnedNames.add(t.name);
  }
  const earnedCount = earnedNames.size;
  const percent = total ? Math.round((earnedCount / total) * 100) : 0;

  let weightTotal = 0;
  let weightEarned = 0;
  let hoursTotal = 0;
  let hoursRemaining = 0;
  const grades = { platinum: 0, gold: 0, silver: 0, bronze: 0 };

  for (const t of trophies) {
    const w = GRADE_WEIGHT[t.grade] ?? 1;
    weightTotal += w;
    if (grades[t.grade] != null) grades[t.grade] += 1;
    hoursTotal += t.timeHours || 0;
    if (earnedNames.has(t.name)) weightEarned += w;
    else hoursRemaining += t.timeHours || 0;
  }

  const weightPercent = weightTotal ? Math.round((weightEarned / weightTotal) * 100) : 0;

  const missables = model.missables || [];
  const missablesEarned = missables.filter((t) => earnedNames.has(t.name)).length;

  const stages = (model.stages || []).map((stage) => {
    const list = stage.trophies;
    const got = list.filter((t) => earnedNames.has(t.name)).length;
    return {
      id: stage.id,
      stage: stage.stage,
      title: stage.title,
      subtitle: stage.subtitle,
      description: stage.description,
      estimatedHours: stage.estimatedHours,
      difficulty: stage.difficulty,
      difficultyRating: stage.difficultyRating,
      prerequisite: stage.prerequisite,
      goals: stage.goals,
      focus: stage.focus,
      tips: stage.tips,
      warnings: stage.warnings,
      missable: stage.missable || list.some((t) => t.missable),
      total: list.length,
      earned: got,
      percent: list.length ? Math.round((got / list.length) * 100) : 0,
      missables: list.filter((t) => t.missable).length,
      complete: list.length > 0 && got === list.length,
      trophies: list,
    };
  });

  const completeStages = stages.filter((s) => s.complete).length;
  const latestStage = stages.find((s) => s.percent < 100) || stages[stages.length - 1] || null;

  // First trophy in roadmap order that is still unearned: the "next up".
  const nextTrophy = (model.order || []).find((t) => !earnedNames.has(t.name)) || null;

  // Unearned story trophies currently hidden by spoiler mode.
  const hiddenLeft = model.hiddenCount
    ? model.trophies.filter((t) => t.kind === 'story' && !earnedNames.has(t.name)).length
    : 0;

  return {
    total,
    earned: earnedCount,
    percent,
    weightPercent,
    grades,
    stages,
    stageCount: stages.length,
    completeStages,
    latestStage,
    nextTrophy,
    hiddenLeft,
    missables: { total: missables.length, earned: missablesEarned, remaining: missables.length - missablesEarned },
    hours: { total: hoursTotal, remaining: hoursRemaining, remainingText: formatHours(hoursRemaining) },
    earnedNames,
    isComplete: total > 0 && earnedCount === total,
  };
}
