import { Candidate } from '../types';

export function exportCandidatesToCSV(candidates: Candidate[]) {
    const headers = [
        'Nombre',
        'Email',
        'Teléfono',
        'Score Total',
        'Relevancia',
        'Educación',
        'Experiencia',
        'Proactividad',
        'Estado',
        'Favorito',
        'Fecha Entrevista',
        'Notas'
    ];

    const rows = candidates.map(c => [
        c.name || 'N/A',
        c.email || 'N/A',
        c.phone || 'N/A',
        c.totalScore,
        c.relevance,
        c.education,
        c.previousJobs,
        c.proactivity,
        c.status,
        c.isFavorite ? 'Sí' : 'No',
        c.interviewDate ? new Date(c.interviewDate).toLocaleDateString() : '',
        Array.isArray(c.notes) ? c.notes.map(n => n.content).join(' | ') : (c.notes || '')
    ]);

    const csvContent = [
        headers.join(','),
        ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);

    link.setAttribute('href', url);
    link.setAttribute('download', `candidatos_export_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
