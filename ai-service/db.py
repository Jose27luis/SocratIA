from __future__ import annotations

import os
from typing import Any

from psycopg.rows import dict_row
from psycopg_pool import ConnectionPool

_pool: ConnectionPool | None = None


def _get_pool() -> ConnectionPool:
    global _pool
    if _pool is None:
        _pool = ConnectionPool(os.environ["DATABASE_URL"], min_size=1, max_size=5)
    return _pool


def record_attempt(
    external_id: str,
    problem_id: str | None,
    step_id: str | None,
    skill: str | None,
    correct: bool,
    answer: str | None,
    mastery: float | None,
) -> None:
    with _get_pool().connection() as conn:
        student_id = conn.execute(
            """
            INSERT INTO students (external_id) VALUES (%s)
            ON CONFLICT (external_id) DO UPDATE SET external_id = EXCLUDED.external_id
            RETURNING id
            """,
            (external_id,),
        ).fetchone()[0]

        conn.execute(
            """
            INSERT INTO attempts (student_id, problem_id, step_id, skill, correct, answer)
            VALUES (%s, %s, %s, %s, %s, %s)
            """,
            (student_id, problem_id, step_id, skill, correct, answer),
        )

        if skill and mastery is not None:
            conn.execute(
                """
                INSERT INTO skill_mastery (student_id, skill, mastery, attempts)
                VALUES (%s, %s, %s, 1)
                ON CONFLICT (student_id, skill)
                DO UPDATE SET mastery = EXCLUDED.mastery,
                              attempts = skill_mastery.attempts + 1,
                              updated_at = now()
                """,
                (student_id, skill, mastery),
            )


def get_progress(external_id: str) -> dict[str, Any]:
    empty = {"student": None, "mastery": [], "attempts_total": 0, "correct_total": 0, "recent": []}
    with _get_pool().connection() as conn, conn.cursor(row_factory=dict_row) as cur:
        cur.execute(
            "SELECT id, external_id, name, created_at FROM students WHERE external_id = %s",
            (external_id,),
        )
        student = cur.fetchone()
        if student is None:
            return empty

        student_id = student["id"]

        cur.execute(
            "SELECT skill, mastery, attempts, updated_at FROM skill_mastery "
            "WHERE student_id = %s ORDER BY skill",
            (student_id,),
        )
        mastery = cur.fetchall()

        cur.execute(
            "SELECT COUNT(*) AS total, COUNT(*) FILTER (WHERE correct) AS correct "
            "FROM attempts WHERE student_id = %s",
            (student_id,),
        )
        totals = cur.fetchone()

        cur.execute(
            "SELECT problem_id, step_id, skill, correct, created_at FROM attempts "
            "WHERE student_id = %s ORDER BY id DESC LIMIT 10",
            (student_id,),
        )
        recent = cur.fetchall()

        return {
            "student": student,
            "mastery": mastery,
            "attempts_total": totals["total"],
            "correct_total": totals["correct"],
            "recent": recent,
        }
