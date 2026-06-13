# SócratIA

### Sistema de Tutoría Inteligente Adaptativa con IA, integrado a Canvas LMS

> Un tutor inteligente que, mediante *knowledge tracing*, estima en vivo el dominio del estudiante y le entrega pistas socráticas personalizadas generadas por IA, todo embebido dentro de Canvas LMS y con un panel de seguimiento para el docente.

---

## 1. Descripción

**SócratIA** es una herramienta educativa que se integra a **Canvas LMS** (a través del estándar **LTI**) para ofrecer **tutoría adaptativa asistida por inteligencia artificial**.

El nombre une *Sócrates* —cuyo **método socrático** consiste en guiar el aprendizaje mediante preguntas y pistas progresivas— con **IA**, porque ese es exactamente el principio del sistema: en lugar de dar la respuesta, SócratIA acompaña al estudiante con andamiaje inteligente que se adapta a su nivel real.

A diferencia de un LMS tradicional, que solo entrega y califica contenidos, SócratIA **modela el conocimiento de cada estudiante en tiempo real** y **personaliza la ayuda**, acortando la brecha entre la enseñanza masiva y la atención individual.

---

## 2. Objetivos

**Objetivo general**
- Desarrollar un sistema de tutoría inteligente adaptativa, integrado a Canvas LMS, que personalice el acompañamiento del estudiante mediante técnicas de inteligencia artificial.

**Objetivos específicos**
- Integrar la herramienta a Canvas LMS mediante el estándar LTI.
- Estimar el nivel de dominio del estudiante por habilidad usando *knowledge tracing*.
- Generar pistas y retroalimentación socrática personalizada con un modelo de lenguaje (LLM).
- Proveer al docente un panel con el progreso y los puntos críticos del grupo.

---

## 3. Características principales

- **Integración nativa con Canvas** mediante LTI: el tutor aparece embebido dentro del curso, sin que el estudiante salga de la plataforma.
- **Modelado del dominio en vivo (Knowledge Tracing):** el sistema actualiza la probabilidad de que el estudiante domine cada habilidad con cada respuesta.
- **Tutoría socrática con IA generativa:** pistas paso a paso adaptadas al error y al nivel del estudiante, en lugar de dar la solución directa.
- **Aprendizaje adaptativo:** la dificultad y el tipo de ayuda se ajustan al estado de conocimiento de cada persona.
- **Panel docente:** visualización del dominio por estudiante y por tema, con alertas tempranas de quienes se están quedando atrás.
- **Transparencia y privacidad:** trazabilidad de qué datos usa la IA, alineado con buenas prácticas de protección de datos educativos.

---

## 4. Arquitectura

```
┌───────────────────────────────────────────────────────────────┐
│                         CANVAS LMS                            │
│   (curso, estudiantes, calificaciones)                        │
│                                                               │
│   ┌───────────────────────────────────────────────────────┐  │
│   │           SócratIA  (Herramienta LTI)                  │  │
│   │                                                        │  │
│   │   Frontend del tutor  ◄──────────►  Servicios de IA    │  │
│   │   (interfaz embebida)              (motor adaptativo)  │  │
│   └───────────────────────────────────────────────────────┘  │
│             ▲                                  │              │
└─────────────┼──────────────────────────────────┼─────────────┘
              │ LTI 1.3 / API de Canvas          │
              ▼                                  ▼
   ┌──────────────────────┐        ┌──────────────────────────────┐
   │  Motor de Knowledge   │        │   Generador de pistas (LLM)   │
   │  Tracing (dominio)    │        │   método socrático            │
   └──────────────────────┘        └──────────────────────────────┘
              │
              ▼
   ┌──────────────────────────────┐
   │  Base de datos                │
   │  (estado de dominio,          │
   │   interacciones, contenido)   │
   └──────────────────────────────┘
```

**Flujo resumido**
1. El estudiante abre la actividad de SócratIA dentro de Canvas (vía LTI).
2. Resuelve un ejercicio; cada intento se registra como una interacción.
3. El **motor de Knowledge Tracing** actualiza su nivel de dominio por habilidad.
4. Según ese nivel y el error cometido, el **generador de pistas con LLM** entrega la ayuda socrática adecuada.
5. El **panel docente** consolida el progreso del grupo.

---

## 5. Componentes de Inteligencia Artificial

| Componente | Función | Enfoque |
|---|---|---|
| **Knowledge Tracing** | Estimar el dominio del estudiante por habilidad y predecir su desempeño | Bayesian Knowledge Tracing (en vivo, sin entrenamiento previo) y, de forma opcional, Deep Knowledge Tracing |
| **Tutoría socrática** | Generar pistas y retroalimentación personalizada | Modelo de lenguaje (LLM) con *prompting* guiado por el método socrático y el estado del estudiante |
| **Aprendizaje adaptativo** | Seleccionar el siguiente paso/ejercicio | Reglas basadas en el dominio estimado |

---

## 6. Stack tecnológico (propuesto)

| Capa | Tecnología |
|---|---|
| **LMS base** | Canvas LMS (open source / Canvas Free for Teacher) |
| **Integración** | LTI 1.3 (Advantage) + API REST/GraphQL de Canvas |
| **Frontend del tutor** | React |
| **Servicios de IA** | Python + FastAPI |
| **Knowledge Tracing** | Modelos de KT (BKT; opcional pyKT / EduKTM) |
| **LLM (pistas socráticas)** | Claude (Anthropic) |
| **Base de datos** | PostgreSQL |

---

## 7. Estructura del proyecto (planificada)

```
SocratIA/
├── lti-tool/          Herramienta LTI (registro y embebido en Canvas)
├── frontend/          Interfaz del tutor (React)
├── ai-service/        Servicios de IA (FastAPI): knowledge tracing + pistas
├── content/           Banco de ejercicios y habilidades
├── docs/              Documentación, diagramas, manual
└── README.md
```

---

## 8. Roadmap

- [ ] Levantar Canvas (Free for Teacher o Docker) y registrar una herramienta LTI de prueba.
- [ ] Definir el banco inicial de ejercicios y habilidades.
- [ ] Implementar el motor de Knowledge Tracing (BKT) y el estado de dominio.
- [ ] Integrar el LLM para la generación de pistas socráticas.
- [ ] Construir el frontend del tutor embebido.
- [ ] Desarrollar el panel docente.
- [ ] Pruebas con un curso piloto.

---

## 9. Trabajos relacionados y referencias

- **Canvas LMS** — plataforma base. https://github.com/instructure/canvas-lms
- **IgniteAI (Instructure)** — capa oficial de IA de Canvas. https://www.instructure.com/press-release/instructure-launches-igniteai-simplify-and-seamlessly-transform-ai-integration
- **OATutor (UC Berkeley)** — tutor inteligente open source con Bayesian Knowledge Tracing. https://github.com/CAHLR/OATutor
- **EduKTM / pyKT (USTC, China)** — librerías de *knowledge tracing*. https://github.com/bigdata-ustc/EduKTM
- **LTI (1EdTech)** — estándar de interoperabilidad de herramientas de aprendizaje.

---

## 10. Contexto académico

- **Curso:** Sistemas de Gestión de Contenidos (CMS) / Sistemas de Gestión del Aprendizaje (LMS).
- **Tipo:** proyecto académico.
- **Equipo:** _por completar_.

---

## 11. Licencia

Por definir.
