import { useState, ReactNode } from 'react';
import { DndContext, DragOverlay, useSensor, useSensors, MouseSensor, TouchSensor, DragStartEvent, DragEndEvent, useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Candidate, PipelineStatus } from '../types';
import { useAppStore } from '../store/useAppStore';

const COLUMNS: { id: PipelineStatus; title: string; color: string; darkColor: string }[] = [
    { id: 'new', title: 'Nuevo', color: 'bg-gray-100', darkColor: 'dark:bg-gray-800' },
    { id: 'review', title: 'En Revisión', color: 'bg-blue-50', darkColor: 'dark:bg-blue-900/20' },
    { id: 'preselected', title: 'Preseleccionado', color: 'bg-indigo-50', darkColor: 'dark:bg-indigo-900/20' },
    { id: 'interview_scheduled', title: 'Entrevista', color: 'bg-yellow-50', darkColor: 'dark:bg-yellow-900/20' },
    { id: 'approved', title: 'Aprobado', color: 'bg-green-50', darkColor: 'dark:bg-green-900/20' },
    { id: 'rejected', title: 'Rechazado', color: 'bg-red-50', darkColor: 'dark:bg-red-900/20' }
];

interface KanbanBoardProps {
    candidates: Candidate[];
    onSelectCandidate: (candidate: Candidate) => void;
}

function SortableCandidate({ candidate, onClick }: { candidate: Candidate; onClick: () => void }) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: candidate.id,
        data: { candidate }
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            onClick={onClick}
            className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-sm border border-gray-200 dark:border-gray-600 mb-3 cursor-grab hover:shadow-md transition-shadow"
        >
            <div className="flex justify-between items-start mb-2">
                <h4 className="font-semibold text-gray-900 dark:text-white truncate pr-2">{candidate.name || 'Sin nombre'}</h4>
                <span className="font-bold text-blue-600 dark:text-blue-400 text-sm">{candidate.totalScore}</span>
            </div>
            <div className="text-xs text-gray-500 dark:text-gray-400 mb-2 truncate">{candidate.email}</div>

            <div className="flex items-center gap-1 mb-2">
                <div className="flex-1 h-1.5 bg-gray-100 dark:bg-gray-600 rounded-full overflow-hidden">
                    <div
                        className="h-full bg-green-500 rounded-full"
                        style={{ width: `${candidate.relevance * 10}%` }}
                    />
                </div>
                <span className="text-xs text-gray-400 dark:text-gray-500 w-6 text-right">{candidate.relevance}</span>
            </div>
        </div>
    );
}

function DroppableColumn({ id, children }: { id: string; children: ReactNode }) {
    const { setNodeRef } = useDroppable({ id });
    return <div ref={setNodeRef} className="min-h-full">{children}</div>;
}

export function KanbanBoard({ candidates, onSelectCandidate }: KanbanBoardProps) {
    const { moveCandidate } = useAppStore();

    const [activeCandidate, setActiveCandidate] = useState<Candidate | null>(null);

    const sensors = useSensors(
        useSensor(MouseSensor, { activationConstraint: { distance: 10 } }),
        useSensor(TouchSensor, { activationConstraint: { delay: 250, tolerance: 5 } })
    );

    const handleDragStart = (event: DragStartEvent) => {
        const { active } = event;

        setActiveCandidate(active.data.current?.candidate || null);
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;

        if (over && active.id !== over.id) {
            const containerId = over.id as PipelineStatus;
            if (COLUMNS.some(col => col.id === containerId)) {
                moveCandidate(active.id as string, containerId);
            }
        }


        setActiveCandidate(null);
    };

    return (
        <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
            <div className="flex h-full gap-4 overflow-x-auto pb-4">
                {COLUMNS.map((col) => (
                    <div key={col.id} className={`flex-shrink-0 w-72 rounded-xl ${col.color} ${col.darkColor} flex flex-col max-h-full transition-colors`}>
                        <div className="p-4 font-semibold text-gray-700 dark:text-gray-200 flex justify-between items-center">
                            {col.title}
                            <span className="bg-white dark:bg-gray-700 px-2 py-0.5 rounded-full text-xs text-gray-500 dark:text-gray-300 shadow-sm">
                                {candidates.filter(c => c.status === col.id).length}
                            </span>
                        </div>

                        <div className="flex-1 p-3 overflow-y-auto min-h-[100px]">
                            <SortableContext
                                items={candidates.filter(c => c.status === col.id).map(c => c.id)}
                                strategy={verticalListSortingStrategy}
                            >
                                <DroppableColumn id={col.id}>
                                    {candidates
                                        .filter(c => c.status === col.id)
                                        .map(candidate => (
                                            <SortableCandidate
                                                key={candidate.id}
                                                candidate={candidate}
                                                onClick={() => onSelectCandidate(candidate)}
                                            />
                                        ))
                                    }
                                </DroppableColumn>
                            </SortableContext>
                        </div>
                    </div>
                ))}
            </div>

            <DragOverlay>
                {activeCandidate ? (
                    <div className="bg-white dark:bg-gray-700 p-4 rounded-lg shadow-lg border border-blue-200 dark:border-blue-500/30 transform rotate-3 cursor-grabbing w-72">
                        <div className="flex justify-between items-start mb-2">
                            <h4 className="font-semibold text-gray-900 dark:text-white">{activeCandidate.name}</h4>
                            <span className="font-bold text-blue-600 dark:text-blue-400">{activeCandidate.totalScore}</span>
                        </div>
                    </div>
                ) : null}
            </DragOverlay>
        </DndContext>
    );
}
