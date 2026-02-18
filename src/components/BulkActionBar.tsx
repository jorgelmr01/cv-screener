import { useState } from 'react';
import { Trash2, ArrowRight, Tag, X, Download, GitCompare } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { PIPELINE_STAGES } from '../types/pipeline';
import { PipelineStatus } from '../types';
import { exportCandidatesToCSV } from '../utils/export';

interface BulkActionBarProps {
    selectedIds: Set<string>;
    onClearSelection: () => void;
    onCompare?: () => void;
}

export function BulkActionBar({ selectedIds, onClearSelection, onCompare }: BulkActionBarProps) {
    const { bulkMoveCandidate, bulkDeleteCandidates, bulkAddTag, candidates } = useAppStore();
    const [showStageMenu, setShowStageMenu] = useState(false);
    const [showTagInput, setShowTagInput] = useState(false);
    const [tagInput, setTagInput] = useState('');

    if (selectedIds.size === 0) return null;

    const ids = Array.from(selectedIds);

    const handleMove = async (status: PipelineStatus) => {
        await bulkMoveCandidate(ids, status);
        setShowStageMenu(false);
        onClearSelection();
    };

    const handleDelete = async () => {
        if (confirm(`¿Eliminar ${ids.length} candidatos seleccionados?`)) {
            await bulkDeleteCandidates(ids);
            onClearSelection();
        }
    };

    const handleAddTag = async () => {
        if (tagInput.trim()) {
            await bulkAddTag(ids, tagInput.trim());
            setTagInput('');
            setShowTagInput(false);
        }
    };

    const handleExport = () => {
        const selected = candidates.filter(c => selectedIds.has(c.id));
        exportCandidatesToCSV(selected);
    };

    return (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-40 bg-gray-900 dark:bg-gray-700 text-white rounded-xl shadow-2xl px-4 py-3 flex items-center gap-3 animate-in slide-in-from-bottom-4 duration-300">
            <span className="text-sm font-medium px-2">
                {selectedIds.size} seleccionado{selectedIds.size > 1 ? 's' : ''}
            </span>

            <div className="w-px h-6 bg-gray-700 dark:bg-gray-600" />

            <div className="relative">
                <button
                    onClick={() => setShowStageMenu(!showStageMenu)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 text-sm transition-colors"
                >
                    <ArrowRight size={14} />
                    Mover
                </button>
                {showStageMenu && (
                    <div className="absolute bottom-full mb-2 left-0 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-600 py-1 min-w-[180px]">
                        {PIPELINE_STAGES.map(stage => (
                            <button
                                key={stage.id}
                                onClick={() => handleMove(stage.id)}
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                            >
                                {stage.label}
                            </button>
                        ))}
                    </div>
                )}
            </div>

            <div className="relative">
                {showTagInput ? (
                    <div className="flex items-center gap-1">
                        <input
                            type="text"
                            value={tagInput}
                            onChange={(e) => setTagInput(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                            placeholder="Tag..."
                            className="w-24 px-2 py-1 text-sm bg-gray-800 dark:bg-gray-600 rounded border border-gray-600 dark:border-gray-500 text-white placeholder-gray-400"
                            autoFocus
                        />
                        <button onClick={handleAddTag} className="text-green-400 hover:text-green-300 text-xs">OK</button>
                        <button onClick={() => setShowTagInput(false)} className="text-gray-400 hover:text-gray-300"><X size={12} /></button>
                    </div>
                ) : (
                    <button
                        onClick={() => setShowTagInput(true)}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 text-sm transition-colors"
                    >
                        <Tag size={14} />
                        Tag
                    </button>
                )}
            </div>

            {onCompare && ids.length >= 2 && ids.length <= 3 && (
                <button
                    onClick={onCompare}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 text-sm transition-colors text-purple-400"
                >
                    <GitCompare size={14} />
                    Comparar
                </button>
            )}

            <button
                onClick={handleExport}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 text-sm transition-colors"
            >
                <Download size={14} />
                Exportar
            </button>

            <button
                onClick={handleDelete}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg hover:bg-red-600 text-sm transition-colors text-red-400"
            >
                <Trash2 size={14} />
                Eliminar
            </button>

            <div className="w-px h-6 bg-gray-700 dark:bg-gray-600" />

            <button
                onClick={onClearSelection}
                className="p-1.5 rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 transition-colors"
            >
                <X size={16} />
            </button>
        </div>
    );
}
