import { ActivityLogEntry } from '../types';
import { ArrowRight, Plus, Star, Tag, Calendar, UserCheck, Clock } from 'lucide-react';

interface ActivityTimelineProps {
    entries: ActivityLogEntry[];
}

function getIcon(action: ActivityLogEntry['action']) {
    switch (action) {
        case 'status_change': return <ArrowRight size={12} />;
        case 'note_added': return <Plus size={12} />;
        case 'created': return <UserCheck size={12} />;
        case 'favorite_toggled': return <Star size={12} />;
        case 'tag_added': case 'tag_removed': return <Tag size={12} />;
        case 'interview_date_set': return <Calendar size={12} />;
        default: return <Clock size={12} />;
    }
}

function getColor(action: ActivityLogEntry['action']) {
    switch (action) {
        case 'status_change': return 'bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400';
        case 'note_added': return 'bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400';
        case 'created': return 'bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400';
        case 'favorite_toggled': return 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-600 dark:text-yellow-400';
        case 'tag_added': case 'tag_removed': return 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400';
        case 'interview_date_set': return 'bg-orange-100 dark:bg-orange-900/30 text-orange-600 dark:text-orange-400';
        default: return 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400';
    }
}

export function ActivityTimeline({ entries }: ActivityTimelineProps) {
    const sorted = [...entries].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    if (sorted.length === 0) {
        return (
            <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-3">Sin actividad registrada</p>
        );
    }

    return (
        <div className="space-y-0">
            {sorted.slice(0, 15).map((entry, index) => (
                <div key={entry.id} className="flex gap-3 group">
                    <div className="flex flex-col items-center">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 ${getColor(entry.action)}`}>
                            {getIcon(entry.action)}
                        </div>
                        {index < sorted.length - 1 && (
                            <div className="w-px h-full bg-gray-200 dark:bg-gray-700 min-h-[16px]" />
                        )}
                    </div>
                    <div className="pb-3 -mt-0.5">
                        <p className="text-xs text-gray-700 dark:text-gray-300">{entry.description}</p>
                        <p className="text-[10px] text-gray-400 dark:text-gray-500 mt-0.5">
                            {new Date(entry.date).toLocaleString('es-ES', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                        </p>
                    </div>
                </div>
            ))}
            {sorted.length > 15 && (
                <p className="text-xs text-gray-400 dark:text-gray-500 text-center">+{sorted.length - 15} eventos más</p>
            )}
        </div>
    );
}
