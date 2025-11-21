import { MouseEvent } from 'react';
import { FileText, Trash2, Star, Download } from 'lucide-react';
import { Candidate } from '../types';
import { useAppStore } from '../store/useAppStore';
import { exportCandidatesToCSV } from '../utils/export';

interface CandidateListProps {
    onSelectCandidate: (candidate: Candidate) => void;
}

export function CandidateList({ onSelectCandidate }: CandidateListProps) {
    const { candidates, deleteCandidate, toggleFavorite } = useAppStore();

    const handleDelete = (e: MouseEvent, id: string) => {
        e.stopPropagation();
        if (confirm('¿Estás seguro de eliminar este candidato?')) {
            deleteCandidate(id);
        }
    };

    const handleToggleFavorite = (e: MouseEvent, id: string) => {
        e.stopPropagation();
        toggleFavorite(id);
    };

    const handleExport = () => {
        exportCandidatesToCSV(candidates);
    };

    if (candidates.length === 0) {
        return (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700">
                <FileText className="mx-auto h-12 w-12 text-gray-400 dark:text-gray-500" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No hay candidatos</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">Sube algunos CVs para comenzar el análisis.</p>
            </div>
        );
    }

    return (
        <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden transition-colors">
            <div className="p-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                <h3 className="font-semibold text-gray-900 dark:text-white">Candidatos ({candidates.length})</h3>
                <button
                    onClick={handleExport}
                    className="flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-300 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors"
                >
                    <Download size={16} />
                    Exportar CSV
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                        <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider w-10"></th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Candidato</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Score</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Estado</th>
                            <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                        {candidates.map((candidate) => (
                            <tr
                                key={candidate.id}
                                onClick={() => onSelectCandidate(candidate)}
                                className="hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer transition-colors"
                            >
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <button
                                        onClick={(e) => handleToggleFavorite(e, candidate.id)}
                                        className={`p-1 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors ${candidate.isFavorite ? 'text-yellow-400 fill-current' : 'text-gray-300 dark:text-gray-600'}`}
                                    >
                                        <Star size={18} fill={candidate.isFavorite ? "currentColor" : "none"} />
                                    </button>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex items-center">
                                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center text-blue-600 dark:text-blue-400 font-bold">
                                            {candidate.name ? candidate.name.charAt(0).toUpperCase() : '?'}
                                        </div>
                                        <div className="ml-4">
                                            <div className="text-sm font-medium text-gray-900 dark:text-white">{candidate.name || 'Sin nombre'}</div>
                                            <div className="text-sm text-gray-500 dark:text-gray-400">{candidate.email || 'Sin email'}</div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <div className="flex flex-col gap-1">
                                        <div className="flex items-center justify-between">
                                            <span className="font-bold text-gray-900 dark:text-white">{candidate.totalScore}</span>
                                            <span className="text-gray-400 text-xs">/40</span>
                                        </div>
                                        <div className="w-full max-w-[100px] bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                                            <div
                                                className="bg-blue-600 dark:bg-blue-500 h-2 rounded-full"
                                                style={{ width: `${(candidate.totalScore / 40) * 100}%` }}
                                            ></div>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap">
                                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                                        {candidate.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                    <button
                                        onClick={(e) => handleDelete(e, candidate.id)}
                                        className="text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
