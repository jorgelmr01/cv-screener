import { useState, useMemo, ReactNode } from 'react';
import {
    DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor,
    DragStartEvent, DragEndEvent, DragOverEvent, useDroppable, closestCenter, pointerWithin,
    rectIntersection
} from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Candidate, PipelineStatus } from '../types';
import { PIPELINE_STAGES } from '../types/pipeline';
import { useAppStore } from '../store/useAppStore';
import { Star, ChevronDown, ChevronRight } from 'lucide-react';

type KanbanSortMode = 'score' | 'name' | 'custom';

interface KanbanBoardProps {
    candidates: Candidate[];
    onSelectCandidate: (candidate: Candidate) => void;
}

function SortableCandidate({ candidate, onClick }: { candidate: Candidate; onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: candidate.id,
        data: { type: 'candidate', candidate, containerId: candidate.status }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={(e) => { e.stopPropagation(); onClick(); }}
            className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 mb-2 cursor-grab active:cursor-grabbing hover:shadow-md transition-all group"
        >
            <div className="flex justify-between items-start mb-1.5">
                <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate pr-2 flex items-center gap-1.5">
                    {candidate.isFavorite && <Star size={12} className="text-yellow-400 fill-yellow-400 shrink-0" />}
                    {candidate.name || 'Sin nombre'}
                </h4>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-xs shrink-0">{candidate.totalScore}/40</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{candidate.email || ''}</div>
            <div className="flex items-center gap-1">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-gradient-to-r from-blue-500 to-green-500 rounded-full"
                        style={{ width: `${(candidate.totalScore / 40) * 100}%` }}
                    />
                </div>
            </div>
            {candidate.tags && candidate.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                    {candidate.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400">{tag}</span>
                    ))}
                    {candidate.tags.length > 2 && (
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 dark:bg-gray-600 text-gray-500 dark:text-gray-400">+{candidate.tags.length - 2}</span>
                    )}
                </div>
            )}
        </div>
    );
}

function DroppableColumn({ id, children }: { id: string; children: ReactNode }) {
    const { setNodeRef, isOver } = useDroppable({ id, data: { type: 'column' } });
    return (
        <div
            ref={setNodeRef}
            className={`min-h-[80px] rounded-lg transition-colors ${isOver ? 'bg-blue-100/50 dark:bg-blue-900/20 ring-2 ring-blue-300 dark:ring-blue-600 ring-inset' : ''}`}
        >
            {children}
        </div>
    );
}

function customCollisionDetection(args: Parameters<typeof closestCenter>[0]) {
    const pointerCollisions = pointerWithin(args);
    if (pointerCollisions.length > 0) return pointerCollisions;
    return rectIntersection(args);
}

export function KanbanBoard({ candidates, onSelectCandidate }: KanbanBoardProps) {
    const { moveCandidate, updateCandidate } = useAppStore();
    const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);
    const [sortMode, setSortMode] = useState<KanbanSortMode>('score');
    const [showTerminal, setShowTerminal] = useState(true);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 8 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 5 } })
    );

    const pipelineStages = PIPELINE_STAGES.filter(s => s.group === 'pipeline');
    const terminalStages = PIPELINE_STAGES.filter(s => s.group === 'terminal');

    const sortedCandidatesByColumn = useMemo(() => {
        const map: Record<string, Candidate[]> = {};
        for (const stage of PIPELINE_STAGES) {
            const colCandidates = candidates.filter(c => c.status === stage.id);
            if (sortMode === 'score') {
                colCandidates.sort((a, b) => b.totalScore - a.totalScore);
            } else if (sortMode === 'name') {
                colCandidates.sort((a, b) => (a.name || '').localeCompare(b.name || ''));
            } else {
                colCandidates.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
            }
            map[stage.id] = colCandidates;
        }
        return map;
    }, [candidates, sortMode]);

    function findColumnForItem(itemId: string | number): PipelineStatus | null {
        const id = String(itemId);
        const stage = PIPELINE_STAGES.find(s => s.id === id);
        if (stage) return stage.id;
        for (const stage of PIPELINE_STAGES) {
            if (sortedCandidatesByColumn[stage.id]?.some(c => c.id === id)) {
                return stage.id;
            }
        }
        return null;
    }

    const handleDragStart = (event: DragStartEvent) => {
        const cand = event.active.data.current?.candidate;
        setActiveCandidate(cand || null);
    };

    const handleDragOver = (_event: DragOverEvent) => {
        // Visual feedback handled by DroppableColumn's isOver
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        setActiveCandidate(null);

        if (!over) return;

        const activeId = String(active.id);
        const overId = String(over.id);

        const activeColumn = findColumnForItem(activeId);
        let overColumn = findColumnForItem(overId);

        if (!activeColumn || !overColumn) return;

        // If dropping on a candidate, use that candidate's column
        const isOverColumn = PIPELINE_STAGES.some(s => s.id === overId);
        if (!isOverColumn) {
            const overCandidate = candidates.find(c => c.id === overId);
            if (overCandidate) {
                overColumn = overCandidate.status;
            }
        }

        if (activeColumn !== overColumn) {
            moveCandidate(activeId, overColumn);
        } else if (sortMode === 'custom' && !isOverColumn) {
            const columnItems = sortedCandidatesByColumn[activeColumn] || [];
            const oldIndex = columnItems.findIndex(c => c.id === activeId);
            const newIndex = columnItems.findIndex(c => c.id === overId);
            if (oldIndex !== -1 && newIndex !== -1 && oldIndex !== newIndex) {
                const reordered = arrayMove(columnItems, oldIndex, newIndex);
                reordered.forEach((c, i) => {
                    updateCandidate({ ...c, sortOrder: i });
                });
            }
        }
    };

    const renderColumn = (stage: typeof PIPELINE_STAGES[0]) => {
        const colCandidates = sortedCandidatesByColumn[stage.id] || [];
        return (
            <div
                key={stage.id}
                className={`flex-shrink-0 w-64 rounded-xl ${stage.color} ${stage.darkColor} flex flex-col max-h-full transition-colors`}
            >
                <div className="p-3 font-semibold text-sm text-gray-700 dark:text-gray-200 flex justify-between items-center">
                    <span className="truncate">{stage.label}</span>
                    <span className="bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs text-gray-500 dark:text-gray-300 shadow-sm ml-1">
                        {colCandidates.length}
                    </span>
                </div>
                <div className="flex-1 px-2 pb-2 overflow-y-auto">
                    <SortableContext
                        items={colCandidates.map(c => c.id)}
                        strategy={verticalListSortingStrategy}
                    >
                        <DroppableColumn id={stage.id}>
                            {colCandidates.map(candidate => (
                                <SortableCandidate
                                    key={candidate.id}
                                    candidate={candidate}
                                    onClick={() => onSelectCandidate(candidate)}
                                />
                            ))}
                            {colCandidates.length === 0 && (
                                <div className="text-xs text-gray-400 dark:text-gray-500 text-center py-4 italic">
                                    Arrastra aquí
                                </div>
                            )}
                        </DroppableColumn>
                    </SortableContext>
                </div>
            </div>
        );
    };

    return (
        <div className="flex flex-col h-full">
            <div className="flex items-center justify-between mb-3 shrink-0">
                <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Ordenar:</span>
                    {(['score', 'name', 'custom'] as KanbanSortMode[]).map(mode => (
                        <button
                            key={mode}
                            onClick={() => setSortMode(mode)}
                            className={`px-3 py-1 text-xs font-medium rounded-full transition-colors ${
                                sortMode === mode
                                    ? 'bg-blue-600 text-white'
                                    : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                        >
                            {mode === 'score' ? 'Score' : mode === 'name' ? 'Nombre' : 'Manual'}
                        </button>
                    ))}
                </div>
                <button
                    onClick={() => setShowTerminal(!showTerminal)}
                    className="flex items-center gap-1 text-xs text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 transition-colors"
                >
                    {showTerminal ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                    {showTerminal ? 'Ocultar' : 'Mostrar'} finales
                </button>
            </div>

            <DndContext
                sensors={sensors}
                collisionDetection={customCollisionDetection}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 overflow-x-auto overflow-y-hidden pb-2">
                    <div className="flex gap-3 h-full min-w-max">
                        {pipelineStages.map(renderColumn)}

                        {showTerminal && (
                            <>
                                <div className="w-px bg-gray-300 dark:bg-gray-600 self-stretch mx-1" />
                                {terminalStages.map(renderColumn)}
                            </>
                        )}
                    </div>
                </div>

                <DragOverlay dropAnimation={null}>
                    {activeCandidate ? (
                        <div className="bg-white dark:bg-gray-700 p-3 rounded-lg shadow-xl border-2 border-blue-400 dark:border-blue-500 transform rotate-2 cursor-grabbing w-64 opacity-95">
                            <div className="flex justify-between items-start mb-1">
                                <h4 className="font-semibold text-sm text-gray-900 dark:text-white truncate">{activeCandidate.name}</h4>
                                <span className="font-bold text-blue-600 dark:text-blue-400 text-xs">{activeCandidate.totalScore}/40</span>
                            </div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{activeCandidate.email}</div>
                        </div>
                    ) : null}
                </DragOverlay>
            </DndContext>
        </div>
    );
}
