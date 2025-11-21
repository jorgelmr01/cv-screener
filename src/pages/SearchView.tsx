import { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutList, Kanban, Upload as UploadIcon } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { UploadZone } from '../components/UploadZone';
import { CandidateList } from '../components/CandidateList';
import { KanbanBoard } from '../components/KanbanBoard';
import { CandidateProfile } from '../components/CandidateProfile';
import { Candidate } from '../types';

export function SearchView() {
    const { id } = useParams<{ id: string }>();
    const { selectSearch, currentSearch, candidates, isLoading } = useAppStore();
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [showUpload, setShowUpload] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);

    useEffect(() => {
        if (id) {
            selectSearch(parseInt(id));
        }
    }, [id, selectSearch]);

    if (isLoading) {
        return <div className="flex items-center justify-center h-full text-gray-500 dark:text-gray-400">Cargando...</div>;
    }

    if (!currentSearch) {
        return <div className="p-8 text-gray-500 dark:text-gray-400">Búsqueda no encontrada</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-3 flex justify-between items-center shrink-0 transition-colors">
                <div>
                    <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white">{currentSearch.name}</h1>
                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xl md:max-w-2xl">{currentSearch.jobDescription}</p>
                </div>

                <div className="flex items-center gap-3">
                    <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                                ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <LayoutList size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode('kanban')}
                            className={`p-2 rounded-md transition-colors ${viewMode === 'kanban'
                                ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'
                                }`}
                        >
                            <Kanban size={20} />
                        </button>
                    </div>

                    <button
                        onClick={() => setShowUpload(!showUpload)}
                        className={`flex items-center gap-2 px-3 md:px-4 py-2 rounded-lg font-medium transition-colors text-sm md:text-base ${showUpload
                            ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        <UploadIcon size={18} className="md:w-5 md:h-5" />
                        <span className="hidden md:inline">{showUpload ? 'Ocultar Subida' : 'Subir CVs'}</span>
                        <span className="md:hidden">{showUpload ? 'Ocultar' : 'Subir'}</span>
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4 md:p-8 bg-gray-50 dark:bg-gray-900 transition-colors">
                {showUpload && (
                    <div className="mb-8 animate-in slide-in-from-top-4 duration-300">
                        <UploadZone />
                    </div>
                )}

                {candidates.length === 0 && !showUpload ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <UploadIcon size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No hay candidatos aún</h3>
                        <p className="mb-6">Sube los CVs para comenzar el análisis</p>
                        <button
                            onClick={() => setShowUpload(true)}
                            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium"
                        >
                            Subir CVs
                        </button>
                    </div>
                ) : (
                    <div className="h-full overflow-auto">
                        {viewMode === 'list' ? (
                            <CandidateList
                                onSelectCandidate={setSelectedCandidate}
                            />
                        ) : (
                            <KanbanBoard
                                candidates={candidates}
                                onSelectCandidate={setSelectedCandidate}
                            />
                        )}
                    </div>
                )}
            </div>

            {selectedCandidate && (
                <CandidateProfile
                    candidate={selectedCandidate}
                    onClose={() => setSelectedCandidate(null)}
                />
            )}
        </div>
    );
}
