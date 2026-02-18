import { PipelineStatus } from './index';

export interface PipelineStage {
    id: PipelineStatus;
    label: string;
    color: string;
    darkColor: string;
    badgeBg: string;
    badgeText: string;
    icon: string;
    group: 'pipeline' | 'terminal';
}

export const PIPELINE_STAGES: PipelineStage[] = [
    { id: 'new', label: 'Nuevo', color: 'bg-gray-100', darkColor: 'dark:bg-gray-800', badgeBg: 'bg-gray-100 dark:bg-gray-700', badgeText: 'text-gray-700 dark:text-gray-300', icon: 'inbox', group: 'pipeline' },
    { id: 'review', label: 'En Revisión', color: 'bg-blue-50', darkColor: 'dark:bg-blue-900/20', badgeBg: 'bg-blue-100 dark:bg-blue-900/30', badgeText: 'text-blue-700 dark:text-blue-300', icon: 'eye', group: 'pipeline' },
    { id: 'preselected', label: 'Preseleccionado', color: 'bg-indigo-50', darkColor: 'dark:bg-indigo-900/20', badgeBg: 'bg-indigo-100 dark:bg-indigo-900/30', badgeText: 'text-indigo-700 dark:text-indigo-300', icon: 'star', group: 'pipeline' },
    { id: 'interview_scheduled', label: 'Entrevista Agendada', color: 'bg-yellow-50', darkColor: 'dark:bg-yellow-900/20', badgeBg: 'bg-yellow-100 dark:bg-yellow-900/30', badgeText: 'text-yellow-700 dark:text-yellow-300', icon: 'calendar', group: 'pipeline' },
    { id: 'interviewing', label: 'Entrevistando', color: 'bg-orange-50', darkColor: 'dark:bg-orange-900/20', badgeBg: 'bg-orange-100 dark:bg-orange-900/30', badgeText: 'text-orange-700 dark:text-orange-300', icon: 'mic', group: 'pipeline' },
    { id: 'approved', label: 'Aprobado', color: 'bg-green-50', darkColor: 'dark:bg-green-900/20', badgeBg: 'bg-green-100 dark:bg-green-900/30', badgeText: 'text-green-700 dark:text-green-300', icon: 'check-circle', group: 'pipeline' },
    { id: 'offer_sent', label: 'Oferta Enviada', color: 'bg-teal-50', darkColor: 'dark:bg-teal-900/20', badgeBg: 'bg-teal-100 dark:bg-teal-900/30', badgeText: 'text-teal-700 dark:text-teal-300', icon: 'send', group: 'pipeline' },
    { id: 'hired', label: 'Contratado', color: 'bg-emerald-50', darkColor: 'dark:bg-emerald-900/20', badgeBg: 'bg-emerald-100 dark:bg-emerald-900/30', badgeText: 'text-emerald-700 dark:text-emerald-300', icon: 'badge-check', group: 'pipeline' },
    { id: 'rejected', label: 'Rechazado', color: 'bg-red-50', darkColor: 'dark:bg-red-900/20', badgeBg: 'bg-red-100 dark:bg-red-900/30', badgeText: 'text-red-700 dark:text-red-300', icon: 'x-circle', group: 'terminal' },
    { id: 'declined', label: 'Declinado', color: 'bg-pink-50', darkColor: 'dark:bg-pink-900/20', badgeBg: 'bg-pink-100 dark:bg-pink-900/30', badgeText: 'text-pink-700 dark:text-pink-300', icon: 'user-x', group: 'terminal' },
    { id: 'archived', label: 'Archivado', color: 'bg-slate-50', darkColor: 'dark:bg-slate-900/20', badgeBg: 'bg-slate-100 dark:bg-slate-900/30', badgeText: 'text-slate-700 dark:text-slate-300', icon: 'archive', group: 'terminal' },
];

export const PIPELINE_STAGES_MAP = Object.fromEntries(
    PIPELINE_STAGES.map(s => [s.id, s])
) as Record<PipelineStatus, PipelineStage>;

export function getStageLabel(status: PipelineStatus): string {
    return PIPELINE_STAGES_MAP[status]?.label ?? status;
}

export function getStageBadgeClasses(status: PipelineStatus): string {
    const stage = PIPELINE_STAGES_MAP[status];
    if (!stage) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
    return `${stage.badgeBg} ${stage.badgeText}`;
}
