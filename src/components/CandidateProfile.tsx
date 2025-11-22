import { useState, useEffect, ChangeEvent } from 'react';
import { X, Phone, ExternalLink, Save, Calendar, Star, MessageCircle, ChevronDown } from 'lucide-react';
import { Candidate, PipelineStatus } from '../types';
import { useAppStore } from '../store/useAppStore';
import { InterviewQuestionsModal } from './InterviewQuestionsModal';

interface CandidateProfileProps {
    candidate: Candidate;
    onClose: () => void;
}

interface ScoreCardProps {
    title: string;
    score: number;
    color: string;
}

function ScoreCard({ title, score, color }: ScoreCardProps) {
    return (
        <div className={`p-3 rounded-lg ${color}`}>
            <div className="text-xs font-medium opacity-80 uppercase tracking-wider">{title}</div>
            <div className="text-2xl font-bold mt-1">{score}/10</div>
        </div>
    );
}

interface AnalysisSectionProps {
    title: string;
    content: string;
}

function AnalysisSection({ title, content }: AnalysisSectionProps) {
    return (
        <div>
            <h4 className="text-sm font-medium text-gray-700 mb-1">{title}</h4>
            <p className="text-sm text-gray-600 leading-relaxed">{content}</p>
        </div>
    );
}

const PIPELINE_STATUSES: { value: PipelineStatus; label: string }[] = [
    { value: 'new', label: 'Nuevo' },
    { value: 'review', label: 'En Revisión' },
    { value: 'preselected', label: 'Preseleccionado' },
    { value: 'interview_scheduled', label: 'Entrevista Agendada' },
    { value: 'interviewing', label: 'Entrevistando' },
    { value: 'approved', label: 'Aprobado' },
    { value: 'rejected', label: 'Rechazado' },
    { value: 'offer_sent', label: 'Oferta Enviada' },
    { value: 'hired', label: 'Contratado' },
    { value: 'declined', label: 'Declinado' },
    { value: 'archived', label: 'Archivado' },
];

export function CandidateProfile({ candidate: initialCandidate, onClose }: CandidateProfileProps) {
    const { candidates, updateCandidate, toggleFavorite, moveCandidate } = useAppStore();

    // Get latest candidate state from store to ensure reactivity (fixes favorite toggle issue)
    const candidate = candidates.find(c => c.id === initialCandidate.id) || initialCandidate;

    const [newNote, setNewNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [interviewDate, setInterviewDate] = useState(candidate.interviewDate || '');
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);

    // Handle migration of legacy string notes to Note[]
    const notesList = Array.isArray(candidate.notes)
        ? candidate.notes
        : candidate.notes
            ? [{ id: 'legacy', content: candidate.notes as string, date: candidate.createdAt }]
            : [];

    // Generate fresh Blob URL for PDF to avoid stale/broken links
    useEffect(() => {
        if (candidate.pdfDataUrl) {
            try {
                // Check if it's a base64 data URL
                if (candidate.pdfDataUrl.startsWith('data:application/pdf;base64,')) {
                    const base64 = candidate.pdfDataUrl.split(',')[1];
                    const binaryString = window.atob(base64);
                    const len = binaryString.length;
                    const bytes = new Uint8Array(len);
                    for (let i = 0; i < len; i++) {
                        bytes[i] = binaryString.charCodeAt(i);
                    }
                    const blob = new Blob([bytes], { type: 'application/pdf' });
                    const url = URL.createObjectURL(blob);
                    setPdfObjectUrl(url);
                    return () => URL.revokeObjectURL(url);
                } else {
                    // Fallback if it's already a blob url or other format (though we prefer base64 for persistence)
                    setPdfObjectUrl(candidate.pdfDataUrl);
                }
            } catch (e) {
                console.error("Error processing PDF data", e);
            }
        } else if (candidate.pdfUrl) {
            // Fallback to legacy pdfUrl if pdfDataUrl is missing
            setPdfObjectUrl(candidate.pdfUrl);
        }
    }, [candidate.pdfDataUrl, candidate.pdfUrl]);

    const handleSaveNote = async () => {
        if (!newNote.trim()) return;

        setIsSaving(true);
        try {
            const note = {
                id: crypto.randomUUID(),
                content: newNote,
                date: new Date().toISOString()
            };

            const updatedNotes = [...notesList, note];
            await updateCandidate({ ...candidate, notes: updatedNotes });
            setNewNote('');
        } catch (error) {
            console.error('Failed to save note:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const handleDateChange = async (e: ChangeEvent<HTMLInputElement>) => {
        const date = e.target.value;
        setInterviewDate(date);
        await updateCandidate({ ...candidate, interviewDate: date });
    };

    const handleStatusChange = async (e: ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as PipelineStatus;
        await moveCandidate(candidate.id, newStatus);
    };

    const showInterviewDate = ['interview_scheduled', 'interviewing', 'approved', 'offer_sent', 'hired'].includes(candidate.status);

    return (
        <>
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-[95vw] h-[90vh] flex flex-col overflow-hidden transition-colors">
                    {/* Header */}
                    <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 shrink-0 bg-white dark:bg-gray-800 transition-colors">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center text-xl font-bold">
                                {candidate.name ? candidate.name.charAt(0).toUpperCase() : '?'}
                            </div>
                            <div>
                                <div className="flex items-center gap-2">
                                    <h2 className="text-xl font-bold text-gray-900 dark:text-white">{candidate.name}</h2>
                                    <button
                                        onClick={() => toggleFavorite(candidate.id)}
                                        className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${candidate.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                                    >
                                        <Star size={20} fill={candidate.isFavorite ? "currentColor" : "none"} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    {/* Email button removed as requested */}
                                    {candidate.phone && (
                                        <div className="flex items-center gap-1">
                                            <Phone size={14} />
                                            <span>{candidate.phone}</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                        <div className="flex items-center gap-3">
                            {/* Status Selector */}
                            <div className="relative">
                                <select
                                    value={candidate.status}
                                    onChange={handleStatusChange}
                                    className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                >
                                    {PIPELINE_STATUSES.map(status => (
                                        <option key={status.value} value={status.value}>
                                            {status.label}
                                        </option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
                            </div>

                            <button
                                onClick={() => setShowQuestionsModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            >
                                <MessageCircle size={16} />
                                Generar Preguntas
                            </button>

                            {/* Interview Date - Only visible for relevant statuses */}
                            {showInterviewDate && (
                                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                    <Calendar size={16} className="text-orange-500 dark:text-orange-400" />
                                    <span className="text-xs font-medium text-orange-700 dark:text-orange-300">Entrevista:</span>
                                    <input
                                        type="datetime-local"
                                        value={interviewDate}
                                        onChange={handleDateChange}
                                        className="text-sm bg-transparent border-none p-0 focus:ring-0 text-gray-700 dark:text-gray-300 w-36"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                <span>Score:</span>
                                <span className="text-lg font-bold">{candidate.totalScore}/40</span>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Content - Split View */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Column: Analysis & Info (Scrollable) */}
                        <div className="w-5/12 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 transition-colors">
                            <div className="p-6 space-y-6">
                                {/* Scores */}
                                <div className="grid grid-cols-2 gap-3">
                                    <ScoreCard title="Relevancia" score={candidate.relevance} color="bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400" />
                                    <ScoreCard title="Educación" score={candidate.education} color="bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-400" />
                                    <ScoreCard title="Experiencia" score={candidate.previousJobs} color="bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/30 text-orange-700 dark:text-orange-400" />
                                    <ScoreCard title="Proactividad" score={candidate.proactivity} color="bg-white dark:bg-gray-800 border border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400" />
                                </div>

                                {/* Notes Section */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                                    <div className="flex items-center justify-between mb-3">
                                        <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2">
                                            <span>📝</span> Notas
                                        </h3>
                                    </div>

                                    {/* Notes List */}
                                    <div className="space-y-3 mb-4 max-h-[200px] overflow-y-auto">
                                        {notesList.length > 0 ? (
                                            notesList.map((note) => (
                                                <div key={note.id} className="bg-gray-50 dark:bg-gray-700/50 p-3 rounded-lg text-sm">
                                                    <p className="text-gray-800 dark:text-gray-200 whitespace-pre-wrap">{note.content}</p>
                                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                                        {new Date(note.date).toLocaleString()}
                                                    </p>
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-sm text-gray-400 dark:text-gray-500 italic text-center py-2">No hay notas aún</p>
                                        )}
                                    </div>

                                    <div className="flex gap-2">
                                        <textarea
                                            value={newNote}
                                            onChange={(e) => setNewNote(e.target.value)}
                                            placeholder="Añadir nueva nota..."
                                            className="flex-1 h-20 p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                    </div>
                                    <button
                                        onClick={handleSaveNote}
                                        disabled={isSaving || !newNote.trim()}
                                        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm font-medium"
                                    >
                                        <Save size={16} />
                                        {isSaving ? 'Guardando...' : 'Añadir Nota'}
                                    </button>
                                </div>

                                {/* Detailed Analysis */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
                                    <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Análisis de IA</h3>
                                    <AnalysisSection title="Relevancia del Perfil" content={candidate.analysis.relevance} />
                                    <AnalysisSection title="Nivel Educativo" content={candidate.analysis.education} />
                                    <AnalysisSection title="Experiencia Laboral" content={candidate.analysis.previousJobs} />
                                    <AnalysisSection title="Proactividad y Logros" content={candidate.analysis.proactivity} />
                                </div>

                                {/* Metadata */}
                                <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
                                    Añadido el {new Date(candidate.createdAt).toLocaleDateString()} • ID: {candidate.id.slice(0, 8)}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: PDF Preview (Full Height) */}
                        <div className="w-7/12 bg-gray-200 dark:bg-gray-900 flex flex-col border-l border-gray-200 dark:border-gray-700">
                            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex justify-between items-center px-4 transition-colors">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-[300px]">
                                    {candidate.fileName}
                                </span>
                                {pdfObjectUrl && (
                                    <a
                                        href={pdfObjectUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center gap-1"
                                    >
                                        <ExternalLink size={14} />
                                        Abrir en nueva pestaña
                                    </a>
                                )}
                            </div>
                            <div className="flex-1 relative bg-gray-100 dark:bg-gray-900">
                                {pdfObjectUrl ? (
                                    <object
                                        data={`${pdfObjectUrl}#toolbar=0&navpanes=0&scrollbar=0`}
                                        type="application/pdf"
                                        className="absolute inset-0 w-full h-full"
                                    >
                                        <div className="flex flex-col items-center justify-center h-full text-gray-500 dark:text-gray-400">
                                            <p>No se pudo visualizar el PDF directamente.</p>
                                            <a
                                                href={pdfObjectUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline mt-2"
                                            >
                                                Descargar PDF
                                            </a>
                                        </div>
                                    </object>
                                ) : (
                                    <div className="absolute inset-0 flex items-center justify-center text-gray-500 dark:text-gray-400">
                                        No hay vista previa disponible
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            {showQuestionsModal && (
                <InterviewQuestionsModal
                    candidate={candidate}
                    onClose={() => setShowQuestionsModal(false)}
                />
            )}
        </>
    );
}
