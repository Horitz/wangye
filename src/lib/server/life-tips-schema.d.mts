import type { LifeTip } from "../../data/life-tips";

export class LifeTipsValidationError extends Error {}
export function parseLifeTips(value: unknown): LifeTip[];
export function prepareLifeTips(value: unknown, current: LifeTip[]): LifeTip[];
