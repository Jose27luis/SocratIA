CREATE TABLE IF NOT EXISTS students (
    id          SERIAL PRIMARY KEY,
    external_id TEXT UNIQUE NOT NULL,
    name        TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS attempts (
    id         BIGSERIAL PRIMARY KEY,
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    problem_id TEXT,
    step_id    TEXT,
    skill      TEXT,
    correct    BOOLEAN NOT NULL,
    answer     TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_attempts_student ON attempts (student_id);
CREATE INDEX IF NOT EXISTS idx_attempts_skill ON attempts (student_id, skill);

CREATE TABLE IF NOT EXISTS skill_mastery (
    student_id INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill      TEXT NOT NULL,
    mastery    DOUBLE PRECISION NOT NULL,
    attempts   INTEGER NOT NULL DEFAULT 0,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (student_id, skill)
);
