import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

interface NewSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export function NewSearchModal({ isOpen, onClose }: NewSearchModalProps) {
    const navigate = useNavigate();
    const { createSearch, settings } = useAppStore();
    const [name, setName] = useState('');
    const [jobDescription, setJobDescription] = useState('');
    const [personalizedInstructions, setPersonalizedInstructions] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    if (!isOpen) return null;

    const handleSubmit = async (e: FormEvent) => {
        e.preventDefault();
        if (!name || !jobDescription) return;

        setIsSubmitting(true);
        try {
            const evaluationCriteria = settings.defaultEvaluationCriteria || {
                relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo.' },
                education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas.' },
                previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores.' },
                proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares, certificaciones y aprendizaje continuo.' }
            };

            const id = await createSearch({
                name,
                jobDescription,
                personalizedInstructions,
                evaluationCriteria,
                status: 'active'
            });
            onClose();
            navigate(`/search/${id}`);
        } catch (error) {
            console.error('Failed to create search:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100 dark:border-gray-700">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">Nueva Búsqueda</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Nombre de la Búsqueda
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Frontend Developer Senior"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Descripción del Puesto
                        </label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Pega aquí la descripción completa del puesto..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-40 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Instrucciones Adicionales (Opcional)
                        </label>
                        <textarea
                            value={personalizedInstructions}
                            onChange={(e) => setPersonalizedInstructions(e.target.value)}
                            placeholder="Instrucciones específicas para la IA (ej. 'Dar prioridad a candidatos con experiencia en Fintech')"
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50"
                        >
                            {isSubmitting ? 'Creando...' : 'Crear Búsqueda'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
