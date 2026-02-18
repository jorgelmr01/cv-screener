import { useState } from 'react';
import { Save, Plus, Trash2, FolderOpen, RefreshCw } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { fileSystem } from '../services/filesystem';

export function SettingsPage() {
    const { settings, setSettings, addToast } = useAppStore();
    const [apiKey, setApiKey] = useState(settings.apiKey);
    const [isSaved, setIsSaved] = useState(false);
    const [presetName, setPresetName] = useState('');
    const [selectedPreset, setSelectedPreset] = useState('');
    const [isSyncing, setIsSyncing] = useState(false);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await setSettings({ ...settings, apiKey });
        setIsSaved(true);
        addToast('Configuración guardada', 'success');
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleSavePreset = async () => {
        if (!presetName.trim() || !settings.defaultEvaluationCriteria) return;
        const newPresets = { ...(settings.criteriaPresets || {}), [presetName.trim()]: settings.defaultEvaluationCriteria };
        await setSettings({ ...settings, criteriaPresets: newPresets });
        setPresetName('');
        addToast('Preset guardado', 'success');
    };

    const handleDeletePreset = async (name: string) => {
        if (!settings.criteriaPresets) return;
        const newPresets = { ...settings.criteriaPresets };
        delete newPresets[name];
        await setSettings({ ...settings, criteriaPresets: newPresets });
    };

    const handleLoadPreset = async (name: string) => {
        if (!settings.criteriaPresets?.[name]) return;
        await setSettings({ ...settings, defaultEvaluationCriteria: settings.criteriaPresets[name] });
        addToast(`Preset "${name}" cargado`, 'info');
    };

    const handleChangeFolder = async () => {
        const handle = await fileSystem.pickDirectory();
        if (handle) {
            addToast(`Carpeta cambiada a "${handle.name}"`, 'success');
        }
    };

    const handleSync = async () => {
        setIsSyncing(true);
        await fileSystem.syncAll();
        setIsSyncing(false);
        addToast('Datos sincronizados', 'success');
    };

    return (
        <div className="p-8 max-w-3xl mx-auto space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Configuración</h1>

            {/* Folder Settings */}
            {fileSystem.isSupported() && (
                <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden">
                    <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                        <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Carpeta de Trabajo</h2>
                        <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona dónde se guardan tus datos localmente</p>
                    </div>
                    <div className="p-6 flex items-center gap-4">
                        <div className="flex-1">
                            <p className="text-sm text-gray-700 dark:text-gray-300">
                                {fileSystem.isConnected()
                                    ? <span>Carpeta actual: <strong>{fileSystem.getDirectoryName()}</strong></span>
                                    : <span className="text-gray-400">No hay carpeta configurada</span>
                                }
                            </p>
                        </div>
                        <button
                            onClick={handleChangeFolder}
                            className="flex items-center gap-2 px-4 py-2 text-sm font-medium border border-gray-300 dark:border-gray-600 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                        >
                            <FolderOpen size={16} />
                            {fileSystem.isConnected() ? 'Cambiar' : 'Seleccionar'}
                        </button>
                        {fileSystem.isConnected() && (
                            <button
                                onClick={handleSync}
                                disabled={isSyncing}
                                className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
                            >
                                <RefreshCw size={16} className={isSyncing ? 'animate-spin' : ''} />
                                Sincronizar
                            </button>
                        )}
                    </div>
                </div>
            )}

            {/* AI Settings */}
            <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 shadow-sm overflow-hidden transition-colors">
                <div className="p-6 border-b border-gray-200 dark:border-gray-700">
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">Configuración de IA</h2>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona tu conexión con OpenAI</p>
                </div>

                <form onSubmit={handleSave} className="p-6 space-y-6">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            OpenAI API Key
                        </label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="sk-..."
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Tu clave API se almacena localmente y nunca se envía a nuestros servidores.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Modelo de OpenAI
                        </label>
                        <select
                            value={settings.selectedModel}
                            onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Tema</label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => { localStorage.setItem('cv-screener-theme', 'light'); setSettings({ ...settings, theme: 'light' }); }}
                                className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${settings.theme === 'light'
                                    ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 ring-1 ring-blue-500'
                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <span>Claro</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => { localStorage.setItem('cv-screener-theme', 'dark'); setSettings({ ...settings, theme: 'dark' }); }}
                                className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${settings.theme === 'dark'
                                    ? 'border-blue-500 bg-blue-900 text-white ring-1 ring-blue-500'
                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                }`}
                            >
                                <span>Oscuro</span>
                            </button>
                        </div>
                    </div>

                    {/* Evaluation Criteria */}
                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Criterios de Evaluación</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Criterios por defecto al crear una nueva búsqueda.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettings({
                                    ...settings,
                                    defaultEvaluationCriteria: {
                                        relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo.' },
                                        education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas.' },
                                        previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores.' },
                                        proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares y aprendizaje continuo.' }
                                    }
                                })}
                                className="text-sm text-blue-600 dark:text-blue-400 hover:text-blue-700 font-medium"
                            >
                                Restaurar
                            </button>
                        </div>

                        {/* Presets */}
                        <div className="mb-6 p-4 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                            <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-3">Presets de Criterios</h4>
                            <div className="flex gap-2 mb-3">
                                <select
                                    value={selectedPreset}
                                    onChange={(e) => setSelectedPreset(e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                >
                                    <option value="">Seleccionar preset...</option>
                                    {settings.criteriaPresets && Object.keys(settings.criteriaPresets).map((name) => (
                                        <option key={name} value={name}>{name}</option>
                                    ))}
                                </select>
                                <button type="button" onClick={() => selectedPreset && handleLoadPreset(selectedPreset)} disabled={!selectedPreset}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 text-sm font-medium">
                                    Cargar
                                </button>
                                <button type="button" onClick={() => { if (selectedPreset) { handleDeletePreset(selectedPreset); setSelectedPreset(''); } }}
                                    disabled={!selectedPreset}
                                    className="px-3 py-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg border border-gray-300 dark:border-gray-600 disabled:opacity-50">
                                    <Trash2 size={16} />
                                </button>
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                    placeholder="Nombre para guardar preset..."
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <button type="button" onClick={handleSavePreset} disabled={!presetName.trim()}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2">
                                    <Plus size={16} /> Guardar
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(settings.defaultEvaluationCriteria || {
                                relevance: { name: 'Relevancia del Perfil al Puesto', desc: '' },
                                education: { name: 'Nivel Educativo', desc: '' },
                                previousJobs: { name: 'Trabajos Previos', desc: '' },
                                proactivity: { name: 'Proactividad', desc: '' }
                            }).map(([key, criteria]) => (
                                <div key={key} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre Visible</label>
                                            <input
                                                type="text"
                                                value={criteria.name}
                                                onChange={(e) => {
                                                    const newCriteria = { ...(settings.defaultEvaluationCriteria || {}) };
                                                    newCriteria[key] = { ...criteria, name: e.target.value };
                                                    setSettings({ ...settings, defaultEvaluationCriteria: newCriteria });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción para IA</label>
                                            <textarea
                                                value={criteria.desc}
                                                onChange={(e) => {
                                                    const newCriteria = { ...(settings.defaultEvaluationCriteria || {}) };
                                                    newCriteria[key] = { ...criteria, desc: e.target.value };
                                                    setSettings({ ...settings, defaultEvaluationCriteria: newCriteria });
                                                }}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium transition-opacity duration-300" style={{ opacity: isSaved ? 1 : 0 }}>
                            Configuración guardada
                        </div>
                        <button
                            type="submit"
                            className="flex items-center gap-2 px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium transition-colors"
                        >
                            <Save size={20} />
                            Guardar Cambios
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}
