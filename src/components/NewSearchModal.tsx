import { useState, FormEvent } from 'react';
import { X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { useNavigate } from 'react-router-dom';

interface NewSearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

const DEFAULT_CRITERIA = {
    relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo. Considera habilidades, experiencia y ajuste general.' },
    education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas. El título principal cuenta el 80% del valor, certificaciones adicionales, programas de intercambio, etc. cuentan el 20%.' },
    previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores y del nivel del último puesto ocupado.' },
    proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares, certificaciones, aprendizaje continuo e iniciativa mostrada más allá de los requisitos básicos del trabajo.' }
};

export function NewSearchModal({ isOpen, onClose }: NewSearchModalProps) {
    const navigate = useNavigate();
    const { createSearch } = useAppStore();
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
            const id = await createSearch({
                name,
                jobDescription,
                personalizedInstructions,
                evaluationCriteria: DEFAULT_CRITERIA,
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between p-6 border-b border-gray-100">
                    <h2 className="text-xl font-bold text-gray-900">Nueva Búsqueda</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Nombre de la Búsqueda
                        </label>
                        <input
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ej. Frontend Developer Senior"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Descripción del Puesto
                        </label>
                        <textarea
                            value={jobDescription}
                            onChange={(e) => setJobDescription(e.target.value)}
                            placeholder="Pega aquí la descripción completa del puesto..."
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-40"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            Instrucciones Adicionales (Opcional)
                        </label>
                        <textarea
                            value={personalizedInstructions}
                            onChange={(e) => setPersonalizedInstructions(e.target.value)}
                            placeholder="Instrucciones específicas para la IA (ej. 'Dar prioridad a candidatos con experiencia en Fintech')"
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent h-24"
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg font-medium"
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
