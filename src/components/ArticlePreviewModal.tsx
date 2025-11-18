import { useState } from 'react';
import { X, Edit, Send, Package, ShoppingBag, ChevronLeft, ChevronRight, CheckCircle, Layers, Calendar, DollarSign } from 'lucide-react';
import { Button } from './ui/Button';
import { Article } from '../types/article';
import { useNavigate } from 'react-router-dom';
import { PublishInstructionsModal } from './PublishInstructionsModal';
import { ArticleSoldModal } from './ArticleSoldModal';
import { Toast } from './ui/Toast';
import { supabase } from '../lib/supabase';

interface ArticlePreviewModalProps {
  article: Article;
  onClose: () => void;
}

export function ArticlePreviewModal({ article, onClose }: ArticlePreviewModalProps) {
  const navigate = useNavigate();
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [publishing, setPublishing] = useState(false);
  const [showSoldModal, setShowSoldModal] = useState(false);
  const [publishInstructionsModal, setPublishInstructionsModal] = useState<{ isOpen: boolean; articleId: string }>({
    isOpen: false,
    articleId: ''
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const CONDITION_LABELS: Record<string, string> = {
    new_with_tags: 'Neuf avec étiquette',
    new_without_tags: 'Neuf sans étiquette',
    very_good: 'Très bon état',
    good: 'Bon état',
    satisfactory: 'Satisfaisant',
  };

  const handlePreviousPhoto = () => {
    if (!article?.photos) return;
    setCurrentPhotoIndex((prev) => (prev === 0 ? article.photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    if (!article?.photos) return;
    setCurrentPhotoIndex((prev) => (prev === article.photos.length - 1 ? 0 : prev + 1));
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  async function handleValidateAndSend() {
    try {
      setPublishing(true);
      setPublishInstructionsModal({
        isOpen: true,
        articleId: article.id
      });
    } catch (error) {
      console.error('Error preparing article:', error);
      setToast({
        type: 'error',
        text: error instanceof Error ? error.message : 'Erreur lors de la préparation de l\'article'
      });
    } finally {
      setPublishing(false);
    }
  }

  const handleEdit = () => {
    onClose();
    navigate(`/articles/${article.id}/edit`);
  };

  const handleOpenSoldModal = () => {
    setShowSoldModal(true);
  };

  async function handleConfirmSold(saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
  }) {
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          status: 'sold',
          sold_price: saleData.soldPrice,
          sold_at: saleData.soldAt,
          sale_platform: saleData.platform,
          platform_fees: saleData.fees,
          shipping_cost: saleData.shippingCost,
          buyer_name: saleData.buyerName,
          sale_notes: saleData.notes,
        })
        .eq('id', article.id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Vente enregistrée avec succès'
      });

      setShowSoldModal(false);

      // Close modal after a short delay
      setTimeout(() => {
        onClose();
      }, 1500);
    } catch (error) {
      console.error('Error recording sale:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de l\'enregistrement de la vente'
      });
    }
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <PublishInstructionsModal
        isOpen={publishInstructionsModal.isOpen}
        onClose={() => setPublishInstructionsModal({ isOpen: false, articleId: '' })}
        articleId={publishInstructionsModal.articleId}
      />

      <ArticleSoldModal
        isOpen={showSoldModal}
        onClose={() => setShowSoldModal(false)}
        onConfirm={handleConfirmSold}
        article={article}
      />

      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-hidden flex flex-col"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between z-10 rounded-t-2xl">
            <h2 className="text-xl font-bold text-gray-900">Prévisualisation de l'annonce</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto p-6">
            {article.status === 'ready' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Statut : Prêt pour Vinted</h3>
                  <p className="text-sm text-blue-800">Tous les champs requis sont remplis. Vous pouvez maintenant envoyer cette annonce sur la plateforme Vinted.</p>
                </div>
              </div>
            )}
            {article.status === 'draft' && (
              <div className="bg-grey-50 border-l-4 border-grey-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Package className="w-5 h-5 text-grey-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-grey-900 mb-1">Statut : Brouillon</h3>
                  <p className="text-sm text-grey-800">Cette annonce est en cours de préparation. Complétez tous les champs requis avant de l'envoyer sur Vinted.</p>
                </div>
              </div>
            )}
            {article.status === 'scheduled' && (
              <div className="bg-yellow-50 border-l-4 border-yellow-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-yellow-900 mb-1">Statut : Planifié</h3>
                  <p className="text-sm text-yellow-800">
                    {article.scheduled_for ? (
                      <>
                        Publication prévue le{' '}
                        <span className="font-semibold">
                          {new Date(article.scheduled_for).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </>
                    ) : (
                      'Cette annonce est planifiée pour une publication ultérieure sur Vinted.'
                    )}
                  </p>
                </div>
              </div>
            )}
            {article.status === 'published' && (
              <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Send className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">Statut : Publié</h3>
                  <p className="text-sm text-purple-800">
                    {article.published_at ? (
                      <>
                        Publié le{' '}
                        <span className="font-semibold">
                          {new Date(article.published_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </>
                    ) : (
                      'Cette annonce est actuellement en ligne sur Vinted.'
                    )}
                  </p>
                </div>
              </div>
            )}
            {article.status === 'sold' && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Statut : Vendu</h3>
                  <p className="text-sm text-green-800">Cet article a été vendu avec succès.</p>
                </div>
              </div>
            )}

            <div className="space-y-6 mb-6">
              <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                {article.photos && article.photos.length > 0 ? (
                  <div className="aspect-[16/10] bg-gray-50 relative group">
                    <img
                      src={article.photos[currentPhotoIndex]}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                    {article.photos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviousPhoto();
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextPhoto();
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                          {currentPhotoIndex + 1} / {article.photos.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <Package className="w-24 h-24 text-gray-300" />
                  </div>
                )}

                {article.photos && article.photos.length > 1 && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="grid grid-cols-6 gap-2">
                      {article.photos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => handlePhotoClick(index)}
                          className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`${article.title} - ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-lg border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-2xl font-bold text-gray-900 mb-3">
                    {article.title}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="text-lg font-medium">{article.brand || 'Non spécifié'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-4xl font-bold text-emerald-600">
                      {article.price.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                    Description
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {article.description || 'Aucune description'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Caractéristiques
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Taille</p>
                      <p className="font-semibold text-gray-900">{article.size || 'Non spécifié'}</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">État</p>
                      <p className="font-semibold text-gray-900">
                        {CONDITION_LABELS[article.condition] || article.condition}
                      </p>
                    </div>

                    {article.color && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Couleur</p>
                        <p className="font-semibold text-gray-900">{article.color}</p>
                      </div>
                    )}

                    {article.material && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Matière</p>
                        <p className="font-semibold text-gray-900">{article.material}</p>
                      </div>
                    )}
                  </div>
                </div>

                {(article.main_category || article.subcategory || article.item_category) && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Catégorisation Vinted
                    </h3>
                    <div className="space-y-2">
                      {article.main_category && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-xs text-blue-700 font-medium">Catégorie principale</span>
                          <span className="text-sm text-blue-900 font-semibold">{article.main_category}</span>
                        </div>
                      )}
                      {article.subcategory && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-xs text-blue-700 font-medium">Sous-catégorie</span>
                          <span className="text-sm text-blue-900 font-semibold">{article.subcategory}</span>
                        </div>
                      )}
                      {article.item_category && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-xs text-blue-700 font-medium">Type d'article</span>
                          <span className="text-sm text-blue-900 font-semibold">{article.item_category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="sticky bottom-0 bg-white border-t border-gray-200 px-6 py-4 rounded-b-2xl">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <Button
                variant="secondary"
                onClick={handleEdit}
                className="w-full sm:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
              <Button
                variant="secondary"
                onClick={handleOpenSoldModal}
                disabled={article.status === 'sold'}
                className="w-full sm:w-auto bg-white text-green-700 hover:bg-green-50 border-green-300 hover:border-green-400"
              >
                <DollarSign className="w-4 h-4 mr-2" />
                Marquer vendu
              </Button>
              <Button
                onClick={handleValidateAndSend}
                disabled={publishing}
                className="w-full sm:w-auto"
              >
                <Send className="w-4 h-4 mr-2" />
                {publishing ? 'Préparation...' : 'Envoyer à Vinted'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
