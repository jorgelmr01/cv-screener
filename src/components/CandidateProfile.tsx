import { useState, useEffect, ChangeEvent } from 'react';
import { X, Phone, ExternalLink, Save, Calendar, Star, MessageCircle, ChevronDown, Tag, FileText } from 'lucide-react';
import { Candidate, PipelineStatus, ActivityLogEntry } from '../types';
import { useAppStore } from '../store/useAppStore';
import { InterviewQuestionsModal } from './InterviewQuestionsModal';
import { RejectionModal } from './RejectionModal';
import { ActivityTimeline } from './ActivityTimeline';
import { PIPELINE_STAGES } from '../types/pipeline';
import { exportCandidateReportToWord } from '../services/docx';

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

function AnalysisSection({ title, content }: { title: string; content: string }) {
    return (
        <div>
            <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">{title}</h4>
            <p className="text-sm text-gray-600 dark:text-gray-400 leading-relaxed">{content}</p>
        </div>
    );
}

export function CandidateProfile({ candidate: initialCandidate, onClose }: CandidateProfileProps) {
    const { candidates, updateCandidate, toggleFavorite, moveCandidate, currentSearch } = useAppStore();

    const candidate = candidates.find(c => c.id === initialCandidate.id) || initialCandidate;

    const [newNote, setNewNote] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [interviewDate, setInterviewDate] = useState(candidate.interviewDate || '');
    const [showQuestionsModal, setShowQuestionsModal] = useState(false);
    const [showRejectionModal, setShowRejectionModal] = useState<PipelineStatus | null>(null);
    const [pdfObjectUrl, setPdfObjectUrl] = useState<string | null>(null);
    const [tagInput, setTagInput] = useState('');

    const notesList = Array.isArray(candidate.notes)
        ? candidate.notes
        : candidate.notes
            ? [{ id: 'legacy', content: candidate.notes as unknown as string, date: candidate.createdAt }]
            : [];

    useEffect(() => {
        if (candidate.pdfDataUrl) {
            try {
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
                    setPdfObjectUrl(candidate.pdfDataUrl);
                }
            } catch (e) {
                console.error("Error processing PDF data", e);
            }
        } else if (candidate.pdfUrl) {
            setPdfObjectUrl(candidate.pdfUrl);
        }
    }, [candidate.pdfDataUrl, candidate.pdfUrl]);

    useEffect(() => {
        const handleEsc = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
        document.addEventListener('keydown', handleEsc);
        return () => document.removeEventListener('keydown', handleEsc);
    }, [onClose]);

    const handleSaveNote = async () => {
        if (!newNote.trim()) return;
        setIsSaving(true);
        try {
            const note = { id: crypto.randomUUID(), content: newNote, date: new Date().toISOString() };
            const entry: ActivityLogEntry = {
                id: crypto.randomUUID(),
                action: 'note_added',
                description: 'Nota añadida',
                date: new Date().toISOString(),
            };
            const updatedNotes = [...notesList, note];
            const activityLog = [...(candidate.activityLog || []), entry];
            await updateCandidate({ ...candidate, notes: updatedNotes, activityLog });
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
        const entry: ActivityLogEntry = {
            id: crypto.randomUUID(),
            action: 'interview_date_set',
            description: `Fecha de entrevista: ${date ? new Date(date).toLocaleString('es-ES') : 'removida'}`,
            date: new Date().toISOString(),
        };
        await updateCandidate({ ...candidate, interviewDate: date, activityLog: [...(candidate.activityLog || []), entry] });
    };

    const handleStatusChange = async (e: ChangeEvent<HTMLSelectElement>) => {
        const newStatus = e.target.value as PipelineStatus;
        if (newStatus === 'rejected' || newStatus === 'declined') {
            setShowRejectionModal(newStatus);
        } else {
            await moveCandidate(candidate.id, newStatus);
        }
    };

    const handleRejectionConfirm = async (reason: string) => {
        if (showRejectionModal) {
            await moveCandidate(candidate.id, showRejectionModal, reason);
            setShowRejectionModal(null);
        }
    };

    const handleAddTag = async () => {
        if (!tagInput.trim()) return;
        const tags = Array.from(new Set([...(candidate.tags || []), tagInput.trim()]));
        const entry: ActivityLogEntry = {
            id: crypto.randomUUID(),
            action: 'tag_added',
            description: `Tag "${tagInput.trim()}" añadido`,
            date: new Date().toISOString(),
        };
        await updateCandidate({ ...candidate, tags, activityLog: [...(candidate.activityLog || []), entry] });
        setTagInput('');
    };

    const handleRemoveTag = async (tag: string) => {
        const tags = (candidate.tags || []).filter(t => t !== tag);
        const entry: ActivityLogEntry = {
            id: crypto.randomUUID(),
            action: 'tag_removed',
            description: `Tag "${tag}" removido`,
            date: new Date().toISOString(),
        };
        await updateCandidate({ ...candidate, tags, activityLog: [...(candidate.activityLog || []), entry] });
    };

    const handleExportWord = () => {
        exportCandidateReportToWord(candidate, currentSearch?.name || 'Puesto');
    };

    const showInterviewDate = ['interview_scheduled', 'interviewing', 'approved', 'offer_sent', 'hired'].includes(candidate.status);

    return (
        <>
            <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
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
                                        className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${candidate.isFavorite ? 'text-yellow-400' : 'text-gray-300 dark:text-gray-600'}`}
                                    >
                                        <Star size={20} fill={candidate.isFavorite ? "currentColor" : "none"} />
                                    </button>
                                </div>
                                <div className="flex items-center gap-4 text-sm text-gray-500 dark:text-gray-400">
                                    {candidate.email && <span>{candidate.email}</span>}
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
                            <div className="relative">
                                <select
                                    value={candidate.status}
                                    onChange={handleStatusChange}
                                    className="appearance-none pl-3 pr-8 py-1.5 bg-gray-50 dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-200 focus:ring-2 focus:ring-blue-500 focus:border-transparent cursor-pointer"
                                >
                                    {PIPELINE_STAGES.map(stage => (
                                        <option key={stage.id} value={stage.id}>{stage.label}</option>
                                    ))}
                                </select>
                                <ChevronDown size={14} className="absolute right-2.5 top-1/2 transform -translate-y-1/2 text-gray-500 dark:text-gray-400 pointer-events-none" />
                            </div>

                            <button
                                onClick={() => setShowQuestionsModal(true)}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-900/30 hover:bg-blue-100 dark:hover:bg-blue-900/50 rounded-lg transition-colors"
                            >
                                <MessageCircle size={16} />
                                Preguntas
                            </button>

                            <button
                                onClick={handleExportWord}
                                className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors border border-gray-200 dark:border-gray-600"
                            >
                                <FileText size={16} />
                                Word
                            </button>

                            {showInterviewDate && (
                                <div className="flex items-center gap-2 bg-orange-50 dark:bg-orange-900/20 px-3 py-1.5 rounded-lg border border-orange-100 dark:border-orange-900/30">
                                    <Calendar size={16} className="text-orange-500 dark:text-orange-400" />
                                    <input
                                        type="datetime-local"
                                        value={interviewDate}
                                        onChange={handleDateChange}
                                        className="text-sm bg-transparent border-none p-0 focus:ring-0 text-gray-700 dark:text-gray-300 w-40"
                                    />
                                </div>
                            )}

                            <div className="flex items-center gap-2 px-3 py-1 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium">
                                <span className="text-lg font-bold">{candidate.totalScore}/40</span>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-full transition-colors text-gray-500 dark:text-gray-400">
                                <X size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 flex overflow-hidden">
                        {/* Left Column */}
                        <div className="w-5/12 overflow-y-auto border-r border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50 transition-colors">
                            <div className="p-6 space-y-6">
                                {/* Scores */}
                                <div className="grid grid-cols-2 gap-3">
                                    <ScoreCard title="Relevancia" score={candidate.relevance} color="bg-white dark:bg-gray-800 border border-blue-100 dark:border-blue-900/30 text-blue-700 dark:text-blue-400" />
                                    <ScoreCard title="Educación" score={candidate.education} color="bg-white dark:bg-gray-800 border border-purple-100 dark:border-purple-900/30 text-purple-700 dark:text-purple-400" />
                                    <ScoreCard title="Experiencia" score={candidate.previousJobs} color="bg-white dark:bg-gray-800 border border-orange-100 dark:border-orange-900/30 text-orange-700 dark:text-orange-400" />
                                    <ScoreCard title="Proactividad" score={candidate.proactivity} color="bg-white dark:bg-gray-800 border border-green-100 dark:border-green-900/30 text-green-700 dark:text-green-400" />
                                </div>

                                {/* Tags */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                        <Tag size={16} /> Tags
                                    </h3>
                                    <div className="flex flex-wrap gap-1.5 mb-3">
                                        {(candidate.tags || []).map(tag => (
                                            <span key={tag} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
                                                {tag}
                                                <button onClick={() => handleRemoveTag(tag)} className="hover:text-red-500 transition-colors">
                                                    <X size={12} />
                                                </button>
                                            </span>
                                        ))}
                                        {(!candidate.tags || candidate.tags.length === 0) && (
                                            <span className="text-xs text-gray-400 dark:text-gray-500 italic">Sin tags</span>
                                        )}
                                    </div>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={tagInput}
                                            onChange={(e) => setTagInput(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && handleAddTag()}
                                            placeholder="Añadir tag..."
                                            className="flex-1 px-3 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                        />
                                        <button
                                            onClick={handleAddTag}
                                            disabled={!tagInput.trim()}
                                            className="px-3 py-1.5 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-medium"
                                        >
                                            Añadir
                                        </button>
                                    </div>
                                </div>

                                {/* Rejection reason */}
                                {candidate.rejectionReason && (
                                    <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 border border-red-200 dark:border-red-900/30">
                                        <h3 className="font-semibold text-red-800 dark:text-red-300 text-sm mb-1">Motivo de rechazo</h3>
                                        <p className="text-sm text-red-700 dark:text-red-400">{candidate.rejectionReason}</p>
                                    </div>
                                )}

                                {/* Notes */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm transition-colors">
                                    <h3 className="font-semibold text-gray-900 dark:text-white flex items-center gap-2 mb-3">
                                        Notas
                                    </h3>
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
                                    <textarea
                                        value={newNote}
                                        onChange={(e) => setNewNote(e.target.value)}
                                        placeholder="Añadir nueva nota..."
                                        className="w-full h-20 p-3 border border-gray-200 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                                    />
                                    <button
                                        onClick={handleSaveNote}
                                        disabled={isSaving || !newNote.trim()}
                                        className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 bg-gray-900 dark:bg-gray-700 text-white rounded-lg hover:bg-gray-800 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors text-sm font-medium"
                                    >
                                        <Save size={16} />
                                        {isSaving ? 'Guardando...' : 'Añadir Nota'}
                                    </button>
                                </div>

                                {/* Activity Timeline */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
                                    <h3 className="font-semibold text-gray-900 dark:text-white mb-3">Actividad</h3>
                                    <ActivityTimeline entries={candidate.activityLog || []} />
                                </div>

                                {/* AI Analysis */}
                                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 shadow-sm space-y-6 transition-colors">
                                    <h3 className="font-semibold text-gray-900 dark:text-white border-b border-gray-100 dark:border-gray-700 pb-2">Análisis de IA</h3>
                                    {candidate.criticalAnalysis && (
                                        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-lg border border-blue-100 dark:border-blue-900/30">
                                            <h4 className="text-sm font-medium text-blue-800 dark:text-blue-300 mb-1">Resumen Ejecutivo</h4>
                                            <p className="text-sm text-blue-700 dark:text-blue-400">{candidate.criticalAnalysis}</p>
                                        </div>
                                    )}
                                    {candidate.strengths && candidate.strengths.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-green-700 dark:text-green-400 mb-2">Fortalezas</h4>
                                            <ul className="space-y-1">
                                                {candidate.strengths.map((s, i) => (
                                                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                                                        <span className="text-green-500">+</span> {s}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    {candidate.weaknesses && candidate.weaknesses.length > 0 && (
                                        <div>
                                            <h4 className="text-sm font-medium text-red-700 dark:text-red-400 mb-2">Debilidades</h4>
                                            <ul className="space-y-1">
                                                {candidate.weaknesses.map((w, i) => (
                                                    <li key={i} className="text-sm text-gray-600 dark:text-gray-400 flex gap-2">
                                                        <span className="text-red-500">-</span> {w}
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    )}
                                    <AnalysisSection title="Relevancia del Perfil" content={candidate.analysis.relevance} />
                                    <AnalysisSection title="Nivel Educativo" content={candidate.analysis.education} />
                                    <AnalysisSection title="Experiencia Laboral" content={candidate.analysis.previousJobs} />
                                    <AnalysisSection title="Proactividad y Logros" content={candidate.analysis.proactivity} />
                                </div>

                                <div className="text-xs text-gray-400 dark:text-gray-500 text-center pt-4">
                                    Añadido el {new Date(candidate.createdAt).toLocaleDateString()} &bull; ID: {candidate.id.slice(0, 8)}
                                </div>
                            </div>
                        </div>

                        {/* Right Column: PDF */}
                        <div className="w-7/12 bg-gray-200 dark:bg-gray-900 flex flex-col border-l border-gray-200 dark:border-gray-700">
                            <div className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 p-2 flex justify-between items-center px-4 transition-colors">
                                <span className="text-sm font-medium text-gray-600 dark:text-gray-300 truncate max-w-[300px]">
                                    {candidate.fileName}
                                </span>
                                {pdfObjectUrl && (
                                    <a href={pdfObjectUrl} target="_blank" rel="noopener noreferrer"
                                        className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm flex items-center gap-1">
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
                                            <a href={pdfObjectUrl} target="_blank" rel="noopener noreferrer"
                                                className="text-blue-600 dark:text-blue-400 hover:underline mt-2">
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
                <InterviewQuestionsModal candidate={candidate} onClose={() => setShowQuestionsModal(false)} />
            )}

            {showRejectionModal && (
                <RejectionModal
                    targetStatus={showRejectionModal}
                    candidateName={candidate.name || 'Candidato'}
                    onConfirm={handleRejectionConfirm}
                    onCancel={() => setShowRejectionModal(null)}
                />
            )}
        </>
    );
}
