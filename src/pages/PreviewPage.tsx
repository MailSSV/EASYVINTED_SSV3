import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit, Send, Package, ShoppingBag, ChevronLeft, ChevronRight, CheckCircle, Layers, Calendar, DollarSign } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Article } from '../types/article';
import { Modal } from '../components/ui/Modal';
import { PublishInstructionsModal } from '../components/PublishInstructionsModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

export function PreviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'error' }>(
    { isOpen: false, title: '', message: '', type: 'info' }
  );
  const [publishInstructionsModal, setPublishInstructionsModal] = useState<{ isOpen: boolean; articleId: string }>({ isOpen: false, articleId: '' });
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  async function fetchArticle() {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setArticle({
          ...data,
          price: parseFloat(data.price),
        });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors du chargement de l\'article',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateAndSend() {
    if (!id) return;

    try {
      setPublishing(true);

      setPublishInstructionsModal({
        isOpen: true,
        articleId: id
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

  async function handleMarkAsReady() {
    if (!id) return;

    try {
      setMarkingReady(true);

      const { error } = await supabase
        .from('articles')
        .update({ status: 'ready' })
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme prêt pour Vinted'
      });

      await fetchArticle();
    } catch (error) {
      console.error('Error marking article as ready:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour du statut'
      });
    } finally {
      setMarkingReady(false);
    }
  }

  function handleOpenSoldModal() {
    setSoldModalOpen(true);
  }

  async function handleMarkAsSold(saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
  }) {
    if (!id || !article) return;

    try {
      const netProfit = saleData.soldPrice - saleData.fees - saleData.shippingCost;

      const { error } = await supabase
        .from('articles')
        .update({
          status: 'sold',
          sold_price: saleData.soldPrice,
          sold_at: saleData.soldAt,
          platform: saleData.platform,
          fees: saleData.fees,
          shipping_cost: saleData.shippingCost,
          buyer_name: saleData.buyerName,
          sale_notes: saleData.notes,
          net_profit: netProfit,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme vendu'
      });

      setSoldModalOpen(false);
      await fetchArticle();
    } catch (error) {
      console.error('Error marking article as sold:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour du statut'
      });
    }
  }

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

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />
      <PublishInstructionsModal
        isOpen={publishInstructionsModal.isOpen}
        onClose={() => setPublishInstructionsModal({ isOpen: false, articleId: '' })}
        articleId={publishInstructionsModal.articleId}
      />
      {article && (
        <>
          <ScheduleModal
            isOpen={scheduleModalOpen}
            onClose={() => setScheduleModalOpen(false)}
            article={article}
            onScheduled={() => {
              setToast({
                type: 'success',
                text: 'Article programmé avec succès'
              });
              fetchArticle();
            }}
          />
          <ArticleSoldModal
            isOpen={soldModalOpen}
            onClose={() => setSoldModalOpen(false)}
            onConfirm={handleMarkAsSold}
            article={article}
          />
        </>
      )}
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          

          <h1 className="text-3xl font-bold text-gray-900">Prévisualisation de l'annonce</h1>
         
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          </div>
        ) : !article ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="w-20 h-20 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Article non trouvé
              </h2>
            </div>
          </div>
        ) : (
          <>
            {article.status === 'ready' && (
              <div className="relative mb-6 overflow-hidden rounded-xl border border-emerald-200 bg-emerald-50/50 backdrop-blur-sm">
                <div className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-emerald-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-emerald-900">
                        Statut : Prêt pour Vinted
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-emerald-700">
                        100% complété
                      </span>
                    </div>
                    <p className="text-sm text-emerald-800 leading-relaxed">
                      Tous les champs requis sont remplis. Vous pouvez maintenant envoyer cette annonce sur la plateforme Vinted.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {article.status === 'draft' && (
              <div className="relative mb-6 overflow-hidden rounded-xl border border-gray-300 bg-gray-50/50 backdrop-blur-sm">
                <div className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <Package className="h-5 w-5 sm:h-6 sm:w-6 text-gray-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-gray-900">
                        Statut : Brouillon
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-gray-700">
                        En cours
                      </span>
                    </div>
                    <p className="text-sm text-gray-700 leading-relaxed">
                      Cette annonce est en cours de préparation. Complétez tous les champs requis avant de l'envoyer sur Vinted.
                    </p>
                  </div>
                </div>
              </div>
            )}
            {article.status === 'scheduled' && (
              <div className="relative mb-6 overflow-hidden rounded-xl border border-amber-200 bg-amber-50/50 backdrop-blur-sm">
                <div className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <Calendar className="h-5 w-5 sm:h-6 sm:w-6 text-amber-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-amber-900">
                        Statut : Planifié
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-amber-700">
                        Programmé
                      </span>
                    </div>
                    <p className="text-sm text-amber-800 leading-relaxed">
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
              </div>
            )}
            {article.status === 'published' && (
              <div className="relative mb-6 overflow-hidden rounded-xl border border-blue-200 bg-blue-50/50 backdrop-blur-sm">
                <div className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <Send className="h-5 w-5 sm:h-6 sm:w-6 text-blue-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-blue-900">
                        Statut : Publié
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-blue-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-blue-700">
                        En ligne
                      </span>
                    </div>
                    <p className="text-sm text-blue-800 leading-relaxed">
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
              </div>
            )}
            {article.status === 'sold' && (
              <div className="relative mb-6 overflow-hidden rounded-xl border border-green-200 bg-green-50/50 backdrop-blur-sm">
                <div className="flex items-start gap-3 sm:gap-4 px-4 sm:px-5 py-4">
                  <div className="flex h-10 w-10 sm:h-11 sm:w-11 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <CheckCircle className="h-5 w-5 sm:h-6 sm:w-6 text-green-600" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-base sm:text-lg font-semibold text-green-900">
                        Statut : Vendu
                      </h3>
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold uppercase tracking-wide text-green-700">
                        Terminé
                      </span>
                    </div>
                    <p className="text-sm text-green-800 leading-relaxed">
                      Cet article a été vendu avec succès.
                    </p>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
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

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    {article.title}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="text-lg font-medium">{article.brand || 'Non spécifié'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-emerald-600">
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
                    <div className="group">
                      <div className="text-xs text-gray-500 font-medium mb-1.5">Taille</div>
                      <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-base text-gray-900 font-medium">
                        {article.size || 'Non spécifié'}
                      </div>
                    </div>

                    <div className="group">
                      <div className="text-xs text-gray-500 font-medium mb-1.5">État</div>
                      <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-base text-gray-900 font-medium">
                        {CONDITION_LABELS[article.condition] || article.condition}
                      </div>
                    </div>

                    {article.color && (
                      <div className="group">
                        <div className="text-xs text-gray-500 font-medium mb-1.5">Couleur</div>
                        <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-base text-gray-900 font-medium">
                          {article.color}
                        </div>
                      </div>
                    )}

                    {article.material && (
                      <div className="group">
                        <div className="text-xs text-gray-500 font-medium mb-1.5">Matière</div>
                        <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-base text-gray-900 font-medium">
                          {article.material}
                        </div>
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
                    <div className="grid grid-cols-1 gap-3">
                      {article.main_category && (
                        <div className="group">
                          <div className="text-xs text-gray-500 font-medium mb-1.5">Catégorie principale</div>
                          <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-base text-gray-900 font-medium">
                            {article.main_category}
                          </div>
                        </div>
                      )}
                      {article.subcategory && (
                        <div className="group">
                          <div className="text-xs text-gray-500 font-medium mb-1.5">Sous-catégorie</div>
                          <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-base text-gray-900 font-medium">
                            {article.subcategory}
                          </div>
                        </div>
                      )}
                      {article.item_category && (
                        <div className="group">
                          <div className="text-xs text-gray-500 font-medium mb-1.5">Type d'article</div>
                          <div className="px-4 py-2.5 bg-gradient-to-r from-gray-50 to-gray-100 rounded-lg border border-gray-200 text-base text-gray-900 font-medium">
                            {article.item_category}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center md:justify-end gap-3">
              {article.status !== 'sold' && (
                <Button
                  variant="secondary"
                  onClick={() => navigate(`/articles/${id}/edit`)}
                  className="px-6 w-full md:w-auto"
                >
                  <Edit className="w-4 h-4 mr-2" />
                  Modifier
                </Button>
              )}

              {article.status === 'draft' && (
                <Button
                  variant="secondary"
                  onClick={handleMarkAsReady}
                  disabled={markingReady}
                  className="px-6 w-full md:w-auto bg-white text-emerald-700 hover:bg-emerald-50 border-emerald-300 hover:border-emerald-400"
                >
                  <CheckCircle className="w-4 h-4 mr-2" />
                  {markingReady ? 'Enregistrement...' : 'Prêt pour Vinted'}
                </Button>
              )}

              {(article.status === 'ready' || article.status === 'scheduled' || article.status === 'published') && (
                <Button
                  variant="secondary"
                  onClick={() => setScheduleModalOpen(true)}
                  className="px-6 w-full md:w-auto bg-white text-blue-700 hover:bg-blue-50 border-blue-300 hover:border-blue-400"
                >
                  <Calendar className="w-4 h-4 mr-2" />
                  Programmer
                </Button>
              )}

              {(article.status === 'ready' || article.status === 'scheduled' || article.status === 'published') && (
                <Button
                  variant="secondary"
                  onClick={handleOpenSoldModal}
                  className="px-6 w-full md:w-auto bg-white text-green-700 hover:bg-green-50 border-green-300 hover:border-green-400"
                >
                  <DollarSign className="w-4 h-4 mr-2" />
                  Marquer vendu
                </Button>
              )}

              {(article.status === 'ready' || article.status === 'scheduled') && (
                <Button
                  onClick={handleValidateAndSend}
                  disabled={publishing}
                  className="px-6 w-full md:w-auto bg-emerald-600 hover:bg-emerald-700"
                >
                  <Send className="w-4 h-4 mr-2" />
                  {publishing ? 'Préparation...' : 'Envoyer à Vinted'}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </>
  );
}
