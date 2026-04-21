export const TRIGGER_RULES = {
  no_report_7d: {
    code: "no_report_7d",
    thresholdDays: 7,
    reconcileEveryMs: 6 * 60 * 60 * 1000
  }
} as const;

export type TriggerRuleCode = keyof typeof TRIGGER_RULES;
