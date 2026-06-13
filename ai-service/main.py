from __future__ import annotations

import os
from collections.abc import Iterator

import anthropic
from dotenv import load_dotenv
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

import db

load_dotenv()

MODEL = os.getenv("MODEL", "claude-haiku-4-5")

client = anthropic.Anthropic()

app = FastAPI(title="SócratIA · Servicio de pistas socráticas")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SYSTEM_PROMPT = (
    "Eres SócratIA, un tutor inteligente que enseña con el método socrático. "
    "Tu objetivo es guiar al estudiante para que descubra la respuesta por sí mismo; "
    "NUNCA se la des.\n\n"
    "Reglas:\n"
    "1. NUNCA reveles ni calcules la respuesta correcta.\n"
    "2. Entrega UNA sola pista o pregunta guía, breve (1 a 3 oraciones).\n"
    "3. Parte del error específico que cometió el estudiante.\n"
    "4. Ajusta la ayuda al nivel de dominio (0 a 1): si es alto (mayor a 0.7) da una "
    "pista sutil; si es bajo (menor a 0.4) ofrece más andamiaje y un paso concreto.\n"
    "5. No repitas las pistas ya entregadas.\n"
    "6. Usa un tono cálido y alentador.\n"
    "7. Responde en el idioma indicado.\n"
    "Devuelve solo la pista, sin preámbulos ni despedidas."
)


class HintRequest(BaseModel):
    problem: str
    step: str
    correct_answer: str
    student_answer: str
    mastery: float = Field(ge=0.0, le=1.0)
    previous_hints: list[str] = Field(default_factory=list)
    language: str = "es"


class HintResponse(BaseModel):
    hint: str
    model: str


def build_user_prompt(req: HintRequest) -> str:
    previas = "\n".join(f"- {h}" for h in req.previous_hints) or "ninguna"
    return (
        f"Idioma de respuesta: {req.language}\n"
        f"Problema: {req.problem}\n"
        f"Paso actual: {req.step}\n"
        f"Respuesta correcta (NO la reveles): {req.correct_answer}\n"
        f"Respuesta del estudiante: {req.student_answer}\n"
        f"Nivel de dominio del estudiante (0 a 1): {req.mastery}\n"
        f"Pistas ya entregadas:\n{previas}\n\n"
        "Genera la siguiente pista socrática."
    )


@app.get("/health")
def health() -> dict[str, str]:
    return {"status": "ok", "model": MODEL}


@app.post("/hint", response_model=HintResponse)
def generate_hint(req: HintRequest) -> HintResponse:
    try:
        message = client.messages.create(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": build_user_prompt(req)}],
        )
    except anthropic.APIError as error:
        raise HTTPException(status_code=502, detail=str(error)) from error

    hint = next((block.text for block in message.content if block.type == "text"), "")
    return HintResponse(hint=hint.strip(), model=message.model)


class DynamicHintRequest(BaseModel):
    role: str = "user"
    message: str


@app.post("/dynamic-hint")
def dynamic_hint(req: DynamicHintRequest) -> StreamingResponse:
    def stream() -> Iterator[str]:
        with client.messages.stream(
            model=MODEL,
            max_tokens=300,
            system=SYSTEM_PROMPT,
            messages=[{"role": "user", "content": req.message}],
        ) as response:
            for text in response.text_stream:
                yield text

    return StreamingResponse(stream(), media_type="text/plain")


class AttemptRequest(BaseModel):
    student: str
    problem_id: str | None = None
    step_id: str | None = None
    skill: str | None = None
    correct: bool
    answer: str | None = None
    mastery: float | None = None


@app.post("/progress/attempt")
def post_attempt(req: AttemptRequest) -> dict[str, str]:
    try:
        db.record_attempt(
            req.student,
            req.problem_id,
            req.step_id,
            req.skill,
            req.correct,
            req.answer,
            req.mastery,
        )
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
    return {"status": "ok"}


@app.get("/progress/{student}")
def get_progress(student: str) -> dict:
    try:
        return db.get_progress(student)
    except Exception as error:
        raise HTTPException(status_code=500, detail=str(error)) from error
