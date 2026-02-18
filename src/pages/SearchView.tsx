import { useEffect, useState, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { LayoutList, Kanban, Upload as UploadIcon, FileText, Edit3, Check, X } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { UploadZone } from '../components/UploadZone';
import { CandidateList } from '../components/CandidateList';
import { KanbanBoard } from '../components/KanbanBoard';
import { CandidateProfile } from '../components/CandidateProfile';
import { FilterBar, FilterState, DEFAULT_FILTERS } from '../components/FilterBar';
import { BulkActionBar } from '../components/BulkActionBar';
import { Candidate } from '../types';
import { CompareView } from '../components/CompareView';
import { exportSearchReportToWord } from '../services/docx';

export function SearchView() {
    const { id } = useParams<{ id: string }>();
    const { selectSearch, currentSearch, candidates, isLoading, updateSearch } = useAppStore();
    const [viewMode, setViewMode] = useState<'list' | 'kanban'>('list');
    const [showUpload, setShowUpload] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState<Candidate | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [sortOrder, setSortOrder] = useState<'score' | 'name' | 'date'>('score');
    const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [editingDesc, setEditingDesc] = useState(false);
    const [descDraft, setDescDraft] = useState('');
    const [showCompare, setShowCompare] = useState(false);

    useEffect(() => {
        if (id) selectSearch(parseInt(id));
    }, [id, selectSearch]);

    const availableTags = useMemo(() => {
        const allTags = new Set<string>();
        candidates.forEach(c => c.tags?.forEach(t => allTags.add(t)));
        return Array.from(allTags).sort();
    }, [candidates]);

    const filteredCandidates = useMemo(() => {
        return candidates
            .filter(c => {
                if (searchTerm && !c.name?.toLowerCase().includes(searchTerm.toLowerCase())) return false;
                if (filters.statuses.length > 0 && !filters.statuses.includes(c.status)) return false;
                if (c.totalScore < filters.scoreMin || c.totalScore > filters.scoreMax) return false;
                if (filters.favoritesOnly && !c.isFavorite) return false;
                if (filters.tags.length > 0 && !filters.tags.some(t => c.tags?.includes(t))) return false;
                if (filters.dateFrom && new Date(c.createdAt) < new Date(filters.dateFrom)) return false;
                if (filters.dateTo && new Date(c.createdAt) > new Date(filters.dateTo + 'T23:59:59')) return false;
                return true;
            })
            .sort((a, b) => {
                if (sortOrder === 'score') return b.totalScore - a.totalScore;
                if (sortOrder === 'date') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
                return (a.name || '').localeCompare(b.name || '');
            });
    }, [candidates, searchTerm, filters, sortOrder]);

    const toggleSelect = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id); else next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        if (selectedIds.size === filteredCandidates.length) {
            setSelectedIds(new Set());
        } else {
            setSelectedIds(new Set(filteredCandidates.map(c => c.id)));
        }
    };

    const handleExportReport = () => {
        if (currentSearch) {
            exportSearchReportToWord(filteredCandidates, currentSearch.name, currentSearch.jobDescription);
        }
    };

    const handleSaveDesc = async () => {
        if (currentSearch && descDraft.trim()) {
            await updateSearch({ ...currentSearch, jobDescription: descDraft });
            setEditingDesc(false);
        }
    };

    if (isLoading) {
        return (
            <div className="flex items-center justify-center h-full">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    if (!currentSearch) {
        return <div className="p-8 text-gray-500 dark:text-gray-400">Búsqueda no encontrada</div>;
    }

    return (
        <div className="flex flex-col h-full bg-gray-50 dark:bg-gray-900 transition-colors">
            {/* Header */}
            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-4 md:px-8 py-3 shrink-0 transition-colors">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                        <h1 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white truncate">{currentSearch.name}</h1>
                        <div className="flex items-center gap-2 mt-0.5">
                            {editingDesc ? (
                                <div className="flex items-center gap-2 flex-1">
                                    <input
                                        type="text"
                                        value={descDraft}
                                        onChange={(e) => setDescDraft(e.target.value)}
                                        className="flex-1 text-sm px-2 py-1 border border-gray-300 dark:border-gray-600 rounded bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                        autoFocus
                                    />
                                    <button onClick={handleSaveDesc} className="text-green-600 hover:text-green-700"><Check size={16} /></button>
                                    <button onClick={() => setEditingDesc(false)} className="text-gray-400 hover:text-gray-600"><X size={16} /></button>
                                </div>
                            ) : (
                                <>
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate max-w-xl">{currentSearch.jobDescription}</p>
                                    <button
                                        onClick={() => { setDescDraft(currentSearch.jobDescription); setEditingDesc(true); }}
                                        className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 shrink-0"
                                    >
                                        <Edit3 size={14} />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex flex-col md:flex-row items-stretch md:items-center gap-3">
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Buscar..."
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                className="w-full md:w-48 px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                            />
                            <select
                                value={sortOrder}
                                onChange={(e) => setSortOrder(e.target.value as 'score' | 'name' | 'date')}
                                className="px-3 py-2 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                            >
                                <option value="score">Score</option>
                                <option value="name">Nombre</option>
                                <option value="date">Fecha</option>
                            </select>
                        </div>

                        <div className="flex items-center gap-2">
                            <div className="bg-gray-100 dark:bg-gray-700 p-1 rounded-lg flex shrink-0">
                                <button
                                    onClick={() => setViewMode('list')}
                                    className={`p-2 rounded-md transition-colors ${viewMode === 'list'
                                        ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                    title="Vista de Lista"
                                >
                                    <LayoutList size={18} />
                                </button>
                                <button
                                    onClick={() => setViewMode('kanban')}
                                    className={`p-2 rounded-md transition-colors ${viewMode === 'kanban'
                                        ? 'bg-white dark:bg-gray-600 shadow-sm text-blue-600 dark:text-blue-400'
                                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700'}`}
                                    title="Vista Kanban"
                                >
                                    <Kanban size={18} />
                                </button>
                            </div>

                            <button
                                onClick={handleExportReport}
                                className="flex items-center gap-1.5 px-3 py-2 text-sm rounded-lg border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                                title="Exportar informe Word"
                            >
                                <FileText size={16} />
                            </button>

                            <button
                                onClick={() => setShowUpload(!showUpload)}
                                className={`flex items-center gap-2 px-3 py-2 rounded-lg font-medium transition-colors text-sm shrink-0 ${showUpload
                                    ? 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    : 'bg-blue-600 text-white hover:bg-blue-700'}`}
                            >
                                <UploadIcon size={16} />
                                {showUpload ? 'Ocultar' : 'Subir CVs'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4 md:p-6 bg-gray-50 dark:bg-gray-900 transition-colors">
                {showUpload && (
                    <div className="mb-6">
                        <UploadZone />
                    </div>
                )}

                {candidates.length > 0 && (
                    <div className="mb-4">
                        <FilterBar filters={filters} onChange={setFilters} availableTags={availableTags} />
                    </div>
                )}

                {candidates.length === 0 && !showUpload ? (
                    <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                        <UploadIcon size={48} className="mb-4 text-gray-300 dark:text-gray-600" />
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No hay candidatos aún</h3>
                        <p className="mb-6">Sube los CVs para comenzar el análisis</p>
                        <button onClick={() => setShowUpload(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                            Subir CVs
                        </button>
                    </div>
                ) : (
                    <div className="h-full overflow-auto">
                        {viewMode === 'list' ? (
                            <CandidateList
                                candidates={filteredCandidates}
                                onSelectCandidate={setSelectedCandidate}
                                selectedIds={selectedIds}
                                onToggleSelect={toggleSelect}
                                onSelectAll={selectAll}
                            />
                        ) : (
                            <KanbanBoard
                                candidates={filteredCandidates}
                                onSelectCandidate={setSelectedCandidate}
                            />
                        )}
                    </div>
                )}
            </div>

            {selectedCandidate && (
                <CandidateProfile candidate={selectedCandidate} onClose={() => setSelectedCandidate(null)} />
            )}

            <BulkActionBar
                selectedIds={selectedIds}
                onClearSelection={() => setSelectedIds(new Set())}
                onCompare={() => setShowCompare(true)}
            />

            {showCompare && selectedIds.size >= 2 && (
                <CompareView
                    candidates={candidates.filter(c => selectedIds.has(c.id))}
                    onClose={() => setShowCompare(false)}
                />
            )}
        </div>
    );
}
