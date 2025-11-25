import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Package, Calendar, Tag, TrendingDown, ChevronRight, TagIcon, Trash2, Edit, DollarSign, Send } from 'lucide-react';
import { Lot, LotStatus } from '../types/lot';
import { Article } from '../types/article';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';
import { LabelModal } from '../components/LabelModal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';

const STATUS_LABELS: Record<LotStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  scheduled: 'Planifié',
  published: 'Publié',
  sold: 'Vendu',
};

const STATUS_COLORS: Record<LotStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ready: 'bg-blue-100 text-blue-700',
  scheduled: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  published: 'bg-purple-100 text-purple-700',
  sold: 'bg-green-100 text-green-700',
};

export default function LotPreviewPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [lot, setLot] = useState<any>(null);
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPhoto, setSelectedPhoto] = useState<string>('');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
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
      const { data: { user } } = await supabase.auth.getUser();
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
        .select(`
          articles (
            id,
            title,
            brand,
            price,
            photos,
            size,
            description
          )
        `)
        .eq('lot_id', id);

      if (itemsError) throw itemsError;

      const articlesList = itemsData.map(item => item.articles).filter(Boolean);

      setLot(lotData);
      setArticles(articlesList as Article[]);
      setSelectedPhoto(lotData.cover_photo || lotData.photos?.[0] || articlesList[0]?.photos?.[0] || '');
    } catch (error) {
      console.error('Error fetching lot:', error);
      setToast({ type: 'error', text: 'Erreur lors du chargement du lot' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    try {
      const { error } = await supabase
        .from('lots')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot supprimé avec succès' });
      setTimeout(() => navigate('/lots'), 1500);
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
          status: 'scheduled'
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
          published_at: saleData.soldAt
        })
        .eq('id', id);

      if (error) throw error;

      const articleIds = articles.map(a => a.id);
      const pricePerArticle = saleData.soldPrice / articleIds.length;
      const feesPerArticle = saleData.fees / articleIds.length;
      const shippingPerArticle = saleData.shippingCost / articleIds.length;

      const { error: articlesError } = await supabase
        .from('articles')
        .update({
          status: 'sold',
          sold_date: saleData.soldAt,
          sold_price: pricePerArticle,
          platform: saleData.platform,
          fees: feesPerArticle,
          shipping_cost: shippingPerArticle,
          buyer_name: saleData.buyerName,
          sale_notes: saleData.notes
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
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!lot) {
    return (
     <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-0">

        <div className="text-center">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lot introuvable</h2>
          <Button onClick={() => navigate(-1)}>Retour</Button>
        </div>
      </div>
    );
  }

  const allPhotos = articles.map(a => a.photos?.[0]).filter(Boolean);
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
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <button
          onClick={() => navigate('/lots')}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4 relative group">
              <div className="aspect-square bg-gray-100 flex items-center justify-center">
                {selectedPhoto ? (
                  <img
                    src={selectedPhoto}
                    alt={lot.name}
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <Package className="w-32 h-32 text-gray-300" />
                )}
              </div>

              {allPhotos.length > 1 && (
                <>
                  <button
                    onClick={handlePreviousPhoto}
                    disabled={currentPhotoIndex === 0}
                    className={`absolute left-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg transition-all ${
                      currentPhotoIndex === 0
                        ? 'opacity-0 cursor-not-allowed'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110'
                    }`}
                  >
                    <ChevronLeft className="w-6 h-6 text-gray-700" />
                  </button>

                  <button
                    onClick={handleNextPhoto}
                    disabled={currentPhotoIndex === allPhotos.length - 1}
                    className={`absolute right-2 top-1/2 -translate-y-1/2 bg-white/90 backdrop-blur-sm p-2 rounded-full shadow-lg transition-all ${
                      currentPhotoIndex === allPhotos.length - 1
                        ? 'opacity-0 cursor-not-allowed'
                        : 'opacity-0 group-hover:opacity-100 hover:bg-white hover:scale-110'
                    }`}
                  >
                    <ChevronRight className="w-6 h-6 text-gray-700" />
                  </button>

                  <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/50 backdrop-blur-sm text-white px-3 py-1 rounded-full text-sm font-medium">
                    {currentPhotoIndex + 1} / {allPhotos.length}
                  </div>
                </>
              )}
            </div>

            {allPhotos.length > 1 && (
              <div className="hidden sm:grid grid-cols-5 gap-2">
                {allPhotos.slice(0, 10).map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhoto(photo)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                      selectedPhoto === photo
                        ? 'border-emerald-500 ring-2 ring-emerald-200'
                        : 'border-gray-200 hover:border-emerald-300'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}

            {allPhotos.length > 1 && (
              <div className="sm:hidden flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 snap-x snap-mandatory scrollbar-hide">
                {allPhotos.map((photo, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedPhoto(photo)}
                    className={`flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition-all snap-center ${
                      selectedPhoto === photo
                        ? 'border-emerald-500 ring-2 ring-emerald-200'
                        : 'border-gray-200'
                    }`}
                  >
                    <img src={photo} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <div className="flex items-start justify-between mb-4">
                <h1 className="text-3xl font-bold text-gray-900">{lot.name}</h1>
                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lot.status]}`}>
                  {STATUS_LABELS[lot.status]}
                </span>
              </div>

              {lot.description && (
                <p className="text-gray-600 mb-6">{lot.description}</p>
              )}

              <div className="space-y-4 mb-6">
                <div className="flex items-center justify-between p-4 bg-gradient-to-br from-emerald-50 to-green-50 rounded-xl border border-emerald-200">
                  <div>
                    <p className="text-sm text-emerald-700 mb-1">Prix du lot</p>
                    <p className="text-4xl font-bold text-emerald-600">{lot.price.toFixed(0)}€</p>
                  </div>
                  {lot.discount_percentage > 0 && (
                    <div className="text-right">
                      <div className="inline-flex items-center gap-2 bg-white px-4 py-2 rounded-lg shadow-sm">
                        <TrendingDown className="w-5 h-5 text-emerald-600" />
                        <span className="text-2xl font-bold text-emerald-600">
                          -{lot.discount_percentage}%
                        </span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Package className="w-4 h-4 text-gray-600" />
                      <p className="text-xs text-gray-600">Articles</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{articles.length}</p>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-2 mb-2">
                      <Tag className="w-4 h-4 text-gray-600" />
                      <p className="text-xs text-gray-600">Valeur totale</p>
                    </div>
                    <p className="text-2xl font-bold text-gray-900">{lot.original_total_price.toFixed(0)}€</p>
                  </div>
                </div>
              </div>

              <div className="space-y-3">
                <Button className="w-full" onClick={() => navigate(`/lots?edit=${id}`)}>
                  Modifier le lot
                </Button>
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6 mb-6">
              <h2 className="text-lg font-bold text-gray-900 mb-4">Articles inclus ({articles.length})</h2>
              <div className="space-y-3 max-h-96 overflow-y-auto">
                {articles.map((article) => (
                  <div
                    key={article.id}
                    className="flex items-center gap-4 p-3 bg-gray-50 rounded-xl border border-gray-200 hover:border-emerald-300 transition-colors cursor-pointer"
                    onClick={() => navigate(`/articles/${article.id}/preview`)}
                  >
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                      {article.photos?.[0] ? (
                        <img src={article.photos[0]} alt={article.title} className="w-full h-full object-cover" />
                      ) : (
                        <Package className="w-8 h-8 text-gray-300 m-auto mt-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{article.title}</p>
                      <p className="text-xs text-gray-500 truncate">{article.brand || 'Sans marque'}</p>
                      {article.size && (
                        <p className="text-xs text-gray-500 mt-1">Taille: {article.size}</p>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-gray-900">{article.price.toFixed(0)}€</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Étiquette de colis</h3>
              <button
                onClick={() => setLabelModalOpen(true)}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white border-2 border-gray-300 rounded-lg hover:border-emerald-500 hover:bg-emerald-50 transition-all group"
              >
                <TagIcon className="w-5 h-5 text-gray-600 group-hover:text-emerald-600" />
                <span className="font-medium text-gray-700 group-hover:text-emerald-700">Générer l'étiquette</span>
              </button>
              <p className="text-xs text-gray-500 mt-2 text-center">
                Référence: {lot.reference_number || 'Non définie'}
              </p>
            </div>

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
              <h3 className="text-sm font-semibold text-gray-700 mb-3 uppercase tracking-wide">Actions</h3>
              <div className="flex flex-col gap-3">
                <Button
                  variant="secondary"
                  onClick={() => setDeleteModalOpen(true)}
                  className="w-full bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Supprimer
                </Button>

                {lot.status !== 'sold' && lot.status !== 'published' && (
                  <Button
                    variant="secondary"
                    onClick={() => navigate(`/lots?edit=${id}`)}
                    className="w-full"
                  >
                    <Edit className="w-4 h-4 mr-2" />
                    Modifier
                  </Button>
                )}

                {(lot.status === 'ready' || lot.status === 'scheduled' || lot.status === 'published') && (
                  <Button
                    variant="secondary"
                    onClick={() => setScheduleModalOpen(true)}
                    className="w-full bg-white text-blue-700 hover:bg-blue-50 border-blue-300 hover:border-blue-400"
                  >
                    <Calendar className="w-4 h-4 mr-2" />
                    Programmer
                  </Button>
                )}

                {(lot.status === 'ready' || lot.status === 'scheduled' || lot.status === 'published') && (
                  <Button
                    variant="secondary"
                    onClick={() => setSoldModalOpen(true)}
                    className="w-full bg-white text-green-700 hover:bg-green-50 border-green-300 hover:border-green-400"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Marquer vendu
                  </Button>
                )}

                {(lot.status === 'ready' || lot.status === 'scheduled') && (
                  <Button
                    onClick={() => setToast({ type: 'error', text: 'Publication des lots bientôt disponible' })}
                    className="w-full bg-emerald-600 hover:bg-emerald-700"
                  >
                    <Send className="w-4 h-4 mr-2" />
                    Envoyer à Vinted
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

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
            price: lot.price
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
          lotArticles={articles.map(a => ({
            title: a.title,
            brand: a.brand
          }))}
        />
      )}
    </div>
  );
}
