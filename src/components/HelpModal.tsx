import { X, Book, Search, MessageSquare, Settings } from 'lucide-react';

interface HelpModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function HelpModal({ isOpen, onClose }: HelpModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-hidden flex flex-col animate-in fade-in zoom-in duration-200">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
                            <Book size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-gray-900 dark:text-white">Guía de Uso</h2>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Aprende a sacar el máximo provecho de CV Screener</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-8">
                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">1</span>
                            Crear una Búsqueda
                        </h3>
                        <div className="bg-gray-50 dark:bg-gray-700/30 rounded-xl p-4 border border-gray-100 dark:border-gray-700">
                            <p className="text-gray-600 dark:text-gray-300 mb-3">
                                En el Dashboard, haz clic en <span className="font-medium text-blue-600 dark:text-blue-400">"Nueva Búsqueda"</span>.
                                Deberás proporcionar:
                            </p>
                            <ul className="space-y-2 text-sm text-gray-600 dark:text-gray-300 ml-4 list-disc">
                                <li><span className="font-medium text-gray-900 dark:text-white">Nombre del puesto:</span> El título del trabajo (ej. "Senior React Developer").</li>
                                <li><span className="font-medium text-gray-900 dark:text-white">Descripción:</span> Los requisitos y responsabilidades del puesto.</li>
                                <li><span className="font-medium text-gray-900 dark:text-white">CVs:</span> Sube los archivos PDF de los candidatos.</li>
                            </ul>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">2</span>
                            Análisis Inteligente
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-2 mb-2 text-blue-600 dark:text-blue-400">
                                    <Search size={18} />
                                    <span className="font-medium">Evaluación Automática</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    La IA analiza cada CV frente a tus criterios personalizados, asignando puntuaciones y generando resúmenes.
                                </p>
                            </div>
                            <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                                <div className="flex items-center gap-2 mb-2 text-purple-600 dark:text-purple-400">
                                    <MessageSquare size={18} />
                                    <span className="font-medium">Chat Contextual</span>
                                </div>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Haz preguntas específicas sobre cualquier candidato o compara perfiles usando el chat integrado.
                                </p>
                            </div>
                        </div>
                    </section>

                    <section>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
                            <span className="flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 text-xs">3</span>
                            Personalización
                        </h3>
                        <div className="flex items-start gap-4 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-xl border border-blue-100 dark:border-blue-800/30">
                            <Settings className="text-blue-600 dark:text-blue-400 mt-1" size={20} />
                            <div>
                                <h4 className="font-medium text-gray-900 dark:text-white mb-1">Configura tus Criterios</h4>
                                <p className="text-sm text-gray-600 dark:text-gray-300">
                                    En la sección de <span className="font-medium">Settings</span>, puedes definir exactamente qué aspectos evaluar (ej. "Experiencia en React", "Inglés Avanzado", etc.) para adaptar el análisis a tus necesidades.
                                </p>
                            </div>
                        </div>
                    </section>
                </div>

                <div className="p-6 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors"
                    >
                        Entendido
                    </button>
                </div>
            </div>
        </div>
    );
}
