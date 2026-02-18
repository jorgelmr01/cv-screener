import { useState } from 'react';
import { FolderOpen, Check, AlertTriangle, Download, Upload } from 'lucide-react';
import { fileSystem } from '../services/filesystem';

interface FolderPickerModalProps {
    isOpen: boolean;
    onClose: () => void;
    onFolderSelected: () => void;
}

export function FolderPickerModal({ isOpen, onClose, onFolderSelected }: FolderPickerModalProps) {
    const [status, setStatus] = useState<'idle' | 'selecting' | 'syncing' | 'done' | 'error'>('idle');
    const [folderName, setFolderName] = useState<string | null>(null);

    if (!isOpen) return null;

    const handleSelectFolder = async () => {
        setStatus('selecting');
        const handle = await fileSystem.pickDirectory();
        if (handle) {
            setFolderName(handle.name);
            setStatus('syncing');
            await fileSystem.syncAll();
            setStatus('done');
            setTimeout(() => {
                onFolderSelected();
                onClose();
            }, 1500);
        } else {
            setStatus('idle');
        }
    };

    const handleImport = async () => {
        setStatus('selecting');
        const handle = await fileSystem.pickDirectory();
        if (handle) {
            setFolderName(handle.name);
            setStatus('syncing');
            const success = await fileSystem.importFromFolder();
            if (success) {
                setStatus('done');
                setTimeout(() => {
                    onFolderSelected();
                    onClose();
                    window.location.reload();
                }, 1500);
            } else {
                setStatus('error');
            }
        } else {
            setStatus('idle');
        }
    };

    const handleSkip = () => {
        localStorage.setItem('cv-screener-folder-skipped', 'true');
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-[70] p-4">
            <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                <div className="p-8 text-center">
                    <div className="w-20 h-20 mx-auto mb-6 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-2xl flex items-center justify-center">
                        {status === 'done' ? <Check size={40} /> : status === 'error' ? <AlertTriangle size={40} /> : <FolderOpen size={40} />}
                    </div>

                    {status === 'done' ? (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Carpeta Configurada</h2>
                            <p className="text-gray-500 dark:text-gray-400">Tus datos se guardarán en <strong className="text-gray-700 dark:text-gray-200">{folderName}</strong></p>
                        </>
                    ) : status === 'error' ? (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Error</h2>
                            <p className="text-gray-500 dark:text-gray-400">No se encontró una copia de seguridad válida en la carpeta seleccionada.</p>
                        </>
                    ) : status === 'syncing' ? (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Sincronizando...</h2>
                            <div className="flex justify-center mt-4">
                                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                            </div>
                        </>
                    ) : (
                        <>
                            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Carpeta de Trabajo</h2>
                            <p className="text-gray-500 dark:text-gray-400 mb-8">
                                Selecciona una carpeta local para guardar tus datos. Esto te permite hacer copias de seguridad y transferir datos entre equipos.
                            </p>

                            <div className="space-y-3">
                                <button
                                    onClick={handleSelectFolder}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-medium transition-colors text-lg"
                                >
                                    <Download size={20} />
                                    Seleccionar Carpeta Nueva
                                </button>
                                <button
                                    onClick={handleImport}
                                    className="w-full flex items-center justify-center gap-3 px-6 py-3 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-200 rounded-xl hover:bg-gray-50 dark:hover:bg-gray-600 font-medium transition-colors"
                                >
                                    <Upload size={20} />
                                    Importar Datos Existentes
                                </button>
                                <button
                                    onClick={handleSkip}
                                    className="w-full px-6 py-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm transition-colors"
                                >
                                    Omitir por ahora
                                </button>
                            </div>
                        </>
                    )}

                    {status === 'error' && (
                        <button
                            onClick={() => setStatus('idle')}
                            className="mt-4 px-6 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 font-medium"
                        >
                            Intentar de nuevo
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
