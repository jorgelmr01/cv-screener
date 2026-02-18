import { useState, useEffect } from 'react';
import { Plus, Search as SearchIcon, Trash2, Users, TrendingUp, Clock, Copy, Archive, ArchiveRestore } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { NewSearchModal } from '../components/NewSearchModal';
import { Link } from 'react-router-dom';
import { db } from '../services/db';
import { PIPELINE_STAGES } from '../types/pipeline';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface SearchWithCounts {
    id: number;
    name: string;
    jobDescription: string;
    status: 'active' | 'archived';
    createdAt: string;
    candidateCount: number;
}

export function Dashboard() {
    const { searches, loadSearches, selectSearch, deleteSearch, duplicateSearch, updateSearch } = useAppStore();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [deleteConfirm, setDeleteConfirm] = useState<{ id: number; name: string } | null>(null);
    const [searchesWithCounts, setSearchesWithCounts] = useState<SearchWithCounts[]>([]);
    const [pipelineData, setPipelineData] = useState<{ name: string; count: number; color: string }[]>([]);
    const [showArchived, setShowArchived] = useState(false);

    useEffect(() => {
        loadSearches();
    }, [loadSearches]);

    useEffect(() => {
        const loadCounts = async () => {
            const results: SearchWithCounts[] = [];
            for (const search of searches) {
                const candidates = await db.getCandidatesBySearch(search.id!);
                results.push({
                    id: search.id!,
                    name: search.name,
                    jobDescription: search.jobDescription,
                    status: search.status,
                    createdAt: search.createdAt,
                    candidateCount: candidates.length,
                });
            }
            setSearchesWithCounts(results);

            const activeSearch = searches.find(s => s.status === 'active');
            if (activeSearch) {
                const candidates = await db.getCandidatesBySearch(activeSearch.id!);
                const data = PIPELINE_STAGES.map(stage => ({
                    name: stage.label,
                    count: candidates.filter(c => c.status === stage.id).length,
                    color: stage.id === 'rejected' ? '#ef4444' : stage.id === 'hired' ? '#10b981' : '#3b82f6',
                })).filter(d => d.count > 0);
                setPipelineData(data);
            }
        };
        if (searches.length > 0) loadCounts();
    }, [searches]);

    const handleDelete = async (id: number) => {
        await deleteSearch(id);
        setDeleteConfirm(null);
    };

    const handleDuplicate = async (id: number) => {
        await duplicateSearch(id);
    };

    const handleToggleArchive = async (id: number) => {
        const search = searches.find(s => s.id === id);
        if (search) {
            await updateSearch({ ...search, status: search.status === 'active' ? 'archived' : 'active' });
        }
    };

    const filteredSearches = searchesWithCounts
        .filter(s => s.name.toLowerCase().includes(searchTerm.toLowerCase()))
        .filter(s => showArchived ? true : s.status === 'active');

    const totalCandidates = searchesWithCounts.reduce((sum, s) => sum + s.candidateCount, 0);
    const activeSearches = searchesWithCounts.filter(s => s.status === 'active').length;

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto">
            <div className="flex items-center justify-between mb-8">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <p className="text-gray-500 dark:text-gray-400 mt-1">Gestiona tus procesos de selección</p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors font-medium shadow-sm"
                >
                    <Plus size={20} />
                    Nueva Búsqueda
                </button>
            </div>

            {/* Metrics */}
            {searches.length > 0 && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                            <SearchIcon size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{activeSearches}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Búsquedas activas</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-green-100 dark:bg-green-900/30 text-green-600 dark:text-green-400 flex items-center justify-center">
                            <Users size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">{totalCandidates}</p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Total candidatos</p>
                        </div>
                    </div>
                    <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700 flex items-center gap-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-100 dark:bg-purple-900/30 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                            <TrendingUp size={24} />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-gray-900 dark:text-white">
                                {totalCandidates > 0 ? Math.round(totalCandidates / Math.max(activeSearches, 1)) : 0}
                            </p>
                            <p className="text-sm text-gray-500 dark:text-gray-400">Promedio por búsqueda</p>
                        </div>
                    </div>
                </div>
            )}

            {/* Pipeline Chart */}
            {pipelineData.length > 0 && (
                <div className="bg-white dark:bg-gray-800 rounded-xl p-6 border border-gray-200 dark:border-gray-700 mb-8">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Pipeline de la Búsqueda Activa</h3>
                    <ResponsiveContainer width="100%" height={200}>
                        <BarChart data={pipelineData} layout="vertical" margin={{ left: 120, right: 20 }}>
                            <XAxis type="number" allowDecimals={false} tick={{ fill: '#9ca3af', fontSize: 12 }} />
                            <YAxis type="category" dataKey="name" tick={{ fill: '#9ca3af', fontSize: 12 }} width={110} />
                            <Tooltip contentStyle={{ backgroundColor: '#1f2937', border: 'none', borderRadius: 8, color: '#fff' }} />
                            <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={20}>
                                {pipelineData.map((entry, index) => (
                                    <Cell key={index} fill={entry.color} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* Search / Filters */}
            <div className="mb-6 flex items-center gap-3">
                <div className="relative flex-1">
                    <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar procesos..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 border border-gray-200 dark:border-gray-700 rounded-xl focus:ring-2 focus:ring-blue-500 shadow-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-white placeholder-gray-400"
                    />
                </div>
                <button
                    onClick={() => setShowArchived(!showArchived)}
                    className={`flex items-center gap-2 px-4 py-3 rounded-xl border text-sm font-medium transition-colors ${
                        showArchived
                            ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-700 dark:text-blue-300'
                            : 'bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'
                    }`}
                >
                    <Archive size={16} />
                    Archivadas
                </button>
            </div>

            {/* Search Cards */}
            {searches.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <div className="w-16 h-16 bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Plus size={32} />
                    </div>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">No hay búsquedas activas</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6 max-w-md mx-auto">
                        Comienza creando tu primera búsqueda para empezar a evaluar candidatos con IA.
                    </p>
                    <button onClick={() => setIsModalOpen(true)} className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">
                        Crear Primera Búsqueda
                    </button>
                </div>
            ) : filteredSearches.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-gray-800 rounded-2xl border border-dashed border-gray-300 dark:border-gray-700">
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Sin resultados</h3>
                    <p className="text-gray-500 dark:text-gray-400 mb-6">No se encontraron búsquedas que coincidan</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredSearches.map((search) => (
                        <div key={search.id} className="relative group">
                            <Link
                                to={`/search/${search.id}`}
                                onClick={() => selectSearch(search.id)}
                                className={`block bg-white dark:bg-gray-800 p-6 rounded-xl border hover:shadow-md transition-all ${
                                    search.status === 'archived'
                                        ? 'border-gray-200 dark:border-gray-700 opacity-75'
                                        : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 dark:hover:border-blue-500'
                                }`}
                            >
                                <div className="flex justify-between items-start mb-4">
                                    <div className="w-10 h-10 rounded-lg bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                                        <SearchIcon size={20} />
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span className="bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 px-2 py-0.5 rounded-full text-xs font-bold">
                                            {search.candidateCount}
                                        </span>
                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${search.status === 'active'
                                            ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                            : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                                        }`}>
                                            {search.status === 'active' ? 'Activa' : 'Archivada'}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-bold text-gray-900 dark:text-white mb-2 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                                    {search.name}
                                </h3>
                                <p className="text-gray-500 dark:text-gray-400 text-sm line-clamp-2 mb-4 h-10">
                                    {search.jobDescription}
                                </p>

                                {search.candidateCount > 0 && (
                                    <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-1.5 mb-4">
                                        <div className="bg-blue-600 h-1.5 rounded-full" style={{ width: `${Math.min(100, search.candidateCount * 10)}%` }} />
                                    </div>
                                )}

                                <div className="flex items-center justify-between text-sm text-gray-400 dark:text-gray-500 pt-3 border-t border-gray-100 dark:border-gray-700">
                                    <span className="flex items-center gap-1"><Clock size={14} /> {new Date(search.createdAt).toLocaleDateString()}</span>
                                    <span>{search.candidateCount} candidatos</span>
                                </div>
                            </Link>

                            <div className="absolute top-4 right-4 flex gap-1 opacity-0 group-hover:opacity-100 transition-all z-10">
                                <button
                                    onClick={(e) => { e.preventDefault(); handleDuplicate(search.id); }}
                                    className="p-2 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 transition-all"
                                    title="Duplicar"
                                >
                                    <Copy size={14} />
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); handleToggleArchive(search.id); }}
                                    className="p-2 bg-gray-50 dark:bg-gray-700 text-gray-600 dark:text-gray-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition-all"
                                    title={search.status === 'active' ? 'Archivar' : 'Restaurar'}
                                >
                                    {search.status === 'active' ? <Archive size={14} /> : <ArchiveRestore size={14} />}
                                </button>
                                <button
                                    onClick={(e) => { e.preventDefault(); setDeleteConfirm({ id: search.id, name: search.name }); }}
                                    className="p-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 transition-all"
                                    title="Eliminar"
                                >
                                    <Trash2 size={14} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <NewSearchModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} />

            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl max-w-md w-full p-6">
                        <div className="flex items-center gap-3 mb-4">
                            <div className="w-12 h-12 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 flex items-center justify-center">
                                <Trash2 size={24} />
                            </div>
                            <h3 className="text-xl font-bold text-gray-900 dark:text-white">Eliminar Proceso</h3>
                        </div>
                        <p className="text-gray-600 dark:text-gray-300 mb-2">
                            ¿Estás seguro de que deseas eliminar <span className="font-semibold">"{deleteConfirm.name}"</span>?
                        </p>
                        <p className="text-sm text-red-600 dark:text-red-400 mb-6">
                            Esta acción eliminará todos los candidatos y no se puede deshacer.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 border border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 font-medium">
                                Cancelar
                            </button>
                            <button onClick={() => handleDelete(deleteConfirm.id)} className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium">
                                Eliminar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
