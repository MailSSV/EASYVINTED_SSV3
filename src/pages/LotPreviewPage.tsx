import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ChevronLeft,
  Package,
  Calendar,
  Tag,
  TrendingDown,
  ChevronRight,
  Trash2,
  Edit,
  DollarSign,
  Send,
} from 'lucide-react';

import { Lot, LotStatus } from '../types/lot';
import { Article } from '../types/article';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';
import { LabelModal } from '../components/LabelModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';

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

const STATUS_LABELS: Record<LotStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  scheduled: 'Planifié',
  published: 'Publié',
  sold: 'Vendu',
};

function getStatusVariant(status: LotStatus) {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'ready':
      return 'primary';
    case 'scheduled':
      return 'warning';
    case 'published':
      return 'primary';
    case 'sold':
      return 'success';
    default:
      return 'neutral';
  }
}

const truncateText = (text: string, maxLength: number) => {
  if (!text) return '';
  if (text.length <= maxLength) return text;
  return text.substring(0, maxLength).trim() + '...';
};

export default function LotPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [lot, setLot] = useState<any | null>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [labelModalOpen, setLabelModalOpen] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [soldModalOpen, setSoldModalOpen] = useState(false);

  useEffect(() => {
    if (id) {
      fetchLot();
      fetchUserProfile();
    }
  }, [id]);

  const fetchUserProfile = async () => {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user) {
        const { data } = await supabase
          .from('user_profiles')
          .select('dressing_name')
          .eq('user_id', user.id)
          .maybeSingle();
        setUserProfile(data);
      }
    } catch (error) {
      console.error('Error fetching user profile:', error);
    }
  };

  const fetchLot = async () => {
    setLoading(true);
    try {
      const { data: lotData, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', id)
        .single();

      if (lotError) throw lotError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('lot_items')
        .select(
          `
          articles (
            id,
            title,
            brand,
            price,
            photos,
            size,
            description
          )
        `
        )
        .eq('lot_id', id);

      if (itemsError) throw itemsError;

      const articlesList = itemsData.map((item: any) => item.articles).filter(Boolean);

      setLot(lotData);
      setArticles(articlesList as Article[]);
      setSelectedPhoto(
        lotData.cover_photo ||
          lotData.photos?.[0] ||
          articlesList[0]?.photos?.[0] ||
          ''
      );
    } catch (error) {
      console.error('Error fetching lot:', error);
      setToast({ type: 'error', text: 'Erreur lors du chargement du lot' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase.from('lots').delete().eq('id', id);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot supprimé avec succès' });
      setDeleteModalOpen(false);
      setTimeout(() => navigate('/lots'), 1200);
    } catch (error) {
      console.error('Error deleting lot:', error);
      setToast({ type: 'error', text: 'Erreur lors de la suppression du lot' });
    }
  };

  const handleSchedule = async (date: Date) => {
    try {
      const { error } = await supabase
        .from('lots')
        .update({
          scheduled_for: date.toISOString(),
          status: 'scheduled',
        })
        .eq('id', id);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot programmé avec succès' });
      setScheduleModalOpen(false);
      fetchLot();
    } catch (error) {
      console.error('Error scheduling lot:', error);
      setToast({ type: 'error', text: 'Erreur lors de la programmation' });
    }
  };

  const handleMarkAsSold = async (saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
  }) => {
    try {
      const { error } = await supabase
        .from('lots')
        .update({
          status: 'sold',
          published_at: saleData.soldAt,
        })
        .eq('id', id);

      if (error) throw error;

      const articleIds = articles.map((a) => a.id);
      const pricePerArticle = saleData.soldPrice / articleIds.length;
      const feesPerArticle = saleData.fees / articleIds.length;
      const shippingPerArticle = saleData.shippingCost / articleIds.length;

      const { error: articlesError } = await supabase
        .from('articles')
        .update({
          status: 'sold',
          sold_at: saleData.soldAt,
          sold_price: pricePerArticle,
          platform: saleData.platform,
          fees: feesPerArticle,
          shipping_cost: shippingPerArticle,
          buyer_name: saleData.buyerName,
          sale_notes: saleData.notes,
        })
        .in('id', articleIds);

      if (articlesError) throw articlesError;

      setToast({ type: 'success', text: 'Lot marqué comme vendu' });
      setSoldModalOpen(false);
      fetchLot();
    } catch (error) {
      console.error('Error marking lot as sold:', error);
      setToast({ type: 'error', text: 'Erreur lors de la mise à jour' });
    }
  };

  if (loading) {
    return (
      <PageContainer>
        <PageSection>
          <Card className="py-10 sm:py-12 flex flex-col items-center justify-center text-center">
            <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4" />
            <p className="text-sm text-slate-600">Chargement du lot…</p>
          </Card>
        </PageSection>
      </PageContainer>
    );
  }

  if (!lot) {
    return (
      <PageContainer>
        <PageSection>
          <Card className="py-10 sm:py-12 flex flex-col items-center justify-center text-center">
            <Package className="w-16 h-16 text-slate-200 mb-4" />
            <h2 className="text-lg font-semibold text-slate-900 mb-1">
              Lot introuvable
            </h2>
            <p className="text-sm text-slate-500 mb-4">
              Impossible de charger ce lot. Il a peut-être été supprimé.
            </p>
            <GhostButton onClick={() => navigate(-1)} className="gap-2">
              <ChevronLeft className="w-4 h-4" />
              Retour
            </GhostButton>
          </Card>
        </PageSection>
      </PageContainer>
    );
  }

  const allPhotos = articles.map((a) => a.photos?.[0]).filter(Boolean) as string[];
  const currentPhotoIndex = allPhotos.indexOf(selectedPhoto);

  const handleNextPhoto = () => {
    if (currentPhotoIndex < allPhotos.length - 1) {
      setSelectedPhoto(allPhotos[currentPhotoIndex + 1]);
    }
  };

  const handlePreviousPhoto = () => {
    if (currentPhotoIndex > 0) {
      setSelectedPhoto(allPhotos[currentPhotoIndex - 1]);
    }
  };

  return (
    <>
      {toast && (
        <Toast
          type={toast.type}
          message={toast.text}
          onClose={() => setToast(null)}
        />
      )}

      <ConfirmModal
        isOpen={deleteModalOpen}
        onClose={() => setDeleteModalOpen(false)}
        onConfirm={handleDelete}
        title="Supprimer le lot"
        message="Êtes-vous sûr de vouloir supprimer ce lot ? Les articles qu'il contient ne seront pas supprimés. Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />

      {scheduleModalOpen && (
        <ScheduleModal
          isOpen={scheduleModalOpen}
          onClose={() => setScheduleModalOpen(false)}
          onSchedule={handleSchedule}
          currentDate={lot.scheduled_for ? new Date(lot.scheduled_for) : undefined}
        />
      )}

      {soldModalOpen && (
        <ArticleSoldModal
          isOpen={soldModalOpen}
          onClose={() => setSoldModalOpen(false)}
          onConfirm={handleMarkAsSold}
          article={{
            ...articles[0],
            title: lot.name,
            price: lot.price,
          }}
        />
      )}

      {labelModalOpen && (
        <LabelModal
          isOpen={labelModalOpen}
          onClose={() => setLabelModalOpen(false)}
          article={{
            reference_number: lot.reference_number || 'Non définie',
            title: lot.name,
            brand: '',
            size: '',
            color: '',
            price: lot.price,
          }}
          sellerName={userProfile?.dressing_name}
          lotArticles={articles.map((a) => ({
            title: a.title,
            brand: a.brand,
          }))}
        />
      )}

      <PageContainer>
        <PageSection>
          {/* Header Apple-like - Responsive */}
          <div className="mb-5 sm:mb-6">
            <div className="flex items-start gap-3 mb-3 sm:mb-4">
              <button
                type="button"
                onClick={() => navigate('/lots')}
                className="hidden sm:inline-flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 sm:gap-2.5 mb-2">
                  <div className="w-9 h-9 sm:w-10 sm:h-10 flex-shrink-0 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                    <Package className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <div className="min-w-0">
                    <h1 className="text-base sm:text-2xl font-semibold text-slate-900 leading-tight">
                      Prévisualisation
                    </h1>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500 hidden sm:block">
                      Visualisez ce lot avant de le publier.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-1.5 sm:gap-2">
                  <Pill variant={getStatusVariant(lot.status)} className="text-[10px] sm:text-xs px-2 py-0.5">
                    {STATUS_LABELS[lot.status]}
                  </Pill>
                  {lot.reference_number && (
                    <Pill variant="neutral" className="text-[10px] sm:text-xs px-2 py-0.5">
                      <span className="hidden xs:inline">Réf. </span>
                      <span className="font-mono">{lot.reference_number}</span>
                    </Pill>
                  )}
                  <Pill variant="neutral" className="text-[10px] sm:text-xs px-2 py-0.5">
                    {articles.length} articles
                  </Pill>
                </div>
              </div>
            </div>
          </div>

          {/* Grille principale */}
          <div className="grid gap-4 sm:gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] mb-6">
            {/* Photos du lot */}
            <Card className="overflow-hidden p-0">
              {/* Conteneur principal adapté au mobile */}
              <div className="relative bg-slate-50">
                <div className="w-full aspect-[4/3] sm:aspect-[16/10] lg:aspect-[4/3] max-h-[300px] sm:max-h-[400px] lg:max-h-[500px]">
                  {selectedPhoto ? (
                    <img
                      src={selectedPhoto}
                      alt={lot.name}
                      className="w-full h-full object-contain sm:object-cover bg-slate-50"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <Package className="w-16 h-16 sm:w-20 sm:h-20 text-slate-200" />
                    </div>
                  )}
                </div>

                {allPhotos.length > 1 && (
                  <>
                    {/* flèches : visibles surtout sur desktop, discrètes mobile */}
                    <button
                      type="button"
                      onClick={handlePreviousPhoto}
                      disabled={currentPhotoIndex <= 0}
                      className={`absolute left-3 top-1/2 -translate-y-1/2 bg-slate-900/70 text-white p-2 rounded-full shadow-lg transition-all ${
                        currentPhotoIndex <= 0
                          ? 'opacity-0 cursor-not-allowed'
                          : 'opacity-60 hover:opacity-100 hover:bg-slate-900/90'
                      }`}
                    >
                      <ChevronLeft className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      disabled={currentPhotoIndex === allPhotos.length - 1}
                      className={`absolute right-3 top-1/2 -translate-y-1/2 bg-slate-900/70 text-white p-2 rounded-full shadow-lg transition-all ${
                        currentPhotoIndex === allPhotos.length - 1
                          ? 'opacity-0 cursor-not-allowed'
                          : 'opacity-60 hover:opacity-100 hover:bg-slate-900/90'
                      }`}
                    >
                      <ChevronRight className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <div className="absolute bottom-3 right-3 bg-slate-900/80 text-white px-3 py-1.5 rounded-full text-[11px] sm:text-xs font-medium backdrop-blur-sm">
                      {currentPhotoIndex + 1} / {allPhotos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Vignettes */}
              {allPhotos.length > 1 && (
                <div className="p-3 sm:p-4 bg-white border-t border-slate-100">
                  {/* Desktop grid */}
                  <div className="hidden sm:grid grid-cols-6 gap-2">
                    {allPhotos.slice(0, 12).map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhoto(photo)}
                        className={[
                          'aspect-square rounded-xl overflow-hidden border-2 transition-all',
                          selectedPhoto === photo
                            ? 'border-emerald-500 ring-2 ring-emerald-200'
                            : 'border-slate-200 hover:border-emerald-300',
                        ].join(' ')}
                      >
                        <img
                          src={photo}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))}
                  </div>

                  {/* Mobile scroll : compact et responsive */}
                  <div className="sm:hidden overflow-x-auto overflow-y-hidden -mx-3 px-3">
                    <div className="flex gap-2 pb-2">
                      {allPhotos.map((photo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setSelectedPhoto(photo)}
                          className={[
                            'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 transition-all',
                            selectedPhoto === photo
                              ? 'border-emerald-500 ring-2 ring-emerald-200'
                              : 'border-slate-200 active:border-emerald-300',
                          ].join(' ')}
                        >
                          <img
                            src={photo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </Card>

            {/* Détails du lot */}
            <div className="space-y-4">
              {/* Infos principales + stats */}
              <Card>
                <div className="mb-4 sm:mb-5">
                  <h2 className="text-lg sm:text-2xl font-semibold text-slate-900 mb-1.5 sm:mb-2 leading-tight">
                    {lot.name}
                  </h2>
                  {lot.description && (
                    <p className="text-xs sm:text-sm text-slate-600 leading-relaxed line-clamp-2 sm:line-clamp-none">
                      {lot.description}
                    </p>
                  )}
                </div>

                <div className="space-y-3 sm:space-y-4">
                  {/* Prix + remise */}
                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3 p-3 sm:p-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                    <div>
                      <p className="text-[10px] sm:text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-0.5 sm:mb-1">
                        Prix du lot
                      </p>
                      <p className="text-2xl sm:text-4xl font-semibold text-emerald-600">
                        {lot.price.toFixed(0)} €
                      </p>
                    </div>
                    {lot.discount_percentage > 0 && (
                      <div className="text-left sm:text-right">
                        <div className="inline-flex items-center gap-1.5 sm:gap-2 bg-white px-3 sm:px-4 py-1.5 sm:py-2 rounded-xl sm:rounded-2xl shadow-sm border border-emerald-100">
                          <TrendingDown className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-600" />
                          <span className="text-xl sm:text-2xl font-semibold text-emerald-600">
                            -{lot.discount_percentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nombre d'articles / valeur totale */}
                  <div className="grid grid-cols-2 gap-2 sm:gap-3">
                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/80">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <Package className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                          Articles
                        </p>
                      </div>
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900">
                        {articles.length}
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">
                        Pièces incluses
                      </p>
                    </div>

                    <div className="p-3 sm:p-4 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/80">
                      <div className="flex items-center gap-1.5 sm:gap-2 mb-1.5 sm:mb-2">
                        <Tag className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-600" />
                        <p className="text-[10px] sm:text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                          Valeur Totale
                        </p>
                      </div>
                      <p className="text-xl sm:text-2xl font-semibold text-slate-900">
                        {lot.original_total_price.toFixed(0)} €
                      </p>
                      <p className="text-[10px] sm:text-xs text-slate-500 mt-0.5 sm:mt-1 leading-tight">
                        Prix des articles si vendus à l&apos;unité
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Liste des articles */}
              <Card>
                <h2 className="text-xs sm:text-sm font-semibold text-slate-900 mb-2 sm:mb-3">
                  Articles inclus ({articles.length})
                </h2>
                <div className="space-y-2 sm:space-y-3 max-h-80 overflow-y-auto pr-1">
                  {articles.map((article) => {
                    const titleMaxLength = window.innerWidth < 475 ? 25 : window.innerWidth < 640 ? 35 : 50;
                    const brandMaxLength = window.innerWidth < 475 ? 15 : 25;

                    return (
                      <button
                        key={article.id}
                        type="button"
                        onClick={() => navigate(`/articles/${article.id}/preview`)}
                        className="w-full flex items-center gap-2 sm:gap-3 p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/40 active:bg-emerald-50/60 transition-colors text-left"
                      >
                        <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg sm:rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                          {article.photos?.[0] ? (
                            <img
                              src={article.photos[0]}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <Package className="w-5 h-5 sm:w-6 sm:h-6 text-slate-300" />
                            </div>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 overflow-hidden">
                          <p className="text-xs sm:text-sm font-medium text-slate-900 break-words line-clamp-1">
                            {truncateText(article.title, titleMaxLength)}
                          </p>
                          <p className="text-[10px] sm:text-xs text-slate-500">
                            {truncateText(article.brand || 'Sans marque', brandMaxLength)}
                            {article.size && ` • ${article.size}`}
                          </p>
                        </div>
                        <div className="text-right flex-shrink-0 ml-1">
                          <p className="text-xs sm:text-sm font-semibold text-slate-900 whitespace-nowrap">
                            {article.price.toFixed(0)} €
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </Card>

              {/* Étiquette colis */}
              <Card>
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-3">
                  <div className="flex-1">
                    <div className="text-[10px] sm:text-xs font-semibold text-slate-600 uppercase tracking-wide mb-0.5 sm:mb-1">
                      Étiquette de colis
                    </div>
                    <p className="text-[10px] sm:text-xs text-slate-500">
                      Réf. {' '}
                      <span className="font-mono font-semibold">
                        {lot.reference_number || 'Non définie'}
                      </span>
                    </p>
                  </div>
                  <GhostButton
                    onClick={() => setLabelModalOpen(true)}
                    className="text-xs px-3 py-2 w-full sm:w-auto justify-center"
                  >
                    <Tag className="w-3.5 h-3.5" />
                    <span>Générer l'étiquette</span>
                  </GhostButton>
                </div>
              </Card>

              {/* Actions */}
              <Card>
                <h3 className="text-[10px] sm:text-xs font-semibold text-slate-500 uppercase tracking-wide mb-2 sm:mb-3">
                  Actions
                </h3>
                <div className="flex flex-wrap justify-center gap-2 sm:gap-3">
                  {/* Supprimer */}
                  <GhostButton
                    onClick={() => setDeleteModalOpen(true)}
                    className="flex-1 min-w-[140px] sm:min-w-[180px] justify-center bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100 active:bg-rose-200 text-xs sm:text-sm px-3 py-2"
                  >
                    <Trash2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                    Supprimer
                  </GhostButton>

                  {/* Modifier (sauf lot sold/published) */}
                  {lot.status !== 'sold' && lot.status !== 'published' && (
                    <GhostButton
                      onClick={() => navigate(`/lots?edit=${id}`)}
                      className="flex-1 min-w-[140px] sm:min-w-[180px] justify-center text-xs sm:text-sm px-3 py-2"
                    >
                      <Edit className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Modifier
                    </GhostButton>
                  )}

                  {/* Programmer */}
                  {(lot.status === 'ready' ||
                    lot.status === 'scheduled' ||
                    lot.status === 'published') && (
                    <GhostButton
                      onClick={() => setScheduleModalOpen(true)}
                      className="flex-1 min-w-[140px] sm:min-w-[180px] justify-center bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100 active:bg-slate-200 text-xs sm:text-sm px-3 py-2"
                    >
                      <Calendar className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Programmer
                    </GhostButton>
                  )}

                  {/* Marquer vendu */}
                  {(lot.status === 'ready' ||
                    lot.status === 'scheduled' ||
                    lot.status === 'published') && (
                    <GhostButton
                      onClick={() => setSoldModalOpen(true)}
                      className="flex-1 min-w-[140px] sm:min-w-[180px] justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100 active:bg-emerald-200 text-xs sm:text-sm px-3 py-2"
                    >
                      <DollarSign className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Vendu
                    </GhostButton>
                  )}

                  {/* Envoyer à Vinted */}
                  {(lot.status === 'ready' || lot.status === 'scheduled') && (
                    <PrimaryButton
                      onClick={() => navigate(`/lots/${id}/structure`)}
                      className="flex-1 min-w-[140px] sm:min-w-[180px] justify-center text-xs sm:text-sm px-3 py-2"
                    >
                      <Send className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                      Envoyer à Vinted
                    </PrimaryButton>
                  )}
                </div>
              </Card>
            </div>
          </div>
        </PageSection>
      </PageContainer>
    </>
  );
}
