export interface HintRequest {
  readonly problem: string;
  readonly step: string;
  readonly correctAnswer: string;
  readonly studentAnswer: string;
  readonly mastery: number;
  readonly previousHints: readonly string[];
  readonly language: string;
}

export interface HintResponse {
  readonly hint: string;
  readonly model: string;
}

export interface DynamicHintRequest {
  readonly role: string;
  readonly message: string;
}

export interface AttemptRequest {
  readonly student: string;
  readonly problemId: string | null;
  readonly stepId: string | null;
  readonly skill: string | null;
  readonly correct: boolean;
  readonly answer: string | null;
  readonly mastery: number | null;
}

export interface SkillMastery {
  readonly skill: string;
  readonly mastery: number;
  readonly attempts: number;
  readonly updatedAt: string;
}

export interface AttemptSummary {
  readonly problemId: string | null;
  readonly stepId: string | null;
  readonly skill: string | null;
  readonly correct: boolean;
  readonly createdAt: string;
}

export interface StudentRef {
  readonly externalId: string;
  readonly name: string | null;
  readonly createdAt: string;
}

export interface StudentProgress {
  readonly student: StudentRef | null;
  readonly mastery: readonly SkillMastery[];
  readonly attemptsTotal: number;
  readonly correctTotal: number;
  readonly recent: readonly AttemptSummary[];
}

export interface StudentSummary {
  readonly externalId: string;
  readonly name: string | null;
  readonly attemptsTotal: number;
  readonly correctTotal: number;
  readonly avgMastery: number | null;
  readonly lastActivity: string | null;
}
