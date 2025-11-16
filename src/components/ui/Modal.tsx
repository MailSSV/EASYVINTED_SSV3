import { X, AlertCircle, CheckCircle, Info } from 'lucide-react';
import { ReactNode } from 'react';

export type ModalType = 'info' | 'success' | 'warning' | 'error';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  message: string;
  type?: ModalType;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  showCancel?: boolean;
}

const ICON_MAP: Record<ModalType, ReactNode> = {
  info: <Info className="w-6 h-6 text-blue-600" />,
  success: <CheckCircle className="w-6 h-6 text-green-600" />,
  warning: <AlertCircle className="w-6 h-6 text-yellow-600" />,
  error: <AlertCircle className="w-6 h-6 text-red-600" />,
};

const BG_COLOR_MAP: Record<ModalType, string> = {
  info: 'bg-blue-100',
  success: 'bg-green-100',
  warning: 'bg-yellow-100',
  error: 'bg-red-100',
};

const BUTTON_COLOR_MAP: Record<ModalType, string> = {
  info: 'bg-blue-600 hover:bg-blue-700',
  success: 'bg-green-600 hover:bg-green-700',
  warning: 'bg-yellow-600 hover:bg-yellow-700',
  error: 'bg-red-600 hover:bg-red-700',
};

export function Modal({
  isOpen,
  onClose,
  title,
  message,
  type = 'info',
  confirmLabel = 'OK',
  cancelLabel = 'Annuler',
  onConfirm,
  showCancel = false,
}: ModalProps) {
  if (!isOpen) return null;

  const handleConfirm = () => {
    if (onConfirm) {
      onConfirm();
    }
    onClose();
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-start gap-4">
              <div className={`flex-shrink-0 w-12 h-12 rounded-full ${BG_COLOR_MAP[type]} flex items-center justify-center`}>
                {ICON_MAP[type]}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{title}</h3>
                <p className="text-sm text-gray-600 leading-relaxed">{message}</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="flex gap-3 mt-6">
            {showCancel && (
              <button
                onClick={onClose}
                className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                {cancelLabel}
              </button>
            )}
            <button
              onClick={handleConfirm}
              className={`flex-1 px-4 py-2.5 text-sm font-medium text-white rounded-lg transition-colors ${BUTTON_COLOR_MAP[type]}`}
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
