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

CREATE TABLE IF NOT EXISTS translations (
    source_hash TEXT NOT NULL,
    target_lang TEXT NOT NULL,
    translated  TEXT NOT NULL,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (source_hash, target_lang)
);

CREATE TABLE IF NOT EXISTS misconceptions (
    id          BIGSERIAL PRIMARY KEY,
    student_id  INTEGER NOT NULL REFERENCES students(id) ON DELETE CASCADE,
    skill       TEXT,
    category    TEXT NOT NULL,
    explanation TEXT,
    created_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_misconceptions_student ON misconceptions (student_id);

CREATE TABLE IF NOT EXISTS course_members (
    course_id   TEXT NOT NULL,
    external_id TEXT NOT NULL,
    name        TEXT,
    role        TEXT NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (course_id, external_id)
);

CREATE INDEX IF NOT EXISTS idx_course_members_course ON course_members (course_id, role);
