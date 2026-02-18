import { useState, useRef, useEffect, useMemo } from 'react';
import { Send, Users, Sparkles, Star } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { chatWithCandidates } from '../services/openai';
import { Candidate, ChatMessage } from '../types';
import ReactMarkdown from 'react-markdown';

const QUICK_PROMPTS = [
    { label: 'Comparar top 3', prompt: 'Compara los 3 mejores candidatos y recomienda cuál es el más adecuado para el puesto.' },
    { label: 'Resumen general', prompt: 'Haz un resumen de todos los candidatos seleccionados, destacando fortalezas y debilidades principales.' },
    { label: 'Priorizar entrevistas', prompt: '¿A quién deberíamos entrevistar primero y por qué? Ordena por prioridad.' },
    { label: 'Red flags', prompt: 'Identifica posibles red flags o puntos de preocupación en los candidatos seleccionados.' },
];

export function ChatView() {
    const { candidates, settings, currentSearch, chatMessages, addChatMessage } = useAppStore();
    const [selectedCandidates, setSelectedCandidates] = useState<Candidate[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [sidebarFilter, setSidebarFilter] = useState('');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const messages = useMemo(() => {
        if (!currentSearch) return [];
        return chatMessages.filter(m => m.searchId === currentSearch.id);
    }, [chatMessages, currentSearch]);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    const filteredCandidates = candidates
        .filter(c => c.name?.toLowerCase().includes(sidebarFilter.toLowerCase()))
        .sort((a, b) => b.totalScore - a.totalScore);

    const toggleCandidate = (candidate: Candidate) => {
        setSelectedCandidates(prev =>
            prev.some(c => c.id === candidate.id)
                ? prev.filter(c => c.id !== candidate.id)
                : [...prev, candidate]
        );
    };

    const handleSend = async (text?: string) => {
        const message = text || input;
        if (!message.trim() || selectedCandidates.length === 0 || !currentSearch) return;

        const userMsg: ChatMessage = {
            id: crypto.randomUUID(),
            role: 'user',
            content: message,
            date: new Date().toISOString(),
            searchId: currentSearch.id!,
        };
        await addChatMessage(userMsg);
        setInput('');
        setIsLoading(true);

        try {
            const response = await chatWithCandidates(
                selectedCandidates,
                message,
                settings.apiKey,
                settings.selectedModel
            );
            const assistantMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response,
                date: new Date().toISOString(),
                searchId: currentSearch.id!,
            };
            await addChatMessage(assistantMsg);
        } catch (error) {
            const errorMsg: ChatMessage = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Error al generar la respuesta. Verifica tu API key y vuelve a intentar.',
                date: new Date().toISOString(),
                searchId: currentSearch.id!,
            };
            await addChatMessage(errorMsg);
        } finally {
            setIsLoading(false);
        }
    };

    if (!currentSearch) {
        return (
            <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">
                <div className="text-center">
                    <Users size={48} className="mx-auto mb-4 text-gray-300" />
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Selecciona una búsqueda</h3>
                    <p>Ve al Dashboard y selecciona una búsqueda para usar el chat.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="flex h-full bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Sidebar */}
            <div className="w-72 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col shrink-0">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-2 mb-3">
                        <Users size={18} className="text-blue-600 dark:text-blue-400" />
                        <span className="font-semibold text-gray-900 dark:text-white text-sm">Candidatos</span>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 truncate">
                        Búsqueda: <strong className="text-gray-700 dark:text-gray-300">{currentSearch.name}</strong>
                    </p>
                    <input
                        type="text"
                        placeholder="Filtrar..."
                        value={sidebarFilter}
                        onChange={(e) => setSidebarFilter(e.target.value)}
                        className="w-full px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>
                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredCandidates.map(candidate => {
                        const isSelected = selectedCandidates.some(c => c.id === candidate.id);
                        return (
                            <button
                                key={candidate.id}
                                onClick={() => toggleCandidate(candidate)}
                                className={`w-full text-left p-3 rounded-lg text-sm transition-colors ${
                                    isSelected
                                        ? 'bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800'
                                        : 'hover:bg-gray-50 dark:hover:bg-gray-700 border border-transparent'
                                }`}
                            >
                                <div className="flex items-center justify-between">
                                    <span className={`font-medium truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-900 dark:text-white'}`}>
                                        {candidate.name || 'Sin nombre'}
                                    </span>
                                    <div className="flex items-center gap-1">
                                        {candidate.isFavorite && <Star size={12} className="text-yellow-400 fill-yellow-400" />}
                                        <span className="text-xs text-gray-500 dark:text-gray-400">{candidate.totalScore}</span>
                                    </div>
                                </div>
                            </button>
                        );
                    })}
                </div>
                <div className="p-3 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400 text-center">
                    {selectedCandidates.length} seleccionados
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {messages.length === 0 && (
                        <div className="flex flex-col items-center justify-center h-full text-center">
                            <Sparkles size={48} className="text-blue-300 dark:text-blue-500 mb-4" />
                            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Chat con IA</h3>
                            <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md">
                                Selecciona candidatos y haz preguntas sobre ellos. La IA analizará sus perfiles y te dará respuestas detalladas.
                            </p>
                            {selectedCandidates.length > 0 && (
                                <div className="flex flex-wrap gap-2 justify-center">
                                    {QUICK_PROMPTS.map(qp => (
                                        <button
                                            key={qp.label}
                                            onClick={() => handleSend(qp.prompt)}
                                            className="px-4 py-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-600 rounded-full text-sm text-gray-700 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:border-blue-200 dark:hover:border-blue-700 transition-colors"
                                        >
                                            {qp.label}
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {messages.map(msg => (
                        <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                            <div className={`max-w-[70%] p-4 rounded-2xl text-sm ${
                                msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-br-md'
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-bl-md'
                            }`}>
                                {msg.role === 'assistant' ? (
                                    <div className="prose prose-sm dark:prose-invert max-w-none">
                                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                                    </div>
                                ) : (
                                    <p>{msg.content}</p>
                                )}
                                <p className={`text-[10px] mt-2 ${msg.role === 'user' ? 'text-blue-200' : 'text-gray-400 dark:text-gray-500'}`}>
                                    {new Date(msg.date).toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })}
                                </p>
                            </div>
                        </div>
                    ))}

                    {isLoading && (
                        <div className="flex justify-start">
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-4 rounded-2xl rounded-bl-md">
                                <div className="flex gap-1">
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                    <span className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Quick Prompts (when messages exist) */}
                {messages.length > 0 && selectedCandidates.length > 0 && (
                    <div className="px-6 pb-2 flex gap-2 overflow-x-auto">
                        {QUICK_PROMPTS.map(qp => (
                            <button
                                key={qp.label}
                                onClick={() => handleSend(qp.prompt)}
                                disabled={isLoading}
                                className="px-3 py-1 bg-gray-100 dark:bg-gray-700 rounded-full text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 whitespace-nowrap shrink-0 transition-colors disabled:opacity-50"
                            >
                                {qp.label}
                            </button>
                        ))}
                    </div>
                )}

                {/* Input */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex gap-3">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSend()}
                            placeholder={selectedCandidates.length === 0 ? "Selecciona candidatos primero..." : "Escribe tu pregunta..."}
                            disabled={selectedCandidates.length === 0 || isLoading}
                            className="flex-1 px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                        />
                        <button
                            onClick={() => handleSend()}
                            disabled={!input.trim() || selectedCandidates.length === 0 || isLoading}
                            className="px-4 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 transition-colors"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
