import { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType, BorderStyle } from 'docx';
import { saveAs } from 'file-saver';
import { Candidate } from '../types';
import { getStageLabel } from '../types/pipeline';

export async function exportQuestionsToWord(
    questions: string[],
    candidateName: string,
    positionTitle: string
) {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: 'Preguntas de Entrevista',
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Candidato: ', bold: true, size: 24 }),
                        new TextRun({ text: candidateName, size: 24 }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Puesto: ', bold: true, size: 24 }),
                        new TextRun({ text: positionTitle, size: 24 }),
                    ],
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: 'Fecha: ', bold: true, size: 24 }),
                        new TextRun({ text: new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' }), size: 24 }),
                    ],
                    spacing: { after: 400 },
                }),
                new Paragraph({
                    border: { bottom: { color: '999999', space: 1, style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { after: 300 },
                }),
                ...questions.flatMap((question, index) => [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `${index + 1}. `, bold: true, size: 22 }),
                            new TextRun({ text: question, size: 22 }),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: 'Notas: ', bold: true, italics: true, size: 20, color: '888888' }),
                            new TextRun({ text: '_______________________________________________', size: 20, color: 'CCCCCC' }),
                        ],
                        spacing: { after: 100 },
                    }),
                    new Paragraph({
                        children: [
                            new TextRun({ text: '_______________________________________________', size: 20, color: 'CCCCCC' }),
                        ],
                        spacing: { after: 300 },
                    }),
                ]),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Entrevista_${candidateName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
}

export async function exportCandidateReportToWord(
    candidate: Candidate,
    positionTitle: string
) {
    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: 'Informe de Candidato',
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: candidate.name || 'Sin nombre', bold: true, size: 28 }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Puesto: ${positionTitle}`, size: 22, color: '666666' }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [
                        new TextRun({ text: `Estado: ${getStageLabel(candidate.status)}`, size: 22, color: '666666' }),
                    ],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                }),
                new Paragraph({
                    border: { bottom: { color: '999999', space: 1, style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { after: 300 },
                }),
                new Paragraph({ text: 'Información de Contacto', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
                new Paragraph({ children: [new TextRun({ text: `Email: ${candidate.email || 'N/A'}`, size: 22 })], spacing: { after: 80 } }),
                new Paragraph({ children: [new TextRun({ text: `Teléfono: ${candidate.phone || 'N/A'}`, size: 22 })], spacing: { after: 200 } }),

                new Paragraph({ text: 'Puntuaciones', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
                new Paragraph({ children: [new TextRun({ text: `Score Total: ${candidate.totalScore}/40`, bold: true, size: 24 })], spacing: { after: 100 } }),
                new Paragraph({ children: [new TextRun({ text: `Relevancia: ${candidate.relevance}/10`, size: 22 })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: `Educación: ${candidate.education}/10`, size: 22 })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: `Experiencia: ${candidate.previousJobs}/10`, size: 22 })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: `Proactividad: ${candidate.proactivity}/10`, size: 22 })], spacing: { after: 200 } }),

                new Paragraph({ text: 'Análisis de IA', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
                ...(candidate.criticalAnalysis ? [
                    new Paragraph({ children: [new TextRun({ text: 'Resumen Ejecutivo:', bold: true, size: 22 })], spacing: { after: 80 } }),
                    new Paragraph({ children: [new TextRun({ text: candidate.criticalAnalysis, size: 22 })], spacing: { after: 200 } }),
                ] : []),
                new Paragraph({ children: [new TextRun({ text: 'Relevancia:', bold: true, size: 22 })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: candidate.analysis.relevance, size: 22 })], spacing: { after: 150 } }),
                new Paragraph({ children: [new TextRun({ text: 'Educación:', bold: true, size: 22 })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: candidate.analysis.education, size: 22 })], spacing: { after: 150 } }),
                new Paragraph({ children: [new TextRun({ text: 'Experiencia:', bold: true, size: 22 })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: candidate.analysis.previousJobs, size: 22 })], spacing: { after: 150 } }),
                new Paragraph({ children: [new TextRun({ text: 'Proactividad:', bold: true, size: 22 })], spacing: { after: 60 } }),
                new Paragraph({ children: [new TextRun({ text: candidate.analysis.proactivity, size: 22 })], spacing: { after: 200 } }),

                ...(candidate.strengths && candidate.strengths.length > 0 ? [
                    new Paragraph({ text: 'Fortalezas', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
                    ...candidate.strengths.map(s => new Paragraph({ children: [new TextRun({ text: `• ${s}`, size: 22 })], spacing: { after: 60 } })),
                    new Paragraph({ spacing: { after: 200 } }),
                ] : []),

                ...(candidate.weaknesses && candidate.weaknesses.length > 0 ? [
                    new Paragraph({ text: 'Debilidades', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
                    ...candidate.weaknesses.map(w => new Paragraph({ children: [new TextRun({ text: `• ${w}`, size: 22 })], spacing: { after: 60 } })),
                    new Paragraph({ spacing: { after: 200 } }),
                ] : []),

                ...(candidate.notes && candidate.notes.length > 0 ? [
                    new Paragraph({ text: 'Notas del Reclutador', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
                    ...candidate.notes.map(note => new Paragraph({
                        children: [
                            new TextRun({ text: `[${new Date(note.date).toLocaleDateString('es-ES')}] `, bold: true, size: 20, color: '888888' }),
                            new TextRun({ text: note.content, size: 22 }),
                        ],
                        spacing: { after: 100 },
                    })),
                ] : []),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Candidato_${(candidate.name || 'sin_nombre').replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
}

export async function exportSearchReportToWord(
    candidates: Candidate[],
    searchName: string,
    jobDescription: string
) {
    const sorted = [...candidates].sort((a, b) => b.totalScore - a.totalScore);

    const doc = new Document({
        sections: [{
            properties: {},
            children: [
                new Paragraph({
                    text: `Informe de Búsqueda: ${searchName}`,
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Fecha: ${new Date().toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' })}`, size: 22, color: '666666' })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 100 },
                }),
                new Paragraph({
                    children: [new TextRun({ text: `Total candidatos: ${candidates.length}`, size: 22, color: '666666' })],
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 300 },
                }),
                new Paragraph({ text: 'Descripción del Puesto', heading: HeadingLevel.HEADING_2, spacing: { after: 150 } }),
                new Paragraph({ children: [new TextRun({ text: jobDescription, size: 22 })], spacing: { after: 300 } }),
                new Paragraph({
                    border: { bottom: { color: '999999', space: 1, style: BorderStyle.SINGLE, size: 6 } },
                    spacing: { after: 300 },
                }),
                new Paragraph({ text: 'Ranking de Candidatos', heading: HeadingLevel.HEADING_2, spacing: { after: 200 } }),
                ...sorted.flatMap((c, i) => [
                    new Paragraph({
                        children: [
                            new TextRun({ text: `#${i + 1} - ${c.name || 'Sin nombre'}`, bold: true, size: 24 }),
                            new TextRun({ text: `  (${c.totalScore}/40)`, size: 22, color: '0066CC' }),
                            new TextRun({ text: `  [${getStageLabel(c.status)}]`, size: 20, color: '888888' }),
                        ],
                        spacing: { after: 80 },
                    }),
                    ...(c.criticalAnalysis ? [
                        new Paragraph({ children: [new TextRun({ text: c.criticalAnalysis, size: 20, italics: true })], spacing: { after: 60 } }),
                    ] : []),
                    new Paragraph({ children: [new TextRun({ text: `R:${c.relevance} E:${c.education} Exp:${c.previousJobs} P:${c.proactivity}`, size: 20, color: '888888' })], spacing: { after: 200 } }),
                ]),
            ],
        }],
    });

    const blob = await Packer.toBlob(doc);
    saveAs(blob, `Informe_${searchName.replace(/\s+/g, '_')}_${new Date().toISOString().split('T')[0]}.docx`);
}
