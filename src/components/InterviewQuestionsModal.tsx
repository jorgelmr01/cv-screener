import { useState, useEffect } from 'react';
import { X, RefreshCw, Copy, Check } from 'lucide-react';
import { Candidate } from '../types';
import { useAppStore } from '../store/useAppStore';
import { generateInterviewQuestions } from '../services/openai';

interface InterviewQuestionsModalProps {
    candidate: Candidate;
    onClose: () => void;
}

export function InterviewQuestionsModal({ candidate, onClose }: InterviewQuestionsModalProps) {
    const { currentSearch, settings } = useAppStore();
    const [questionCount, setQuestionCount] = useState(5);
    const [isLoading, setIsLoading] = useState(false);
    const [questions, setQuestions] = useState<string[]>([]);
    const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

    const generateQuestions = async () => {
        if (!currentSearch) return;
        setIsLoading(true);
        try {
            const result = await generateInterviewQuestions(
                candidate,
                currentSearch.jobDescription,
                settings.apiKey,
                settings.selectedModel,
                questionCount
            );
            setQuestions(result);
        } catch (error) {
            console.error('Failed to generate questions:', error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        // Don't auto-generate on mount, let user choose count first? 
        // Or auto-generate with default? User asked to "ask to select how many before generating".
        // So I will NOT auto-generate.
    }, []);

    const handleCopy = (text: string, index: number) => {
        navigator.clipboard.writeText(text);
        setCopiedIndex(index);
        setTimeout(() => setCopiedIndex(null), 2000);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-4">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl flex flex-col max-h-[80vh]">
                <div className="p-6 border-b border-gray-200 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-gray-900">Generador de Preguntas</h2>
                        <p className="text-sm text-gray-500">Entrevista para {candidate.name}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6">
                    {questions.length === 0 && !isLoading ? (
                        <div className="flex flex-col items-center justify-center h-full space-y-6">
                            <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                                <RefreshCw size={32} />
                            </div>
                            <div className="text-center max-w-md">
                                <h3 className="text-lg font-semibold text-gray-900">Configura tu entrevista</h3>
                                <p className="text-gray-500 mt-2">Selecciona cuántas preguntas quieres generar para este candidato.</p>
                            </div>

                            <div className="flex items-center gap-4 bg-gray-50 p-4 rounded-lg border border-gray-200">
                                <label className="text-sm font-medium text-gray-700">Número de preguntas:</label>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={() => setQuestionCount(Math.max(1, questionCount - 1))}
                                        className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                    >
                                        -
                                    </button>
                                    <span className="w-8 text-center font-bold">{questionCount}</span>
                                    <button
                                        onClick={() => setQuestionCount(Math.min(10, questionCount + 1))}
                                        className="w-8 h-8 rounded-full bg-white border border-gray-300 flex items-center justify-center hover:bg-gray-50"
                                    >
                                        +
                                    </button>
                                </div>
                            </div>

                            <button
                                onClick={generateQuestions}
                                className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors shadow-sm"
                            >
                                Generar Preguntas
                            </button>
                        </div>
                    ) : isLoading ? (
                        <div className="flex flex-col items-center justify-center py-12 space-y-4">
                            <RefreshCw className="animate-spin text-blue-600" size={32} />
                            <p className="text-gray-500">Generando {questionCount} preguntas personalizadas...</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {questions.map((question, index) => (
                                <div key={index} className="bg-gray-50 p-4 rounded-lg border border-gray-200 flex gap-4 group hover:border-blue-200 transition-colors">
                                    <div className="w-6 h-6 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center shrink-0 text-sm font-bold">
                                        {index + 1}
                                    </div>
                                    <p className="flex-1 text-gray-800">{question}</p>
                                    <button
                                        onClick={() => handleCopy(question, index)}
                                        className="text-gray-400 hover:text-blue-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                        title="Copiar pregunta"
                                    >
                                        {copiedIndex === index ? <Check size={18} className="text-green-600" /> : <Copy size={18} />}
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {questions.length > 0 && (
                    <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex justify-between items-center">
                        <div className="flex items-center gap-2 text-sm text-gray-500">
                            <span>Preguntas:</span>
                            <select
                                value={questionCount}
                                onChange={(e) => setQuestionCount(Number(e.target.value))}
                                className="bg-white border border-gray-300 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-blue-500"
                            >
                                {[3, 5, 7, 10].map(n => (
                                    <option key={n} value={n}>{n}</option>
                                ))}
                            </select>
                        </div>
                        <button
                            onClick={generateQuestions}
                            disabled={isLoading}
                            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors font-medium"
                        >
                            <RefreshCw size={16} className={isLoading ? 'animate-spin' : ''} />
                            Regenerar
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}
