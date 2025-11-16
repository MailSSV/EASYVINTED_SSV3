import { X, Loader2, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '../lib/supabase';

interface PublishInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  articleId: string;
}

type PublishStatus = 'idle' | 'publishing' | 'success' | 'error';

export function PublishInstructionsModal({
  isOpen,
  onClose,
  articleId,
}: PublishInstructionsModalProps) {
  const [status, setStatus] = useState<PublishStatus>('idle');
  const [vintedUrl, setVintedUrl] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>('');

  if (!isOpen) return null;

  const handlePublish = async () => {
    try {
      setStatus('publishing');
      setErrorMessage('');

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/publish-to-vinted`;
      const { data: session } = await supabase.auth.getSession();

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${session.session?.access_token}`,
          'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({ articleId }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Erreur lors de la publication');
      }

      if (result.success && result.vintedUrl) {
        setStatus('success');
        setVintedUrl(result.vintedUrl);
      } else {
        throw new Error('La publication a échoué');
      }
    } catch (error) {
      console.error('Error publishing:', error);
      setStatus('error');
      setErrorMessage(error instanceof Error ? error.message : 'Erreur inconnue');
    }
  };

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && status !== 'publishing') {
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
              <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${
                status === 'success' ? 'bg-green-100' :
                status === 'error' ? 'bg-red-100' :
                status === 'publishing' ? 'bg-blue-100' :
                'bg-blue-100'
              }`}>
                {status === 'publishing' ? (
                  <Loader2 className="w-6 h-6 text-blue-600 animate-spin" />
                ) : status === 'success' ? (
                  <CheckCircle className="w-6 h-6 text-green-600" />
                ) : status === 'error' ? (
                  <AlertCircle className="w-6 h-6 text-red-600" />
                ) : (
                  <CheckCircle className="w-6 h-6 text-blue-600" />
                )}
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900 mb-2">
                  {status === 'publishing' ? 'Publication en cours...' :
                   status === 'success' ? 'Article publié avec succès !' :
                   status === 'error' ? 'Erreur de publication' :
                   'Prêt à publier sur Vinted'}
                </h3>
                <p className="text-sm text-gray-600">
                  {status === 'publishing' ? 'Veuillez patienter pendant que votre article est publié sur Vinted...' :
                   status === 'success' ? 'Votre article est maintenant visible sur Vinted.' :
                   status === 'error' ? errorMessage :
                   'Cliquez sur le bouton ci-dessous pour publier automatiquement votre article.'}
                </p>
              </div>
            </div>
            {status !== 'publishing' && (
              <button
                onClick={onClose}
                className="flex-shrink-0 text-gray-400 hover:text-gray-600 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {status === 'idle' && (
            <>
              <div className="bg-gray-50 rounded-lg p-4 mb-4">
                <p className="text-xs font-medium text-gray-500 mb-2">Article ID</p>
                <p className="text-sm font-mono text-gray-900 break-all">{articleId}</p>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <p className="text-sm text-blue-800">
                  <strong>💡 Ce qui va se passer :</strong>
                </p>
                <ul className="mt-2 space-y-1 text-sm text-blue-700">
                  <li>• Connexion automatique à votre compte Vinted</li>
                  <li>• Publication de votre article avec toutes les informations</li>
                  <li>• Sauvegarde de l'URL Vinted dans votre base de données</li>
                </ul>
              </div>

              <button
                onClick={handlePublish}
                className="w-full px-4 py-3 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm hover:shadow-md"
              >
                Publier automatiquement sur Vinted
              </button>
            </>
          )}

          {status === 'publishing' && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 text-center">
              <Loader2 className="w-8 h-8 text-blue-600 animate-spin mx-auto mb-4" />
              <p className="text-sm text-blue-800 font-medium">
                Publication en cours...
              </p>
              <p className="text-xs text-blue-600 mt-2">
                Cela peut prendre quelques secondes
              </p>
            </div>
          )}

          {status === 'success' && vintedUrl && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-green-800 font-medium mb-2">
                  ✅ Votre article est en ligne !
                </p>
                <a
                  href={vintedUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-green-700 hover:text-green-800 underline"
                >
                  Voir sur Vinted
                  <ExternalLink className="w-4 h-4" />
                </a>
              </div>

              <button
                onClick={onClose}
                className="w-full px-4 py-2.5 text-sm font-medium text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              >
                Fermer
              </button>
            </>
          )}

          {status === 'error' && (
            <>
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
                <p className="text-sm text-red-800">
                  <strong>Erreur :</strong> {errorMessage}
                </p>
                <p className="text-xs text-red-600 mt-2">
                  Vérifiez vos identifiants Vinted dans les paramètres.
                </p>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStatus('idle')}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                >
                  Réessayer
                </button>
                <button
                  onClick={onClose}
                  className="flex-1 px-4 py-2.5 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors"
                >
                  Fermer
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
