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
  TagIcon,
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

  // UI

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
          {/* Header Apple-like */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <button
                type="button"
                onClick={() => navigate('/lots')}
                className="hidden sm:inline-flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900 transition-colors"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-2 sm:mb-3">
                  <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                    <Package className="w-5 h-5" />
                  </div>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">
                      Prévisualisation du lot
                    </h1>
                    <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                      Visualisez ce lot comme une annonce complète avant de le publier.
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Pill variant={getStatusVariant(lot.status)}>
                    {STATUS_LABELS[lot.status]}
                  </Pill>
                  {lot.reference_number && (
                    <Pill variant="neutral">
                      Réf.
                      <span className="font-mono ml-1">{lot.reference_number}</span>
                    </Pill>
                  )}
                  <Pill variant="neutral">
                    {articles.length} article{articles.length > 1 ? 's' : ''}
                  </Pill>
                </div>
              </div>
            </div>
          </div>

          {/* Grille principale */}
          <div className="grid gap-5 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)] mb-6">
            {/* Photos du lot */}
            <Card className="overflow-hidden">
              {/* Photo principale */}
              <div className="aspect-[4/3] bg-slate-50 relative group">
                {selectedPhoto ? (
                  <img
                    src={selectedPhoto}
                    alt={lot.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Package className="w-20 h-20 text-slate-200" />
                  </div>
                )}

                {allPhotos.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={handlePreviousPhoto}
                      disabled={currentPhotoIndex <= 0}
                      className={`absolute left-4 top-1/2 -translate-y-1/2 bg-slate-900/70 text-white p-2 rounded-full shadow-lg transition-all ${
                        currentPhotoIndex <= 0
                          ? 'opacity-0 cursor-not-allowed'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-slate-900/90'
                      }`}
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={handleNextPhoto}
                      disabled={currentPhotoIndex === allPhotos.length - 1}
                      className={`absolute right-4 top-1/2 -translate-y-1/2 bg-slate-900/70 text-white p-2 rounded-full shadow-lg transition-all ${
                        currentPhotoIndex === allPhotos.length - 1
                          ? 'opacity-0 cursor-not-allowed'
                          : 'opacity-0 group-hover:opacity-100 hover:bg-slate-900/90'
                      }`}
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>

                    <div className="absolute bottom-4 right-4 bg-slate-900/80 text-white px-3 py-1.5 rounded-full text-xs font-medium backdrop-blur-sm">
                      {currentPhotoIndex + 1} / {allPhotos.length}
                    </div>
                  </>
                )}
              </div>

              {/* Vignettes */}
              {allPhotos.length > 1 && (
                <div className="p-4 bg-white border-t border-slate-100">
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

                  {/* Mobile scroll */}
                  <div className="sm:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                    {allPhotos.map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setSelectedPhoto(photo)}
                        className={[
                          'flex-shrink-0 w-16 h-16 rounded-xl overflow-hidden border-2 snap-center transition-all',
                          selectedPhoto === photo
                            ? 'border-emerald-500 ring-2 ring-emerald-200'
                            : 'border-slate-200',
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
              )}
            </Card>

            {/* Détails du lot */}
            <div className="space-y-4">
              {/* Infos principales + stats */}
              <Card>
                <div className="mb-5">
                  <h2 className="text-xl sm:text-2xl font-semibold text-slate-900 mb-2">
                    {lot.name}
                  </h2>
                  {lot.description && (
                    <p className="text-sm text-slate-600 leading-relaxed">
                      {lot.description}
                    </p>
                  )}
                </div>

                <div className="space-y-4">
                  {/* Prix + remise */}
                  <div className="flex items-center justify-between p-4 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-teal-50">
                    <div>
                      <p className="text-xs font-semibold text-emerald-700 uppercase tracking-wide mb-1">
                        Prix du lot
                      </p>
                      <p className="text-3xl sm:text-4xl font-semibold text-emerald-600">
                        {lot.price.toFixed(0)} €
                      </p>
                    </div>
                    {lot.discount_percentage > 0 && (
                      <div className="text-right">
                        <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-2xl shadow-sm border border-emerald-100">
                          <TrendingDown className="w-5 h-5 text-emerald-600" />
                          <span className="text-2xl font-semibold text-emerald-600">
                            -{lot.discount_percentage}%
                          </span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Nombre d'articles / valeur totale */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80">
                      <div className="flex items-center gap-2 mb-2">
                        <Package className="w-4 h-4 text-slate-600" />
                        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                          Articles
                        </p>
                      </div>
                      <p className="text-2xl font-semibold text-slate-900">
                        {articles.length}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Pièces incluses dans le lot
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl border border-slate-100 bg-slate-50/80">
                      <div className="flex items-center gap-2 mb-2">
                        <Tag className="w-4 h-4 text-slate-600" />
                        <p className="text-[11px] font-semibold text-slate-600 uppercase tracking-wide">
                          Valeur totale
                        </p>
                      </div>
                      <p className="text-2xl font-semibold text-slate-900">
                        {lot.original_total_price.toFixed(0)} €
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        Addition des articles à l&apos;unité
                      </p>
                    </div>
                  </div>
                </div>
              </Card>

              {/* Liste des articles */}
              <Card>
                <h2 className="text-sm font-semibold text-slate-900 mb-3">
                  Articles inclus ({articles.length})
                </h2>
                <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                  {articles.map((article) => (
                    <button
                      key={article.id}
                      type="button"
                      onClick={() => navigate(`/articles/${article.id}/preview`)}
                      className="w-full flex items-center gap-4 p-3 rounded-2xl border border-slate-100 bg-slate-50/80 hover:border-emerald-300 hover:bg-emerald-50/40 transition-colors text-left"
                    >
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {article.photos?.[0] ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {article.title}
                        </p>
                        <p className="text-xs text-slate-500 truncate">
                          {article.brand || 'Sans marque'}
                          {article.size && ` • Taille ${article.size}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-900">
                          {article.price.toFixed(0)} €
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </Card>

              {/* Étiquette colis */}
              <Card>
                <div className="flex items-center justify-between gap-3 mb-2">
                  <div>
                    <div className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1">
                      Étiquette de colis
                    </div>
                    <p className="text-xs text-slate-500">
                      Référence :{' '}
                      <span className="font-mono font-semibold">
                        {lot.reference_number || 'Non définie'}
                      </span>
                    </p>
                  </div>
                  <GhostButton
                    onClick={() => setLabelModalOpen(true)}
                    className="text-xs px-3 py-2"
                  >
                    <TagIcon className="w-3.5 h-3.5" />
                    Générer l&apos;étiquette
                  </GhostButton>
                </div>
              </Card>

              {/* Actions */}
              <Card>
                <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-3">
                  Actions
                </h3>
                <div className="flex flex-wrap justify-center gap-3">
                  {/* Supprimer */}
                  <GhostButton
                    onClick={() => setDeleteModalOpen(true)}
                    className="flex-1 min-w-[180px] justify-center bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                  >
                    <Trash2 className="w-4 h-4" />
                    Supprimer
                  </GhostButton>

                  {/* Modifier (sauf lot sold/published) */}
                  {lot.status !== 'sold' && lot.status !== 'published' && (
                    <GhostButton
                      onClick={() => navigate(`/lots?edit=${id}`)}
                      className="flex-1 min-w-[180px] justify-center"
                    >
                      <Edit className="w-4 h-4" />
                      Modifier
                    </GhostButton>
                  )}

                  {/* Programmer */}
                  {(lot.status === 'ready' ||
                    lot.status === 'scheduled' ||
                    lot.status === 'published') && (
                    <GhostButton
                      onClick={() => setScheduleModalOpen(true)}
                      className="flex-1 min-w-[180px] justify-center bg-slate-50 text-slate-700 border border-slate-200 hover:bg-slate-100"
                    >
                      <Calendar className="w-4 h-4" />
                      Programmer
                    </GhostButton>
                  )}

                  {/* Marquer vendu */}
                  {(lot.status === 'ready' ||
                    lot.status === 'scheduled' ||
                    lot.status === 'published') && (
                    <GhostButton
                      onClick={() => setSoldModalOpen(true)}
                      className="flex-1 min-w-[180px] justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <DollarSign className="w-4 h-4" />
                      Marquer vendu
                    </GhostButton>
                  )}

                  {/* Envoyer à Vinted (placeholder) */}
                  {(lot.status === 'ready' || lot.status === 'scheduled') && (
                    <PrimaryButton
                      onClick={() =>
                        setToast({
                          type: 'error',
                          text: 'Publication des lots bientôt disponible',
                        })
                      }
                      className="flex-1 min-w-[180px] justify-center"
                    >
                      <Send className="w-4 h-4" />
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
