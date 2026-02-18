import { useAppStore } from '../store/useAppStore';
import { X, CheckCircle, AlertCircle, Info } from 'lucide-react';

export function ToastContainer() {
    const { toasts, removeToast } = useAppStore();

    if (toasts.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
            {toasts.map(toast => (
                <div
                    key={toast.id}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border animate-in slide-in-from-right-5 duration-300 ${
                        toast.type === 'success'
                            ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800 text-green-800 dark:text-green-300'
                            : toast.type === 'error'
                            ? 'bg-red-50 dark:bg-red-900/30 border-red-200 dark:border-red-800 text-red-800 dark:text-red-300'
                            : 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-300'
                    }`}
                >
                    {toast.type === 'success' && <CheckCircle size={18} />}
                    {toast.type === 'error' && <AlertCircle size={18} />}
                    {toast.type === 'info' && <Info size={18} />}
                    <span className="text-sm font-medium flex-1">{toast.message}</span>
                    <button onClick={() => removeToast(toast.id)} className="opacity-60 hover:opacity-100 transition-opacity">
                        <X size={14} />
                    </button>
                </div>
            ))}
        </div>
    );
}
