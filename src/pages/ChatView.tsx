import { useState, useRef, useEffect, FormEvent } from 'react';
import { Send, User, Bot, MessageSquare } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { chatWithCandidates } from '../services/openai';

interface Message {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: Date;
}

export function ChatView() {
    const { candidates, settings } = useAppStore();
    const [selectedCandidateIds, setSelectedCandidateIds] = useState<Set<string>>(new Set());
    const [messages, setMessages] = useState<Message[]>([]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'score' | 'name'>('score');
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleToggleCandidate = (id: string) => {
        const newSelected = new Set(selectedCandidateIds);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedCandidateIds(newSelected);
    };

    const filteredCandidates = candidates
        .filter(c => c.name?.toLowerCase().includes(searchTerm.toLowerCase()))
        .sort((a, b) => {
            if (sortOrder === 'score') {
                return b.totalScore - a.totalScore;
            }
            return (a.name || '').localeCompare(b.name || '');
        });

    const handleSelectAll = () => {
        if (selectedCandidateIds.size === filteredCandidates.length && filteredCandidates.length > 0) {
            setSelectedCandidateIds(new Set());
        } else {
            setSelectedCandidateIds(new Set(filteredCandidates.map(c => c.id)));
        }
    };

    const handleSendMessage = async (e: FormEvent) => {
        e.preventDefault();
        if (!input.trim() || selectedCandidateIds.size === 0) return;

        const userMessage: Message = {
            id: crypto.randomUUID(),
            role: 'user',
            content: input,
            timestamp: new Date()
        };

        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            const selectedCandidates = candidates.filter(c => selectedCandidateIds.has(c.id));
            const response = await chatWithCandidates(selectedCandidates, input, settings.apiKey, settings.selectedModel);

            const aiMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: response,
                timestamp: new Date()
            };

            setMessages(prev => [...prev, aiMessage]);
        } catch (error) {
            console.error('Chat error:', error);
            const errorMessage: Message = {
                id: crypto.randomUUID(),
                role: 'assistant',
                content: 'Lo siento, hubo un error al procesar tu solicitud. Por favor verifica tu API Key en la configuración.',
                timestamp: new Date()
            };
            setMessages(prev => [...prev, errorMessage]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="flex h-full bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Sidebar - Candidate Selection */}
            <div className="w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 flex flex-col transition-colors">
                <div className="p-4 border-b border-gray-200 dark:border-gray-700 space-y-3">
                    <div>
                        <h2 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                            <User size={20} />
                            Seleccionar Candidatos
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            Elige con quiénes quieres "chatear".
                        </p>
                    </div>

                    {/* Search & Sort Controls */}
                    <div className="space-y-2">
                        <input
                            type="text"
                            placeholder="Buscar candidato..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <div className="flex gap-2">
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'score' | 'name')}
                                className="flex-1 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="score">Por Score</option>
                                <option value="name">Por Nombre</option>
                            </select>
                            <button
                                onClick={handleSelectAll}
                                className="px-3 py-1.5 text-xs font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/50 transition-colors"
                            >
                                {selectedCandidateIds.size === filteredCandidates.length && filteredCandidates.length > 0 ? 'Ninguno' : 'Todos'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-2 space-y-1">
                    {filteredCandidates.length === 0 ? (
                        <div className="text-center py-8 text-gray-400 dark:text-gray-500 text-sm">
                            No se encontraron candidatos.
                        </div>
                    ) : (
                        filteredCandidates.map(candidate => (
                            <div
                                key={candidate.id}
                                onClick={() => handleToggleCandidate(candidate.id)}
                                className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors ${selectedCandidateIds.has(candidate.id)
                                    ? 'bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800'
                                    : 'hover:bg-gray-50 dark:hover:bg-gray-700/50 border border-transparent'
                                    }`}
                            >
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold ${selectedCandidateIds.has(candidate.id)
                                    ? 'bg-blue-100 dark:bg-blue-900/40 text-blue-600 dark:text-blue-400'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400'
                                    }`}>
                                    {candidate.name ? candidate.name.charAt(0).toUpperCase() : '?'}
                                </div>
                                <div className="flex-1 min-w-0">
                                    <div className={`text-sm font-medium truncate ${selectedCandidateIds.has(candidate.id) ? 'text-blue-900 dark:text-blue-300' : 'text-gray-900 dark:text-gray-200'
                                        }`}>
                                        {candidate.name || 'Sin nombre'}
                                    </div>
                                    <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                        Score: {candidate.totalScore}/40
                                    </div>
                                </div>
                                <div className={`w-4 h-4 rounded border flex items-center justify-center ${selectedCandidateIds.has(candidate.id)
                                    ? 'bg-blue-600 border-blue-600 dark:bg-blue-500 dark:border-blue-500'
                                    : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                    {selectedCandidateIds.has(candidate.id) && (
                                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                        </svg>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>
                <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                    <div className="text-xs text-gray-500 dark:text-gray-400 text-center">
                        {selectedCandidateIds.size} seleccionados
                    </div>
                </div>
            </div>

            {/* Main Chat Area */}
            <div className="flex-1 flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {messages.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-gray-400 dark:text-gray-500">
                            <MessageSquare size={48} className="mb-4 opacity-20" />
                            <p className="text-lg font-medium text-gray-500 dark:text-gray-400">Chat con Candidatos</p>
                            <p className="text-sm max-w-md text-center mt-2">
                                Selecciona uno o más candidatos del panel izquierdo y haz preguntas comparativas o específicas sobre sus perfiles.
                            </p>
                        </div>
                    ) : (
                        messages.map(msg => (
                            <div
                                key={msg.id}
                                className={`flex gap-4 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                {msg.role === 'assistant' && (
                                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                                        <Bot size={18} />
                                    </div>
                                )}
                                <div className={`max-w-[80%] rounded-2xl p-4 ${msg.role === 'user'
                                    ? 'bg-blue-600 text-white rounded-tr-none'
                                    : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-800 dark:text-gray-200 rounded-tl-none shadow-sm'
                                    }`}>
                                    <div className="whitespace-pre-wrap text-sm leading-relaxed">
                                        {msg.content}
                                    </div>
                                    <div className={`text-xs mt-2 ${msg.role === 'user' ? 'text-blue-100' : 'text-gray-400 dark:text-gray-500'
                                        }`}>
                                        {msg.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                </div>
                                {msg.role === 'user' && (
                                    <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                                        <User size={18} />
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                    {isLoading && (
                        <div className="flex gap-4 justify-start">
                            <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center shrink-0">
                                <Bot size={18} />
                            </div>
                            <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-2xl rounded-tl-none p-4 shadow-sm">
                                <div className="flex gap-1">
                                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                                    <div className="w-2 h-2 bg-gray-400 dark:bg-gray-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
                                </div>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-4 bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 transition-colors">
                    <form onSubmit={handleSendMessage} className="flex gap-2 max-w-4xl mx-auto">
                        <input
                            type="text"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            placeholder={selectedCandidateIds.size === 0 ? "Selecciona candidatos para comenzar..." : "Escribe tu pregunta..."}
                            disabled={selectedCandidateIds.size === 0 || isLoading}
                            className="flex-1 border border-gray-300 dark:border-gray-600 rounded-xl px-4 py-3 focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-50 disabled:text-gray-400 dark:disabled:bg-gray-900 dark:disabled:text-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <button
                            type="submit"
                            disabled={selectedCandidateIds.size === 0 || isLoading || !input.trim()}
                            className="bg-blue-600 text-white p-3 rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:hover:bg-blue-600 transition-colors"
                        >
                            <Send size={20} />
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
