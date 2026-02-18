import { useState } from 'react';
import { X } from 'lucide-react';
import { PipelineStatus } from '../types';
import { getStageLabel } from '../types/pipeline';

interface RejectionModalProps {
    targetStatus: PipelineStatus;
    candidateName: string;
    onConfirm: (reason: string) => void;
    onCancel: () => void;
}

const COMMON_REASONS = [
    'No cumple requisitos mínimos',
    'Experiencia insuficiente',
    'Perfil no alineado con la cultura',
    'Expectativas salariales no compatibles',
    'Mejor candidato seleccionado',
    'Candidato declinó la oferta',
    'No se presentó a la entrevista',
    'Referencias negativas',
    'Otro',
];

export function RejectionModal({ targetStatus, candidateName, onConfirm, onCancel }: RejectionModalProps) {
    const [selectedReason, setSelectedReason] = useState('');
    const [customReason, setCustomReason] = useState('');

    const handleConfirm = () => {
        const reason = selectedReason === 'Otro' ? customReason : selectedReason;
        onConfirm(reason || 'Sin motivo especificado');
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-[65] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl w-full max-w-md">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
                    <div>
                        <h2 className="text-lg font-bold text-gray-900 dark:text-white">
                            Mover a {getStageLabel(targetStatus)}
                        </h2>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{candidateName}</p>
                    </div>
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-6 space-y-4">
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                        Motivo
                    </label>
                    <div className="space-y-2">
                        {COMMON_REASONS.map(reason => (
                            <label key={reason} className="flex items-center gap-3 cursor-pointer group">
                                <input
                                    type="radio"
                                    name="reason"
                                    value={reason}
                                    checked={selectedReason === reason}
                                    onChange={(e) => setSelectedReason(e.target.value)}
                                    className="text-blue-600 focus:ring-blue-500"
                                />
                                <span className="text-sm text-gray-700 dark:text-gray-300 group-hover:text-gray-900 dark:group-hover:text-white">
                                    {reason}
                                </span>
                            </label>
                        ))}
                    </div>

                    {selectedReason === 'Otro' && (
                        <textarea
                            value={customReason}
                            onChange={(e) => setCustomReason(e.target.value)}
                            placeholder="Describe el motivo..."
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-blue-500"
                            rows={3}
                        />
                    )}
                </div>

                <div className="p-4 border-t border-gray-200 dark:border-gray-700 flex justify-end gap-3">
                    <button
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg font-medium text-sm"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleConfirm}
                        disabled={!selectedReason || (selectedReason === 'Otro' && !customReason.trim())}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 font-medium text-sm"
                    >
                        Confirmar
                    </button>
                </div>
            </div>
        </div>
    );
}
