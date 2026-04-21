export const TRIGGER_RULES = {
  no_report_7d: {
    code: "no_report_7d",
    thresholdDays: 7,
    reconcileEveryMs: 6 * 60 * 60 * 1000
  },
  two_skipped_in_row: {
    code: "two_skipped_in_row",
    requiredConsecutiveSkips: 2
  },
  wellbeing_low_n_times: {
    code: "wellbeing_low_n_times",
    lowScoreThreshold: 2,
    requiredOccurrences: 3,
    windowDays: 14
  }
} as const;

export type TriggerRuleCode = keyof typeof TRIGGER_RULES;
