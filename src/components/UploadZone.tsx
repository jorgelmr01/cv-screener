import { useCallback, useState, DragEvent, ChangeEvent } from 'react';
import { Upload, AlertCircle } from 'lucide-react';
import { useAppStore } from '../store/useAppStore';
import { extractTextFromPDF, extractContactInfo } from '../services/pdf';
import { analyzeCV } from '../services/openai';

export function UploadZone() {
    const { currentSearch, settings, addCandidate } = useAppStore();
    const [isDragging, setIsDragging] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [progress, setProgress] = useState<{ current: number; total: number; filename: string } | null>(null);
    const [error, setError] = useState<string | null>(null);

    const handleDragOver = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    }, []);

    const handleDragLeave = useCallback((e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    }, []);

    const processFiles = async (files: File[]) => {
        if (!currentSearch) return;
        if (!settings.apiKey) {
            setError('Por favor configura tu API Key en Configuración antes de analizar CVs.');
            return;
        }

        setIsProcessing(true);
        setError(null);
        let successCount = 0;

        for (let i = 0; i < files.length; i++) {
            const file = files[i];
            if (file.type !== 'application/pdf') continue;

            setProgress({ current: i + 1, total: files.length, filename: file.name });

            try {
                // 1. Extract Text
                const pdfData = await extractTextFromPDF(file);
                const contactInfo = extractContactInfo(pdfData.text);

                // 2. Analyze with AI
                const analysis = await analyzeCV(
                    pdfData.text,
                    currentSearch,
                    settings.apiKey,
                    settings.selectedModel
                );

                // 3. Create Candidate
                const totalScore = analysis.relevance + analysis.education + analysis.previousJobs + analysis.proactivity;

                // Create object URL for preview
                const pdfUrl = URL.createObjectURL(file);

                // Convert to base64 for storage
                const base64 = await new Promise<string>((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(file);
                });

                await addCandidate({
                    id: crypto.randomUUID(),
                    searchId: currentSearch.id!,
                    fileName: file.name,
                    cvText: pdfData.text,
                    pdfDataUrl: base64,
                    pdfUrl: pdfUrl,
                    name: contactInfo.name || file.name.replace('.pdf', ''),
                    email: contactInfo.email,
                    phone: contactInfo.phone,
                    ...analysis,
                    totalScore,
                    status: 'new',
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString()
                });

                successCount++;
            } catch (err) {
                console.error(`Error processing ${file.name}:`, err);
                setError(`Error al procesar ${file.name}: ${(err as Error).message}`);
            }
        }

        setIsProcessing(false);
        setProgress(null);
    };

    const handleDrop = useCallback(async (e: DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const files = Array.from(e.dataTransfer.files);
        await processFiles(files);
    }, [currentSearch, settings]);

    const handleFileSelect = async (e: ChangeEvent<HTMLInputElement>) => {
        if (e.target.files) {
            const files = Array.from(e.target.files);
            await processFiles(files);
        }
    };

    return (
        <div className="mb-8">
            <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`
          border-2 border-dashed rounded-xl p-8 text-center transition-colors
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
          ${isProcessing ? 'opacity-50 pointer-events-none' : ''}
        `}
            >
                <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center">
                        <Upload size={32} />
                    </div>

                    <div>
                        <h3 className="text-lg font-semibold text-gray-900">
                            Arrastra y suelta CVs aquí
                        </h3>
                        <p className="text-gray-500 mt-1">
                            o haz clic para seleccionar archivos PDF
                        </p>
                    </div>

                    <input
                        type="file"
                        multiple
                        accept=".pdf"
                        onChange={handleFileSelect}
                        className="hidden"
                        id="file-upload"
                    />
                    <label
                        htmlFor="file-upload"
                        className="px-6 py-2 bg-white border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 cursor-pointer shadow-sm"
                    >
                        Seleccionar Archivos
                    </label>
                </div>
            </div>

            {isProcessing && progress && (
                <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-4 flex items-center gap-3">
                    <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600"></div>
                    <div className="flex-1">
                        <p className="text-sm font-medium text-blue-900">
                            Procesando {progress.current} de {progress.total}: {progress.filename}
                        </p>
                        <div className="w-full bg-blue-200 rounded-full h-2 mt-2">
                            <div
                                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                style={{ width: `${(progress.current / progress.total) * 100}%` }}
                            ></div>
                        </div>
                    </div>
                </div>
            )}

            {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-4 mb-4 flex items-center gap-3 text-red-700">
                    <AlertCircle size={20} />
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
}
