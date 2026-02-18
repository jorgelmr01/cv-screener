import { useState } from 'react';
import { Filter, Star, ChevronDown } from 'lucide-react';
import { PipelineStatus } from '../types';
import { PIPELINE_STAGES, getStageBadgeClasses } from '../types/pipeline';

export interface FilterState {
    statuses: PipelineStatus[];
    scoreMin: number;
    scoreMax: number;
    favoritesOnly: boolean;
    tags: string[];
    dateFrom: string;
    dateTo: string;
}

export const DEFAULT_FILTERS: FilterState = {
    statuses: [],
    scoreMin: 0,
    scoreMax: 40,
    favoritesOnly: false,
    tags: [],
    dateFrom: '',
    dateTo: '',
};

interface FilterBarProps {
    filters: FilterState;
    onChange: (filters: FilterState) => void;
    availableTags: string[];
}

export function FilterBar({ filters, onChange, availableTags }: FilterBarProps) {
    const [expanded, setExpanded] = useState(false);

    const activeCount = [
        filters.statuses.length > 0,
        filters.scoreMin > 0 || filters.scoreMax < 40,
        filters.favoritesOnly,
        filters.tags.length > 0,
        filters.dateFrom || filters.dateTo,
    ].filter(Boolean).length;

    const toggleStatus = (status: PipelineStatus) => {
        const statuses = filters.statuses.includes(status)
            ? filters.statuses.filter(s => s !== status)
            : [...filters.statuses, status];
        onChange({ ...filters, statuses });
    };

    const toggleTag = (tag: string) => {
        const tags = filters.tags.includes(tag)
            ? filters.tags.filter(t => t !== tag)
            : [...filters.tags, tag];
        onChange({ ...filters, tags });
    };

    const clearAll = () => onChange(DEFAULT_FILTERS);

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 transition-colors">
            <button
                onClick={() => setExpanded(!expanded)}
                className="w-full flex items-center justify-between px-4 py-2.5 text-sm"
            >
                <div className="flex items-center gap-2 text-gray-700 dark:text-gray-300">
                    <Filter size={16} />
                    <span className="font-medium">Filtros</span>
                    {activeCount > 0 && (
                        <span className="bg-blue-600 text-white text-xs px-2 py-0.5 rounded-full">{activeCount}</span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    {activeCount > 0 && (
                        <button
                            onClick={(e) => { e.stopPropagation(); clearAll(); }}
                            className="text-xs text-gray-400 hover:text-red-500 transition-colors"
                        >
                            Limpiar
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} />
                </div>
            </button>

            {expanded && (
                <div className="px-4 pb-4 space-y-4 border-t border-gray-100 dark:border-gray-700 pt-3">
                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Estado</label>
                        <div className="flex flex-wrap gap-1.5">
                            {PIPELINE_STAGES.map(stage => (
                                <button
                                    key={stage.id}
                                    onClick={() => toggleStatus(stage.id)}
                                    className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                        filters.statuses.includes(stage.id)
                                            ? getStageBadgeClasses(stage.id) + ' ring-1 ring-blue-400'
                                            : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                    }`}
                                >
                                    {stage.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">
                            Score ({filters.scoreMin} - {filters.scoreMax})
                        </label>
                        <div className="flex items-center gap-3">
                            <input
                                type="range"
                                min={0}
                                max={40}
                                value={filters.scoreMin}
                                onChange={(e) => onChange({ ...filters, scoreMin: Number(e.target.value) })}
                                className="flex-1 accent-blue-600"
                            />
                            <span className="text-xs text-gray-500 w-4">{filters.scoreMin}</span>
                            <span className="text-xs text-gray-400">-</span>
                            <span className="text-xs text-gray-500 w-4">{filters.scoreMax}</span>
                            <input
                                type="range"
                                min={0}
                                max={40}
                                value={filters.scoreMax}
                                onChange={(e) => onChange({ ...filters, scoreMax: Number(e.target.value) })}
                                className="flex-1 accent-blue-600"
                            />
                        </div>
                    </div>

                    <div className="flex items-center gap-4">
                        <label className="flex items-center gap-2 cursor-pointer">
                            <input
                                type="checkbox"
                                checked={filters.favoritesOnly}
                                onChange={(e) => onChange({ ...filters, favoritesOnly: e.target.checked })}
                                className="rounded border-gray-300 dark:border-gray-600 text-yellow-500 focus:ring-yellow-500"
                            />
                            <Star size={14} className="text-yellow-400" />
                            <span className="text-sm text-gray-700 dark:text-gray-300">Solo favoritos</span>
                        </label>
                    </div>

                    {availableTags.length > 0 && (
                        <div>
                            <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Tags</label>
                            <div className="flex flex-wrap gap-1.5">
                                {availableTags.map(tag => (
                                    <button
                                        key={tag}
                                        onClick={() => toggleTag(tag)}
                                        className={`px-2.5 py-1 rounded-full text-xs font-medium transition-colors ${
                                            filters.tags.includes(tag)
                                                ? 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-400'
                                                : 'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                                        }`}
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 block">Fecha</label>
                        <div className="flex items-center gap-2">
                            <input
                                type="date"
                                value={filters.dateFrom}
                                onChange={(e) => onChange({ ...filters, dateFrom: e.target.value })}
                                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                            <span className="text-xs text-gray-400">a</span>
                            <input
                                type="date"
                                value={filters.dateTo}
                                onChange={(e) => onChange({ ...filters, dateTo: e.target.value })}
                                className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                            />
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
