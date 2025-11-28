import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Edit,
  Send,
  Package,
  ShoppingBag,
  ChevronLeft,
  ChevronRight,
  CheckCircle,
  Layers,
  Calendar,
  DollarSign,
  Trash2,
  Eye,
  Tag,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Article } from '../types/article';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PublishInstructionsModal } from '../components/PublishInstructionsModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { LabelModal } from '../components/LabelModal';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

// UI Kit Apple-style
import {
  PageContainer,
  PageSection,
  Card,
  SoftCard,
  Pill,
  PrimaryButton,
  GhostButton,
} from '../components/ui/UiKit';

export function PreviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [article, setArticle] = useState<Article | null>(null);
  const [sellerName, setSellerName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [markingReady, setMarkingReady] = useState(false);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'error';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });

  const [publishInstructionsModal, setPublishInstructionsModal] = useState<{
    isOpen: boolean;
    articleId: string;
  }>({ isOpen: false, articleId: '' });

  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);
  const [saleDetailModalOpen, setSaleDetailModalOpen] = useState(false);
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

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
        .select(
          `
          *,
          family_members!articles_seller_id_fkey(name)
        `
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setArticle({
          ...data,
          price: parseFloat(data.price),
        });

        if (data.family_members) {
          setSellerName(data.family_members.name);
        }
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors du chargement de l'article",
        type: 'error',
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
        articleId: id,
      });
    } catch (error) {
      console.error('Error preparing article:', error);
      setToast({
        type: 'error',
        text:
          error instanceof Error
            ? error.message
            : "Erreur lors de la préparation de l'article",
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
        text: 'Article marqué comme prêt pour Vinted',
      });

      await fetchArticle();
    } catch (error) {
      console.error('Error marking article as ready:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour du statut',
      });
    } finally {
      setMarkingReady(false);
    }
  }

  function handleOpenSoldModal() {
    setSoldModalOpen(true);
  }

  async function handleDelete() {
    if (!id || !article || !user) return;

    try {
      if (article.photos && article.photos.length > 0) {
        const filePaths = article.photos
          .map((photoUrl: string) => {
            const urlParts = photoUrl.split('/article-photos/');
            return urlParts.length === 2 ? urlParts[1] : null;
          })
          .filter((path: string | null): path is string => path !== null);

        if (filePaths.length > 0) {
          const { error: storageError } = await supabase.storage
            .from('article-photos')
            .remove(filePaths);

          if (storageError) {
            console.error('Error deleting photos from storage:', storageError);
          }
        }
      }

      try {
        const folderPath = `${user.id}/${id}`;
        const { data: folderContents } = await supabase.storage
          .from('article-photos')
          .list(folderPath);

        if (folderContents && folderContents.length > 0) {
          const filesToDelete = folderContents.map(
            (file) => `${folderPath}/${file.name}`
          );
          await supabase.storage.from('article-photos').remove(filesToDelete);
        }
      } catch (folderError) {
        console.log('No folder to clean up or error cleaning folder:', folderError);
      }

      const { error } = await supabase.from('articles').delete().eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article supprimé avec succès',
      });

      setDeleteModalOpen(false);
      setTimeout(() => {
        navigate('/stock');
      }, 1000);
    } catch (error) {
      console.error('Error deleting article:', error);
      setToast({
        type: 'error',
        text: "Erreur lors de la suppression de l'article",
      });
    }
  }

  async function handleMarkAsSold(saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
    sellerId?: string;
  }) {
    if (!id || !article) return;

    try {
      const netProfit = saleData.soldPrice - saleData.fees - saleData.shippingCost;

      const updateData: any = {
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
      };

      if (saleData.sellerId) {
        updateData.seller_id = saleData.sellerId;
      }

      const { error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme vendu',
      });

      setSoldModalOpen(false);
      await fetchArticle();
    } catch (error) {
      console.error('Error marking article as sold:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour du statut',
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
    setCurrentPhotoIndex((prev) =>
      prev === 0 ? article.photos.length - 1 : prev - 1
    );
  };

  const handleNextPhoto = () => {
    if (!article?.photos) return;
    setCurrentPhotoIndex((prev) =>
      prev === article.photos.length - 1 ? 0 : prev + 1
    );
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
  };

  const getStatusVariant = (status?: string | null) => {
    switch (status) {
      case 'ready':
        return 'success';
      case 'scheduled':
        return 'warning';
      case 'published':
        return 'primary';
      case 'sold':
        return 'success';
      case 'draft':
      default:
        return 'neutral';
    }
  };

  const getStatusLabel = (status?: string | null) => {
    switch (status) {
      case 'ready':
        return 'Prêt pour Vinted';
      case 'scheduled':
        return 'Planifié';
      case 'published':
        return 'Publié';
      case 'sold':
        return 'Vendu';
      case 'draft':
        return 'Brouillon';
      default:
        return status || '';
    }
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
                text: 'Article programmé avec succès',
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

          {saleDetailModalOpen && article.status === 'sold' && (
            <SaleDetailModal
              sale={{
                id: article.id,
                title: article.title,
                brand: article.brand || '',
                price: article.price || 0,
                sold_price: article.sold_price || article.price || 0,
                sold_at: article.sold_at || new Date().toISOString(),
                platform: article.platform || 'Vinted',
                shipping_cost: article.shipping_cost || 0,
                fees: article.fees || 0,
                net_profit: article.net_profit || 0,
                photos: article.photos || [],
                buyer_name: article.buyer_name,
                sale_notes: article.sale_notes,
                seller_name: sellerName || undefined,
              }}
              onClose={() => setSaleDetailModalOpen(false)}
            />
          )}

          {article.reference_number && (
            <LabelModal
              isOpen={labelModalOpen}
              onClose={() => setLabelModalOpen(false)}
              article={{
                reference_number: article.reference_number,
                title: article.title,
                brand: article.brand,
                size: article.size,
                color: article.color,
                price: article.price,
              }}
              sellerName={sellerName || undefined}
            />
          )}
        </>
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer l'article"
        message="Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />

      <PageContainer>
        <PageSection>
          {/* Header Apple-like */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                    <Eye className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">
                      Prévisualisation
                    </h1>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                      Visualisez votre annonce avant publication.
                    </p>
                  </div>
                </div>

                {article && (
                  <div className="flex flex-wrap items-center gap-2">
                    {article.status && (
                      <Pill variant={getStatusVariant(article.status)}>
                        {getStatusLabel(article.status)}
                      </Pill>
                    )}
                    {article.reference_number && (
                      <Pill variant="neutral">
                        Réf.
                        <span className="font-mono ml-1">
                          {article.reference_number}
                        </span>
                      </Pill>
                    )}
                    {sellerName && (
                      <Pill variant="neutral">Vendu par {sellerName}</Pill>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {loading ? (
            <Card className="py-10 sm:py-12 flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4" />
              <p className="text-sm text-slate-600">Chargement de l&apos;article…</p>
            </Card>
          ) : !article ? (
            <Card className="py-10 sm:py-12 flex flex-col items-center justify-center text-center">
              <Package className="w-16 h-16 text-slate-200 mb-4" />
              <h2 className="text-lg font-semibold text-slate-900 mb-1">
                Article non trouvé
              </h2>
              <p className="text-sm text-slate-500">
                Impossible de charger cette annonce. Elle a peut-être été supprimée.
              </p>
            </Card>
          ) : (
            <>
              {/* Grille principale : photos + détails */}
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] mb-6">
                {/* Photos */}
                <Card className="overflow-hidden">
                  {article.photos && article.photos.length > 0 ? (
                    <div className="aspect-[16/10] bg-slate-50 relative group">
                      <img
                        src={article.photos[currentPhotoIndex]}
                        alt={article.title}
                        className="w-full h-full object-cover"
                      />
                      {article.photos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handlePreviousPhoto();
                            }}
                            className="absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/70 hover:bg-slate-900/90 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronLeft className="w-5 h-5" />
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleNextPhoto();
                            }}
                            className="absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/70 hover:bg-slate-900/90 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                          >
                            <ChevronRight className="w-5 h-5" />
                          </button>
                          <div className="absolute bottom-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm">
                            {currentPhotoIndex + 1} / {article.photos.length}
                          </div>
                        </>
                      )}
                    </div>
                  ) : (
                    <div className="aspect-[16/10] bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center">
                      <Package className="w-20 h-20 text-slate-200" />
                    </div>
                  )}

                  {article.photos && article.photos.length > 1 && (
                    <div className="p-4 bg-white border-t border-slate-100">
                      <div className="grid grid-cols-6 gap-2">
                        {article.photos.map((photo, index) => (
                          <button
                            key={index}
                            type="button"
                            onClick={() => handlePhotoClick(index)}
                            className={[
                              'aspect-square bg-slate-100 rounded-xl overflow-hidden border-2 transition-all',
                              index === currentPhotoIndex
                                ? 'border-emerald-500 ring-2 ring-emerald-200'
                                : 'border-slate-200 hover:border-emerald-300',
                            ].join(' ')}
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
                </Card>

                {/* Détails article */}
                <div className="space-y-4">
                  <Card>
                    <div className="mb-5">
                      <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
                        {article.title}
                      </h2>
                      <div className="flex items-center gap-2 text-slate-600 mb-3">
                        <ShoppingBag className="w-4 h-4" />
                        <span className="text-sm font-medium">
                          {article.brand || 'Marque non spécifiée'}
                        </span>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-3xl sm:text-4xl font-semibold text-emerald-600">
                          {article.price.toFixed(2)} €
                        </span>
                      </div>
                    </div>

                    <div className="border-t border-slate-100 pt-4 mb-4">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                        Description
                      </h3>
                      <p className="text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                        {article.description || 'Aucune description fournie.'}
                      </p>
                    </div>

                    <div className="border-t border-slate-100 pt-4">
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        Caractéristiques
                      </h3>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wide">
                            Taille
                          </div>
                          <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-900">
                            {article.size || 'Non spécifiée'}
                          </div>
                        </div>

                        <div>
                          <div className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wide">
                            État
                          </div>
                          <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-900">
                            {CONDITION_LABELS[article.condition] || article.condition}
                          </div>
                        </div>

                        {article.color && (
                          <div>
                            <div className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wide">
                              Couleur
                            </div>
                            <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-900">
                              {article.color}
                            </div>
                          </div>
                        )}

                        {article.material && (
                          <div>
                            <div className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wide">
                              Matière
                            </div>
                            <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-900">
                              {article.material}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </Card>

                  {(article.main_category ||
                    article.subcategory ||
                    article.item_category) && (
                    <Card>
                      <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Catégorisation Vinted
                      </h3>
                      <div className="space-y-2.5">
                        {article.main_category && (
                          <div>
                            <div className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wide">
                              Catégorie principale
                            </div>
                            <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-900">
                              {article.main_category}
                            </div>
                          </div>
                        )}
                        {article.subcategory && (
                          <div>
                            <div className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wide">
                              Sous-catégorie
                            </div>
                            <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-900">
                              {article.subcategory}
                            </div>
                          </div>
                        )}
                        {article.item_category && (
                          <div>
                            <div className="text-[11px] text-slate-500 font-medium mb-1.5 uppercase tracking-wide">
                              Type d&apos;article
                            </div>
                            <div className="px-3 py-2.5 rounded-2xl border border-slate-100 bg-slate-50 text-sm font-medium text-slate-900">
                              {article.item_category}
                            </div>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}
                </div>
              </div>

              {/* Bannières de statut */}
              {article.status === 'ready' && (
                <SoftCard>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-semibold text-emerald-900">
                          Statut : Prêt pour Vinted
                        </h3>
                        <Pill variant="success" className="text-[11px]">
                          100% complété
                        </Pill>
                      </div>
                      <p className="text-sm text-emerald-900/90 leading-relaxed">
                        Tous les champs requis sont remplis. Vous pouvez maintenant envoyer
                        cette annonce sur Vinted.
                      </p>
                    </div>
                  </div>
                </SoftCard>
              )}

              {article.status === 'draft' && (
                <Card>
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm flex-shrink-0">
                      <Package className="h-5 w-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                          Statut : Brouillon
                        </h3>
                        <Pill variant="neutral" className="text-[11px]">
                          En cours
                        </Pill>
                      </div>
                      <p className="text-sm text-slate-700 leading-relaxed">
                        Cette annonce est en cours de préparation. Complétez les champs
                        obligatoires avant de l&apos;envoyer sur Vinted.
                      </p>
                    </div>
                  </div>
                </Card>
              )}

              {article.status === 'scheduled' && (
                <SoftCard className="border-amber-200 bg-amber-50/70">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                      <Calendar className="h-5 w-5 text-amber-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-semibold text-amber-900">
                          Statut : Planifié
                        </h3>
                        <Pill variant="warning" className="text-[11px]">
                          Programmé
                        </Pill>
                      </div>
                      <p className="text-sm text-amber-900/90 leading-relaxed">
                        {article.scheduled_for ? (
                          <>
                            Publication prévue le{' '}
                            <span className="font-semibold">
                              {new Date(article.scheduled_for).toLocaleDateString(
                                'fr-FR',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </>
                        ) : (
                          "Cette annonce est planifiée pour une publication ultérieure sur Vinted."
                        )}
                      </p>
                    </div>
                  </div>
                </SoftCard>
              )}

              {article.status === 'published' && (
                <SoftCard className="border-blue-200 bg-blue-50/70">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                      <Send className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-semibold text-blue-900">
                          Statut : Publié
                        </h3>
                        <Pill variant="primary" className="text-[11px]">
                          En ligne
                        </Pill>
                      </div>
                      <p className="text-sm text-blue-900/90 leading-relaxed">
                        {article.published_at ? (
                          <>
                            Publié le{' '}
                            <span className="font-semibold">
                              {new Date(article.published_at).toLocaleDateString(
                                'fr-FR',
                                {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                  hour: '2-digit',
                                  minute: '2-digit',
                                }
                              )}
                            </span>
                          </>
                        ) : (
                          'Cette annonce est actuellement en ligne sur Vinted.'
                        )}
                      </p>
                    </div>
                  </div>
                </SoftCard>
              )}

              {article.status === 'sold' && (
                <SoftCard className="border-emerald-200 bg-emerald-50/80">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <h3 className="text-sm sm:text-base font-semibold text-emerald-900">
                          Statut : Vendu
                        </h3>
                        <Pill variant="success" className="text-[11px]">
                          Terminé
                        </Pill>
                      </div>
                      <p className="text-sm text-emerald-900/90 leading-relaxed">
                        Cet article a été vendu avec succès
                        {sellerName ? ` par ${sellerName}` : ''}.
                      </p>
                    </div>
                  </div>
                </SoftCard>
              )}

              {/* Étiquette */}
              {article.reference_number && (
                <Card className="mt-4">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <div>
                      <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                        Étiquette de colis
                      </div>
                      <p className="text-xs text-slate-500">
                        Référence :{' '}
                        <span className="font-mono font-semibold">
                          {article.reference_number}
                        </span>
                      </p>
                    </div>
                    <GhostButton
                      onClick={() => setLabelModalOpen(true)}
                      className="text-xs px-3 py-2"
                    >
                      <Tag className="w-3.5 h-3.5" />
                      Générer l&apos;étiquette
                    </GhostButton>
                  </div>
                </Card>
              )}

              {/* Actions */}
              <Card className="mt-4">
                <div className="flex flex-wrap justify-center gap-3">
                  {/* Supprimer */}
                  <GhostButton
                    onClick={() => setDeleteModalOpen(true)}
                    className="flex-1 min-w-[180px] justify-center bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </GhostButton>

                  {/* Modifier */}
                  {article.status !== 'sold' && (
                    <GhostButton
                      onClick={() => navigate(`/articles/${id}/edit`)}
                      className="flex-1 min-w-[180px] justify-center"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </GhostButton>
                  )}
                  {article.status === 'sold' && (
                    <GhostButton
                      onClick={() => navigate(`/articles/${id}/edit`)}
                      className="flex-1 min-w-[180px] justify-center"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </GhostButton>
                  )}

                  {/* Prêt pour Vinted */}
                  {article.status === 'draft' && (
                    <GhostButton
                      onClick={handleMarkAsReady}
                      className="flex-1 min-w-[180px] justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {markingReady ? 'Enregistrement…' : 'Prêt pour Vinted'}
                    </GhostButton>
                  )}

                  {/* Programmer */}
                  {(article.status === 'ready' ||
                    article.status === 'scheduled' ||
                    article.status === 'published') && (
                    <GhostButton
                      onClick={() => setScheduleModalOpen(true)}
                      className="flex-1 min-w-[180px] justify-center bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    >
                      <Calendar className="w-4 h-4" />
                      Programmer
                    </GhostButton>
                  )}

                  {/* Marquer vendu */}
                  {(article.status === 'ready' ||
                    article.status === 'scheduled' ||
                    article.status === 'published') && (
                    <GhostButton
                      onClick={handleOpenSoldModal}
                      className="flex-1 min-w-[180px] justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <DollarSign className="w-4 h-4" />
                      Marquer vendu
                    </GhostButton>
                  )}

                  {/* Envoyer à Vinted */}
                  {(article.status === 'ready' || article.status === 'scheduled') && (
                    <PrimaryButton
                      onClick={() => navigate(`/articles/${article.id}/structure`)}
                      className="flex-1 min-w-[180px] justify-center"
                    >
                      <Send className="w-4 h-4" />
                      Envoyer à Vinted
                    </PrimaryButton>
                  )}

                  {/* Voir la vente */}
                  {article.status === 'sold' && (
                    <GhostButton
                      onClick={() => setSaleDetailModalOpen(true)}
                      className="flex-1 min-w-[180px] justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <Eye className="w-4 h-4" />
                      Voir la vente
                    </GhostButton>
                  )}
                </div>
              </Card>
            </>
          )}
        </PageSection>
      </PageContainer>
    </>
  );
}
