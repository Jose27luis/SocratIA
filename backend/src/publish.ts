import { spawn } from "node:child_process";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { config } from "./config.js";

const COURSE_NAME = "SócratIA · Generados";
const MASTERY_THRESHOLD = 0.9;

function srcDir(): string {
  return join(config.oatutorDir, "src", "content-sources", "oatutor");
}

export interface PublishProblem {
  readonly title: string;
  readonly body: string;
  readonly stepTitle: string;
  readonly answer: string;
  readonly choices: readonly string[];
}

export interface PublishInput {
  readonly lesson: string;
  readonly language: string;
  readonly problems: readonly PublishProblem[];
}

interface BktParam {
  probMastery: number;
  probTransit: number;
  probSlip: number;
  probGuess: number;
}

interface Lesson {
  id: string;
  name: string;
  topics: string;
  allowRecycle: boolean;
  learningObjectives: Record<string, number>;
}

interface Course {
  courseName: string;
  language: string;
  courseOER: string;
  courseLicense: string;
  lessons: Lesson[];
}

let publishing = false;

async function readJson<T>(path: string): Promise<T> {
  return JSON.parse(await readFile(path, "utf8")) as T;
}

function triggerBuild(): void {
  const tmp = join(config.oatutorDir, "build_tmp");
  const finalDir = join(config.oatutorDir, "build");
  const command =
    `BUILD_PATH='${tmp}' npm run build-localhost && ` +
    `rm -rf '${finalDir}' && mv '${tmp}' '${finalDir}'`;
  const child = spawn("sh", ["-c", command], {
    cwd: config.oatutorDir,
    env: { ...process.env, PUBLIC_URL: "/" },
    detached: true,
    stdio: "ignore",
  });
  child.on("exit", () => {
    publishing = false;
  });
  child.unref();
}

export async function publishLesson(input: PublishInput): Promise<{ lessonId: string; count: number }> {
  if (publishing) {
    throw new Error("Ya hay una publicación en curso. Espera a que termine (1-3 min).");
  }
  const valid = input.problems.filter(
    (p) => p.stepTitle && p.answer && Array.isArray(p.choices) && p.choices.length >= 2,
  );
  if (valid.length === 0) {
    throw new Error("No hay ejercicios válidos para publicar.");
  }

  publishing = true;
  try {
    const base = "gen" + Date.now().toString(36);
    const skill = "gen_" + base;
    const lessonId = base + "lesson";
    const src = srcDir();
    const skillEntries: Record<string, string[]> = {};

    for (let i = 0; i < valid.length; i++) {
      const p = valid[i];
      if (p === undefined) {
        continue;
      }
      const pid = `${base}p${i}`;
      const sid = `${pid}a`;
      const stepDir = join(src, "content-pool", pid, "steps", sid);
      await mkdir(join(stepDir, "tutoring"), { recursive: true });

      await writeFile(
        join(src, "content-pool", pid, `${pid}.json`),
        JSON.stringify(
          {
            id: pid,
            title: p.title || input.lesson,
            body: p.body || "",
            variabilization: {},
            oer: "",
            license: "",
            lesson: input.lesson,
            courseName: COURSE_NAME,
          },
          null,
          2,
        ),
      );
      await writeFile(
        join(stepDir, `${sid}.json`),
        JSON.stringify(
          {
            id: sid,
            stepAnswer: [p.answer],
            problemType: "MultipleChoice",
            stepTitle: p.stepTitle,
            stepBody: "",
            answerType: "string",
            variabilization: {},
            choices: [...p.choices],
          },
          null,
          2,
        ),
      );
      await writeFile(join(stepDir, "tutoring", `${sid}DefaultPathway.json`), "[]");
      skillEntries[sid] = [skill];
    }

    const skillModelPath = join(src, "skillModel.json");
    const skillModel = await readJson<Record<string, string[]>>(skillModelPath);
    Object.assign(skillModel, skillEntries);
    await writeFile(skillModelPath, JSON.stringify(skillModel));

    const bktPath = join(src, "bkt-params", "defaultBKTParams.json");
    const bkt = await readJson<Record<string, BktParam>>(bktPath);
    if (bkt[skill] === undefined) {
      bkt[skill] = { probMastery: 0.1, probTransit: 0.1, probSlip: 0.1, probGuess: 0.1 };
    }
    await writeFile(bktPath, JSON.stringify(bkt));

    const coursePlansPath = join(src, "coursePlans.json");
    const courses = await readJson<Course[]>(coursePlansPath);
    let course = courses.find((c) => c.courseName === COURSE_NAME);
    if (course === undefined) {
      course = {
        courseName: COURSE_NAME,
        language: input.language || "es",
        courseOER: "",
        courseLicense: "",
        lessons: [],
      };
      courses.push(course);
    }
    course.lessons.push({
      id: lessonId,
      name: input.lesson,
      topics: input.lesson,
      allowRecycle: true,
      learningObjectives: { [skill]: MASTERY_THRESHOLD },
    });
    await writeFile(coursePlansPath, JSON.stringify(courses, null, 2));

    triggerBuild();
    return { lessonId, count: valid.length };
  } catch (error) {
    publishing = false;
    throw error;
  }
}
