import { useState } from 'react';
import { X, Sparkles } from 'lucide-react';
import { Candidate } from '../types';
import { useAppStore } from '../store/useAppStore';
import { getStageLabel, getStageBadgeClasses } from '../types/pipeline';
import { chatWithCandidates } from '../services/openai';

interface CompareViewProps {
    candidates: Candidate[];
    onClose: () => void;
}

function ScoreBar({ label, scores, maxScore = 10 }: { label: string; scores: { name: string; value: number; color: string }[]; maxScore?: number }) {
    return (
        <div className="space-y-1.5">
            <span className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">{label}</span>
            {scores.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 dark:text-gray-400 w-20 truncate">{s.name}</span>
                    <div className="flex-1 h-3 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${s.color}`} style={{ width: `${(s.value / maxScore) * 100}%` }} />
                    </div>
                    <span className="text-xs font-bold text-gray-700 dark:text-gray-300 w-8 text-right">{s.value}/{maxScore}</span>
                </div>
            ))}
        </div>
    );
}

const COLORS = ['bg-blue-500', 'bg-green-500', 'bg-purple-500'];

export function CompareView({ candidates, onClose }: CompareViewProps) {
    const { settings } = useAppStore();
    const [aiComparison, setAiComparison] = useState<string | null>(null);
    const [isLoadingAI, setIsLoadingAI] = useState(false);

    const handleAICompare = async () => {
        setIsLoadingAI(true);
        try {
            const prompt = `Compara estos ${candidates.length} candidatos de forma objetiva. ¿Cuál es el más fuerte para el puesto y por qué? Da una recomendación clara con pros y contras de cada uno.`;
            const result = await chatWithCandidates(candidates, prompt, settings.apiKey, settings.selectedModel);
            setAiComparison(result);
        } catch (error) {
            setAiComparison('Error al generar la comparación. Verifica tu API key.');
        } finally {
            setIsLoadingAI(false);
        }
    };

    const coloredCandidates = candidates.map((c, i) => ({ ...c, color: COLORS[i % COLORS.length] }));

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-5xl max-h-[90vh] flex flex-col overflow-hidden">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900 dark:text-white">Comparar Candidatos</h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{candidates.length} candidatos seleccionados</p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleAICompare}
                            disabled={isLoadingAI}
                            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium"
                        >
                            <Sparkles size={16} className={isLoadingAI ? 'animate-spin' : ''} />
                            {isLoadingAI ? 'Analizando...' : 'Comparar con IA'}
                        </button>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    {/* Header Cards */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
                        {coloredCandidates.map((c) => (
                            <div key={c.id} className="bg-gray-50 dark:bg-gray-700/50 rounded-xl p-4 text-center border border-gray-200 dark:border-gray-600">
                                <div className={`w-14 h-14 rounded-full mx-auto mb-3 flex items-center justify-center text-white font-bold text-xl ${c.color}`}>
                                    {c.name ? c.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <h3 className="font-bold text-gray-900 dark:text-white text-lg">{c.name || 'Sin nombre'}</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">{c.email}</p>
                                <div className="mt-2">
                                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStageBadgeClasses(c.status)}`}>
                                        {getStageLabel(c.status)}
                                    </span>
                                </div>
                                <p className="text-3xl font-bold text-gray-900 dark:text-white mt-3">{c.totalScore}<span className="text-lg text-gray-400">/40</span></p>
                            </div>
                        ))}
                    </div>

                    {/* Score Comparison */}
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 space-y-5">
                        <h3 className="font-semibold text-gray-900 dark:text-white">Puntuaciones</h3>
                        <ScoreBar
                            label="Total"
                            scores={coloredCandidates.map(c => ({ name: c.name || '?', value: c.totalScore, color: c.color }))}
                            maxScore={40}
                        />
                        <ScoreBar
                            label="Relevancia"
                            scores={coloredCandidates.map(c => ({ name: c.name || '?', value: c.relevance, color: c.color }))}
                        />
                        <ScoreBar
                            label="Educación"
                            scores={coloredCandidates.map(c => ({ name: c.name || '?', value: c.education, color: c.color }))}
                        />
                        <ScoreBar
                            label="Experiencia"
                            scores={coloredCandidates.map(c => ({ name: c.name || '?', value: c.previousJobs, color: c.color }))}
                        />
                        <ScoreBar
                            label="Proactividad"
                            scores={coloredCandidates.map(c => ({ name: c.name || '?', value: c.proactivity, color: c.color }))}
                        />
                    </div>

                    {/* Strengths & Weaknesses */}
                    <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${candidates.length}, 1fr)` }}>
                        {coloredCandidates.map(c => (
                            <div key={c.id} className="space-y-4">
                                {c.strengths && c.strengths.length > 0 && (
                                    <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 border border-green-200 dark:border-green-900/30">
                                        <h4 className="text-sm font-medium text-green-800 dark:text-green-300 mb-2">Fortalezas</h4>
                                        <ul className="space-y-1">
                                            {c.strengths.map((s, i) => (
                                                <li key={i} className="text-xs text-green-700 dark:text-green-400">+ {s}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {c.weaknesses && c.weaknesses.length > 0 && (
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-900/30">
                                        <h4 className="text-sm font-medium text-red-800 dark:text-red-300 mb-2">Debilidades</h4>
                                        <ul className="space-y-1">
                                            {c.weaknesses.map((w, i) => (
                                                <li key={i} className="text-xs text-red-700 dark:text-red-400">- {w}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* AI Comparison */}
                    {aiComparison && (
                        <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-900/30">
                            <div className="flex items-center gap-2 mb-3">
                                <Sparkles size={18} className="text-blue-600 dark:text-blue-400" />
                                <h3 className="font-semibold text-blue-800 dark:text-blue-300">Análisis Comparativo de IA</h3>
                            </div>
                            <p className="text-sm text-blue-900 dark:text-blue-200 whitespace-pre-wrap leading-relaxed">{aiComparison}</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
