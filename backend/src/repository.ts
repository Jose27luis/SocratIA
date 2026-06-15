import pg from "pg";
import { config } from "./config.js";
import type {
  AttemptRequest,
  StudentProgress,
  StudentSummary,
} from "./types.js";

const pool = new pg.Pool({ connectionString: config.databaseUrl, max: 5 });

interface StudentRow {
  readonly id: number;
  readonly external_id: string;
  readonly name: string | null;
  readonly created_at: Date;
}

interface MasteryRow {
  readonly skill: string;
  readonly mastery: number;
  readonly attempts: number;
  readonly updated_at: Date;
}

interface TotalsRow {
  readonly total: string;
  readonly correct: string;
}

interface RecentRow {
  readonly problem_id: string | null;
  readonly step_id: string | null;
  readonly skill: string | null;
  readonly correct: boolean;
  readonly created_at: Date;
}

interface SummaryRow {
  readonly external_id: string;
  readonly name: string | null;
  readonly attempts_total: string;
  readonly correct_total: string;
  readonly last_activity: Date | null;
  readonly avg_mastery: number | null;
}

export async function recordAttempt(req: AttemptRequest): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const studentResult = await client.query<{ id: number }>(
      `INSERT INTO students (external_id) VALUES ($1)
       ON CONFLICT (external_id) DO UPDATE SET external_id = EXCLUDED.external_id
       RETURNING id`,
      [req.student],
    );
    const studentRow = studentResult.rows[0];
    if (studentRow === undefined) {
      throw new Error("No se pudo registrar al estudiante");
    }
    const studentId = studentRow.id;
    await client.query(
      `INSERT INTO attempts (student_id, problem_id, step_id, skill, correct, answer)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [studentId, req.problemId, req.stepId, req.skill, req.correct, req.answer],
    );
    if (req.skill !== null && req.mastery !== null) {
      await client.query(
        `INSERT INTO skill_mastery (student_id, skill, mastery, attempts)
         VALUES ($1, $2, $3, 1)
         ON CONFLICT (student_id, skill)
         DO UPDATE SET mastery = EXCLUDED.mastery,
                       attempts = skill_mastery.attempts + 1,
                       updated_at = now()`,
        [studentId, req.skill, req.mastery],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function upsertStudent(externalId: string, name: string | null): Promise<void> {
  await pool.query(
    `INSERT INTO students (external_id, name) VALUES ($1, $2)
     ON CONFLICT (external_id) DO UPDATE SET name = COALESCE(EXCLUDED.name, students.name)`,
    [externalId, name],
  );
}

export async function upsertCourseMember(
  courseId: string,
  externalId: string,
  name: string | null,
  role: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO course_members (course_id, external_id, name, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (course_id, external_id)
     DO UPDATE SET name = COALESCE(EXCLUDED.name, course_members.name),
                   role = EXCLUDED.role,
                   updated_at = now()`,
    [courseId, externalId, name, role],
  );
}

export async function getProgress(externalId: string): Promise<StudentProgress> {
  const studentResult = await pool.query<StudentRow>(
    "SELECT id, external_id, name, created_at FROM students WHERE external_id = $1",
    [externalId],
  );
  const student = studentResult.rows[0];
  if (student === undefined) {
    return { student: null, mastery: [], attemptsTotal: 0, correctTotal: 0, recent: [] };
  }

  const masteryResult = await pool.query<MasteryRow>(
    `SELECT skill, mastery, attempts, updated_at FROM skill_mastery
     WHERE student_id = $1 ORDER BY skill`,
    [student.id],
  );
  const totalsResult = await pool.query<TotalsRow>(
    `SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE correct) AS correct
     FROM attempts WHERE student_id = $1`,
    [student.id],
  );
  const recentResult = await pool.query<RecentRow>(
    `SELECT problem_id, step_id, skill, correct, created_at FROM attempts
     WHERE student_id = $1 ORDER BY id DESC LIMIT 10`,
    [student.id],
  );
  const totals = totalsResult.rows[0];

  return {
    student: {
      externalId: student.external_id,
      name: student.name,
      createdAt: student.created_at.toISOString(),
    },
    mastery: masteryResult.rows.map((row) => ({
      skill: row.skill,
      mastery: Number(row.mastery),
      attempts: row.attempts,
      updatedAt: row.updated_at.toISOString(),
    })),
    attemptsTotal: totals ? Number(totals.total) : 0,
    correctTotal: totals ? Number(totals.correct) : 0,
    recent: recentResult.rows.map((row) => ({
      problemId: row.problem_id,
      stepId: row.step_id,
      skill: row.skill,
      correct: row.correct,
      createdAt: row.created_at.toISOString(),
    })),
  };
}

export async function recordMisconception(
  externalId: string,
  skill: string | null,
  category: string,
  explanation: string,
): Promise<void> {
  await pool.query(
    `INSERT INTO misconceptions (student_id, skill, category, explanation)
     SELECT id, $2, $3, $4 FROM students WHERE external_id = $1`,
    [externalId, skill, category, explanation],
  );
}

export async function getMisconceptions(
  externalId: string,
): Promise<{ skill: string | null; category: string; explanation: string | null }[]> {
  const result = await pool.query<{
    skill: string | null;
    category: string;
    explanation: string | null;
  }>(
    `SELECT m.skill, m.category, m.explanation
     FROM misconceptions m
     JOIN students s ON s.id = m.student_id
     WHERE s.external_id = $1
     ORDER BY m.created_at DESC
     LIMIT 30`,
    [externalId],
  );
  return result.rows;
}

export async function getCachedTranslations(
  hashes: readonly string[],
  target: string,
): Promise<Map<string, string>> {
  const result = new Map<string, string>();
  if (hashes.length === 0) {
    return result;
  }
  const rows = await pool.query<{ source_hash: string; translated: string }>(
    `SELECT source_hash, translated FROM translations
     WHERE target_lang = $1 AND source_hash = ANY($2)`,
    [target, hashes],
  );
  for (const row of rows.rows) {
    result.set(row.source_hash, row.translated);
  }
  return result;
}

export async function saveTranslations(
  entries: readonly { hash: string; translated: string }[],
  target: string,
): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    for (const entry of entries) {
      await client.query(
        `INSERT INTO translations (source_hash, target_lang, translated)
         VALUES ($1, $2, $3)
         ON CONFLICT (source_hash, target_lang) DO UPDATE SET translated = EXCLUDED.translated`,
        [entry.hash, target, entry.translated],
      );
    }
    await client.query("COMMIT");
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
}

export async function listStudents(courseId: string | null = null): Promise<StudentSummary[]> {
  const filter =
    courseId === null
      ? ""
      : `WHERE s.external_id IN (
           SELECT external_id FROM course_members
           WHERE course_id = $1 AND role = 'student'
         )`;
  const params = courseId === null ? [] : [courseId];
  const result = await pool.query<SummaryRow>(
    `SELECT s.external_id,
            s.name,
            COUNT(a.id) AS attempts_total,
            COUNT(a.id) FILTER (WHERE a.correct) AS correct_total,
            MAX(a.created_at) AS last_activity,
            (SELECT AVG(mastery) FROM skill_mastery sm WHERE sm.student_id = s.id) AS avg_mastery
     FROM students s
     LEFT JOIN attempts a ON a.student_id = s.id
     ${filter}
     GROUP BY s.id
     ORDER BY MAX(a.created_at) DESC NULLS LAST`,
    params,
  );
  return result.rows.map((row) => ({
    externalId: row.external_id,
    name: row.name,
    attemptsTotal: Number(row.attempts_total),
    correctTotal: Number(row.correct_total),
    avgMastery: row.avg_mastery === null ? null : Number(row.avg_mastery),
    lastActivity: row.last_activity === null ? null : row.last_activity.toISOString(),
  }));
}
