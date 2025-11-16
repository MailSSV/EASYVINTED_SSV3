import { X, Copy, Terminal, CheckCircle } from 'lucide-react';
import { useState } from 'react';

interface PublishInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
}

export function PublishInstructionsModal({
  isOpen,
  onClose,
  articleId,
}: PublishInstructionsModalProps) {
  const [copied, setCopied] = useState(false);
  const command = `npm run vinted:publish:single ${articleId}`;

  if (!isOpen) return null;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
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
      <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full animate-in fade-in zoom-in duration-200">
        <div className="p-6">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0 w-12 h-12 rounded-full bg-blue-100 flex items-center justify-center">
                <Terminal className="w-6 h-6 text-blue-600" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  Article prêt pour publication
                </h3>
                <p className="text-sm text-gray-600">
                  Votre article est enregistré et prêt à être publié sur Vinted.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-4">
            <p className="text-xs font-medium text-gray-500 mb-2">Article ID</p>
            <p className="text-sm font-mono text-gray-900 break-all">{articleId}</p>
          </div>

          <div className="mb-6">
            <p className="text-sm font-medium text-gray-700 mb-3">
              Pour publier sur Vinted, exécutez cette commande dans votre terminal :
            </p>

            <div className="relative">
              <div className="bg-gray-900 rounded-lg p-4 pr-12">
                <code className="text-sm text-green-400 font-mono break-all">
                  {command}
                </code>
              </div>
              <button
                onClick={handleCopy}
                className="absolute top-3 right-3 p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
                title="Copier la commande"
              >
                {copied ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <Copy className="w-4 h-4 text-gray-400" />
                )}
              </button>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
            <p className="text-sm text-blue-800">
              <strong>💡 Ce qui va se passer :</strong>
            </p>
            <ul className="mt-2 space-y-1 text-sm text-blue-700">
              <li>• Un navigateur Chromium s'ouvrira automatiquement</li>
              <li>• Le script publiera votre article sur Vinted</li>
              <li>• L'URL Vinted sera sauvegardée dans la base de données</li>
            </ul>
          </div>

          <button
            onClick={onClose}
            className="w-full px-4 py-2.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
          >
            Compris
          </button>
        </div>
      </div>
    </div>
  );
}
