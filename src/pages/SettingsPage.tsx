import { useState } from 'react';
import { Save, Plus, Trash2, Download } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';

export function SettingsPage() {
    const { settings, setSettings } = useAppStore();
    const [apiKey, setApiKey] = useState(settings.apiKey);
    const [isSaved, setIsSaved] = useState(false);
    const [presetName, setPresetName] = useState('');

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        await setSettings({
            ...settings,
            apiKey
        });
        setIsSaved(true);
        setTimeout(() => setIsSaved(false), 2000);
    };

    const handleSavePreset = async () => {
        if (!presetName.trim() || !settings.defaultEvaluationCriteria) return;

        const newPresets = {
            ...(settings.criteriaPresets || {}),
            [presetName.trim()]: settings.defaultEvaluationCriteria
        };

        await setSettings({
            ...settings,
            criteriaPresets: newPresets
        });
        setPresetName('');
    };

    const handleDeletePreset = async (name: string) => {
        if (!settings.criteriaPresets) return;

        const newPresets = { ...settings.criteriaPresets };
        delete newPresets[name];

        await setSettings({
            ...settings,
            criteriaPresets: newPresets
        });
    };

    const handleLoadPreset = async (name: string) => {
        if (!settings.criteriaPresets || !settings.criteriaPresets[name]) return;

        await setSettings({
            ...settings,
            defaultEvaluationCriteria: settings.criteriaPresets[name]
        });
    };

    return (
        <div className="p-8 max-w-3xl mx-auto">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-8">Configuración</h1>

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
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-gray-500"
                        />
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Tu clave API se almacena localmente en tu navegador y nunca se envía a nuestros servidores.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Modelo de OpenAI
                        </label>
                        <select
                            value={settings.selectedModel}
                            onChange={(e) => setSettings({ ...settings, selectedModel: e.target.value })}
                            className="w-full px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                        >
                            <option value="gpt-4o">GPT-4o</option>
                            <option value="gpt-4o-mini">GPT-4o Mini</option>
                            <option value="gpt-4-turbo">GPT-4 Turbo</option>
                            <option value="gpt-3.5-turbo">GPT-3.5 Turbo</option>
                        </select>
                        <p className="text-sm text-gray-500 dark:text-gray-400 mt-2">
                            Selecciona el modelo que se utilizará para analizar los CVs.
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                            Tema
                        </label>
                        <div className="flex items-center gap-4">
                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, theme: 'light' })}
                                className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${settings.theme === 'light'
                                    ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500 dark:bg-blue-900/30 dark:text-blue-300'
                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <span>☀️</span>
                                <span className="font-medium">Claro</span>
                            </button>
                            <button
                                type="button"
                                onClick={() => setSettings({ ...settings, theme: 'dark' })}
                                className={`flex-1 py-3 px-4 rounded-lg border flex items-center justify-center gap-2 transition-all ${settings.theme === 'dark'
                                    ? 'border-blue-500 bg-blue-900 text-white ring-1 ring-blue-500'
                                    : 'border-gray-200 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                                    }`}
                            >
                                <span>🌙</span>
                                <span className="font-medium">Oscuro</span>
                            </button>
                        </div>
                    </div>

                    <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                        <div className="flex items-center justify-between mb-4">
                            <div>
                                <h3 className="text-lg font-medium text-gray-900 dark:text-white">Criterios de Evaluación por Defecto</h3>
                                <p className="text-sm text-gray-500 dark:text-gray-400">
                                    Define los criterios que se utilizarán por defecto al crear una nueva búsqueda.
                                </p>
                            </div>
                            <button
                                type="button"
                                onClick={() => setSettings({
                                    ...settings,
                                    defaultEvaluationCriteria: {
                                        relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo. Considera habilidades, experiencia y ajuste general.' },
                                        education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas. El título principal cuenta el 80% del valor, certificaciones adicionales, programas de intercambio, etc. cuentan el 20%.' },
                                        previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores y del nivel del último puesto ocupado.' },
                                        proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares, certificaciones, aprendizaje continuo e iniciativa mostrada más allá de los requisitos básicos del trabajo.' }
                                    }
                                })}
                                className="text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                            >
                                Restaurar Recomendados
                            </button>
                        </div>

                        <div className="space-y-4">
                            {Object.entries(settings.defaultEvaluationCriteria || {
                                relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo. Considera habilidades, experiencia y ajuste general.' },
                                education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas. El título principal cuenta el 80% del valor, certificaciones adicionales, programas de intercambio, etc. cuentan el 20%.' },
                                previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores y del nivel del último puesto ocupado.' },
                                proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares, certificaciones, aprendizaje continuo e iniciativa mostrada más allá de los requisitos básicos del trabajo.' }
                            }).map(([key, criteria]) => (
                                <div key={key} className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg border border-gray-200 dark:border-gray-600">
                                    <div className="grid grid-cols-1 gap-4">
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Nombre Visible</label>
                                            <input
                                                type="text"
                                                value={criteria.name}
                                                onChange={(e) => {
                                                    const newCriteria = { ...settings.defaultEvaluationCriteria };
                                                    if (!settings.defaultEvaluationCriteria) {
                                                        Object.assign(newCriteria, {
                                                            relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo. Considera habilidades, experiencia y ajuste general.' },
                                                            education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas. El título principal cuenta el 80% del valor, certificaciones adicionales, programas de intercambio, etc. cuentan el 20%.' },
                                                            previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores y del nivel del último puesto ocupado.' },
                                                            proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares, certificaciones, aprendizaje continuo e iniciativa mostrada más allá de los requisitos básicos del trabajo.' }
                                                        });
                                                    }
                                                    newCriteria[key] = { ...criteria, name: e.target.value };
                                                    setSettings({ ...settings, defaultEvaluationCriteria: newCriteria });
                                                }}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                            />
                                        </div>
                                        <div>
                                            <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">Descripción para IA</label>
                                            <textarea
                                                value={criteria.desc}
                                                onChange={(e) => {
                                                    const newCriteria = { ...settings.defaultEvaluationCriteria };
                                                    if (!settings.defaultEvaluationCriteria) {
                                                        Object.assign(newCriteria, {
                                                            relevance: { name: 'Relevancia del Perfil al Puesto', desc: 'Compara el contenido del CV con el contexto del puesto de trabajo. Considera habilidades, experiencia y ajuste general.' },
                                                            education: { name: 'Nivel Educativo', desc: 'Evalúa el prestigio de las instituciones educativas. El título principal cuenta el 80% del valor, certificaciones adicionales, programas de intercambio, etc. cuentan el 20%.' },
                                                            previousJobs: { name: 'Trabajos Previos', desc: 'Evalúa el prestigio de empleadores anteriores y del nivel del último puesto ocupado.' },
                                                            proactivity: { name: 'Proactividad', desc: 'Evalúa actividades extracurriculares, certificaciones, aprendizaje continuo e iniciativa mostrada más allá de los requisitos básicos del trabajo.' }
                                                        });
                                                    }
                                                    newCriteria[key] = { ...criteria, desc: e.target.value };
                                                    setSettings({ ...settings, defaultEvaluationCriteria: newCriteria });
                                                }}
                                                rows={3}
                                                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white resize-y"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <p className="text-xs text-gray-400 dark:text-gray-500 mt-2">
                            Nota: Por ahora solo se pueden editar los criterios existentes. La capacidad de agregar/eliminar criterios se añadirá pronto.
                        </p>

                        {/* Presets Section */}
                        <div className="mt-8 border-t border-gray-200 dark:border-gray-700 pt-6">
                            <h4 className="text-md font-medium text-gray-900 dark:text-white mb-4">Presets de Criterios</h4>

                            <div className="flex gap-2 mb-4">
                                <input
                                    type="text"
                                    value={presetName}
                                    onChange={(e) => setPresetName(e.target.value)}
                                    placeholder="Nombre del nuevo preset..."
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                                />
                                <button
                                    type="button"
                                    onClick={handleSavePreset}
                                    disabled={!presetName.trim()}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 text-sm font-medium flex items-center gap-2"
                                >
                                    <Plus size={16} />
                                    Guardar Preset
                                </button>
                            </div>

                            {settings.criteriaPresets && Object.keys(settings.criteriaPresets).length > 0 && (
                                <div className="space-y-2">
                                    <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">Presets Guardados:</p>
                                    {Object.keys(settings.criteriaPresets).map((name) => (
                                        <div key={name} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700/30 rounded-lg border border-gray-200 dark:border-gray-600">
                                            <span className="font-medium text-gray-700 dark:text-gray-300">{name}</span>
                                            <div className="flex gap-2">
                                                <button
                                                    type="button"
                                                    onClick={() => handleLoadPreset(name)}
                                                    className="p-2 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 rounded-lg transition-colors"
                                                    title="Cargar este preset"
                                                >
                                                    <Download size={16} />
                                                </button>
                                                <button
                                                    type="button"
                                                    onClick={() => handleDeletePreset(name)}
                                                    className="p-2 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors"
                                                    title="Eliminar preset"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center justify-between pt-4">
                        <div className="text-sm text-green-600 dark:text-green-400 font-medium transition-opacity duration-300" style={{ opacity: isSaved ? 1 : 0 }}>
                            ¡Configuración guardada correctamente!
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
