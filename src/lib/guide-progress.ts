export type GuideProgressStep = { id: string; legacyIndex: number };

/** Read the three legacy guide marks without creating or migrating any records. */
export function getGuideProgress(steps: readonly GuideProgressStep[], completed: readonly number[]) {
  const seenIds = new Set<string>();
  const seenIndices = new Set<number>();
  const validSteps = steps.filter(step => {
    if (!step.id || !Number.isInteger(step.legacyIndex) || step.legacyIndex < 0 || step.legacyIndex > 2
      || seenIds.has(step.id) || seenIndices.has(step.legacyIndex)) return false;
    seenIds.add(step.id);
    seenIndices.add(step.legacyIndex);
    return true;
  });
  const marked = new Set(completed);
  const completedIds = validSteps.filter(step => marked.has(step.legacyIndex)).map(step => step.id);
  const pendingIds = validSteps.filter(step => !marked.has(step.legacyIndex)).map(step => step.id);
  const total = validSteps.length;
  return {
    completed: completedIds.length,
    total,
    percent: total ? Math.round(completedIds.length / total * 100) : 0,
    pendingIds,
    completedIds,
  };
}
