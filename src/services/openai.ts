import OpenAI from 'openai';
import { Search, AnalysisResult, Candidate } from '../types';

export async function analyzeCV(
    cvText: string,
    search: Search,
    apiKey: string,
    model: string
): Promise<AnalysisResult> {
    if (!apiKey) throw new Error('API Key is missing');

    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });

    const criteriaSection = Object.entries(search.evaluationCriteria)
        .map(([_key, crit], index) => `${index + 1}. **${crit.name}** (0-10): ${crit.desc}`)
        .join('\n\n');

    const instructions = search.personalizedInstructions
        ? `\n\nInstrucciones Adicionales:\n${search.personalizedInstructions}`
        : '';

    const prompt = `Eres un reclutador experto. Analiza el siguiente CV para el puesto descrito.
  
  PUESTO:
  ${search.jobDescription}
  ${instructions}

  CV:
  ${cvText}

  Evalúa en estas dimensiones:
  ${criteriaSection}

  REALIZA UN ANÁLISIS CRÍTICO Y PROFUNDO. No seas superficial. Busca evidencias concretas.

  Responde SOLO con un JSON válido en este formato:
  {
    "relevance": number (0-10),
    "education": number (0-10),
    "previousJobs": number (0-10),
    "proactivity": number (0-10),
    "analysis": {
      "relevance": "análisis detallado y crítico",
      "education": "análisis detallado y crítico",
      "previousJobs": "análisis detallado y crítico",
      "proactivity": "análisis detallado y crítico"
    },
    "strengths": ["fortaleza 1", "fortaleza 2", ...],
    "weaknesses": ["debilidad 1", "debilidad 2", ...],
    "criticalAnalysis": "Resumen ejecutivo crítico sobre la idoneidad del candidato. ¿Por qué sí o por qué no contratarlo?"
  }`;

    const response = await openai.chat.completions.create({
        model: model,
        messages: [
            { role: 'system', content: 'Eres un asistente experto en RRHH. Responde siempre en JSON válido y en Español.' },
            { role: 'user', content: prompt }
        ],
        response_format: { type: "json_object" }
    });

    const content = response.choices[0].message.content;
    if (!content) throw new Error('No response from AI');

    try {
        const result = JSON.parse(content);
        return result as AnalysisResult;
    } catch (e) {
        console.error('Failed to parse AI response:', content);
        throw new Error('Invalid JSON response from AI');
    }
}

export async function chatWithCandidates(
    candidates: Candidate[],
    question: string,
    apiKey: string,
    model: string = 'gpt-4o-mini'
): Promise<string> {
    if (!apiKey) throw new Error('API Key is required');

    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });

    const candidatesContext = candidates.map(c => `
    CANDIDATO: ${c.name}
    RESUMEN: ${c.criticalAnalysis}
    PUNTUACIÓN: ${c.totalScore}/40
    EXPERIENCIA: ${c.previousJobs}
    EDUCACIÓN: ${c.education}
    NOTAS: ${Array.isArray(c.notes) ? c.notes.map(n => n.content).join('; ') : c.notes}
  `).join('\n\n-------------------\n\n');

    const prompt = `Eres un asistente de reclutamiento experto. Tienes acceso a la información de los siguientes candidatos:

  ${candidatesContext}

  PREGUNTA DEL RECLUTADOR:
  "${question}"

  INSTRUCCIONES:
  - Responde basándote ÚNICAMENTE en la información proporcionada.
  - Si te piden comparar, compara sus puntos fuertes y débiles.
  - Si te piden simular una respuesta del candidato, hazlo basándote en su perfil.
  - Sé profesional, objetivo y directo.
  `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: model,
        });

        return completion.choices[0].message.content || "No pude generar una respuesta.";
    } catch (error) {
        console.error('Error in chat:', error);
        throw error;
    }
}

export async function generateInterviewQuestions(
    candidate: Candidate,
    jobDescription: string,
    apiKey: string,
    model: string = 'gpt-4o-mini',
    count: number = 5
): Promise<string[]> {
    if (!apiKey) throw new Error('API Key is required');

    const openai = new OpenAI({
        apiKey: apiKey,
        dangerouslyAllowBrowser: true
    });

    const prompt = `Eres un entrevistador experto. Genera ${count} preguntas de entrevista personalizadas para este candidato, basadas en su perfil y la descripción del puesto.

  PUESTO:
  ${jobDescription}

  CANDIDATO:
  ${candidate.name}
  Resumen: ${candidate.criticalAnalysis}
  Debilidades detectadas: ${candidate.weaknesses?.join(', ') || 'No especificadas'}

  INSTRUCCIONES:
  - Genera preguntas desafiantes pero justas.
  - Enfócate en validar sus debilidades y profundizar en sus fortalezas.
  - Las preguntas deben ser abiertas y conductuales.
  - Responde SOLO con un JSON que contenga un array de strings bajo la clave "questions".
  `;

    try {
        const completion = await openai.chat.completions.create({
            messages: [{ role: "user", content: prompt }],
            model: model,
            response_format: { type: "json_object" }
        });

        const content = completion.choices[0].message.content;
        if (!content) return [];
        const result = JSON.parse(content);
        return result.questions || [];
    } catch (error) {
        console.error('Error generating questions:', error);
        throw error;
    }
}
