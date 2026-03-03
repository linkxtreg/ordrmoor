import { AlertTriangle } from 'lucide-react';
import { useAdminLanguage } from '../context/AdminLanguageContext';

interface DeleteConfirmDialogProps {
  onConfirm: () => void;
  onCancel: () => void;
  title?: string;
  message?: string;
}

export function DeleteConfirmDialog({ 
  onConfirm, 
  onCancel,
  title = 'Delete Item?',
  message = 'This action cannot be undone. The item will be permanently removed.'
}: DeleteConfirmDialogProps) {
  const { t } = useAdminLanguage();
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
        <div className="p-6">
          <div className="flex items-start gap-4 mb-5">
            <div className="bg-rose-100 p-3 rounded-xl">
              <AlertTriangle className="text-rose-600" size={24} />
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold text-gray-900">{title}</h2>
              <p className="text-sm text-gray-600 mt-1">
                {message}
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={onCancel}
              className="px-6 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium"
            >
              {t('deleteDialog.cancel')}
            </button>
            <button
              onClick={onConfirm}
              className="px-6 py-2.5 bg-rose-600 text-white rounded-lg hover:bg-rose-700 transition-colors font-medium shadow-sm"
            >
              {t('deleteDialog.confirm')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}