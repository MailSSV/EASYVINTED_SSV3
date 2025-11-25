import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Package, Plus, Search, Eye, ClipboardEdit, Trash2, MoreVertical } from 'lucide-react';
import { Lot, LotStatus } from '../types/lot';
import { Article } from '../types/article';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import LotBuilder from '../components/LotBuilder';
import { useAuth } from '../contexts/AuthContext';

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

export default function LotsPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user } = useAuth();
  const [lots, setLots] = useState<Lot[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | LotStatus>('all');
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [builderOpen, setBuilderOpen] = useState(false);
  const [editingLotId, setEditingLotId] = useState<string | undefined>(undefined);
  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    lotId: string | null;
  }>({
    isOpen: false,
    lotId: null,
  });

  useEffect(() => {
    fetchLots();
  }, []);

  useEffect(() => {
    const editId = searchParams.get('edit');
    if (editId) {
      setEditingLotId(editId);
      setBuilderOpen(true);
      searchParams.delete('edit');
      setSearchParams(searchParams);
    }
  }, [searchParams]);

  const fetchLots = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('lots')
        .select(`
          *,
          lot_items (
            article_id,
            articles (
              id,
              title,
              brand,
              price,
              photos,
              size
            )
          )
        `)
        .eq('user_id', user.id)
        .neq('status', 'sold')
        .order('created_at', { ascending: false });

      if (error) throw error;

      setLots(data || []);
    } catch (error) {
      console.error('Error fetching lots:', error);
      setToast({ type: 'error', text: 'Erreur lors du chargement des lots' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.lotId) return;

    try {
      const { error } = await supabase
        .from('lots')
        .delete()
        .eq('id', deleteModal.lotId);

      if (error) throw error;

      setToast({ type: 'success', text: 'Lot supprimé avec succès' });
      fetchLots();
    } catch (error) {
      console.error('Error deleting lot:', error);
      setToast({ type: 'error', text: 'Erreur lors de la suppression du lot' });
    } finally {
      setDeleteModal({ isOpen: false, lotId: null });
    }
  };

  const filteredLots = lots.filter((lot) => {
    const matchesSearch = lot.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         lot.description?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || lot.status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const getArticleCount = (lot: any) => {
    return lot.lot_items?.length || 0;
  };

  const getFirstPhoto = (lot: any) => {
    if (lot.cover_photo) return lot.cover_photo;
    if (lot.photos && lot.photos.length > 0) return lot.photos[0];
    if (lot.lot_items && lot.lot_items.length > 0) {
      const firstArticle = lot.lot_items[0].articles;
      if (firstArticle?.photos && firstArticle.photos.length > 0) {
        return firstArticle.photos[0];
      }
    }
    return null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
<div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8 pt-0">
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
                <Package className="w-5 h-5 text-white" />
              </div>
              Mes lots
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Créez des packs d'articles pour des ventes groupées
            </p>
          </div>

          <Button
            onClick={() => setBuilderOpen(true)}
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Créer un lot
          </Button>
        </div>

        <div className="mb-5 space-y-3">
          <div className="relative max-w-2xl w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher un lot..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm transition-all hover:shadow"
            />
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-0.5 h-3 bg-gradient-to-b from-emerald-500 to-emerald-600 rounded-full"></div>
              <h3 className="text-xs font-semibold text-gray-900">Statut</h3>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
              <button
                onClick={() => setStatusFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                  statusFilter === 'all'
                    ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm scale-[1.02]'
                    : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                }`}
              >
                Tous
              </button>
              {(['draft', 'ready', 'scheduled', 'published', 'sold'] as LotStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={() => setStatusFilter(status)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                    statusFilter === status
                      ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm scale-[1.02]'
                      : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  {STATUS_LABELS[status]}
                </button>
              ))}
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
          </div>
        ) : filteredLots.length === 0 ? (
          <div className="text-center py-20">
            <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun lot</h3>
            <p className="text-sm text-gray-500 mb-6">Créez votre premier lot pour vendre plusieurs articles ensemble</p>
            <Button onClick={() => setBuilderOpen(true)} className="inline-flex items-center gap-2">
              <Plus className="w-4 h-4" />
              Créer un lot
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredLots.map((lot: any) => {
              const photo = getFirstPhoto(lot);
              const articleCount = getArticleCount(lot);

              return (
                <div
                  key={lot.id}
                  className="bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:scale-[1.02] cursor-pointer"
                  onClick={() => navigate(`/lots/${lot.id}/preview`)}
                >
                  <div className="aspect-video bg-gradient-to-br from-gray-50 to-gray-100 relative overflow-hidden">
                    {photo ? (
                      <img
                        src={photo}
                        alt={lot.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <Package className="w-16 h-16 text-gray-300" />
                      </div>
                    )}
                    <div className="absolute top-3 right-3">
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[lot.status]}`}>
                        {STATUS_LABELS[lot.status]}
                      </span>
                    </div>
                    <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-sm px-3 py-1 rounded-full">
                      <span className="text-white text-xs font-medium">{articleCount} articles</span>
                    </div>
                  </div>

                  <div className="p-5">
                    <h3 className="text-lg font-bold text-gray-900 mb-2 truncate">{lot.name}</h3>
                    {lot.description && (
                      <p className="text-sm text-gray-600 mb-3 line-clamp-2">{lot.description}</p>
                    )}

                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm text-gray-500 mb-1">Prix du lot</p>
                        <p className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                          {lot.price.toFixed(0)}€
                        </p>
                      </div>

                      {lot.discount_percentage > 0 && (
                        <div className="text-right">
                          <p className="text-sm text-gray-500 mb-1">Remise</p>
                          <p className="text-lg font-bold text-emerald-600">
                            -{lot.discount_percentage}%
                          </p>
                        </div>
                      )}
                    </div>

                    <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-xs text-gray-500">
                        Valeur totale: {lot.original_total_price.toFixed(0)}€
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setDeleteModal({ isOpen: true, lotId: lot.id });
                        }}
                        className="p-2 hover:bg-red-50 rounded-lg text-gray-400 hover:text-red-600 transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <LotBuilder
        isOpen={builderOpen}
        onClose={() => {
          setBuilderOpen(false);
          setEditingLotId(undefined);
        }}
        onSuccess={() => {
          fetchLots();
          setToast({ type: 'success', text: editingLotId ? 'Lot modifié avec succès' : 'Lot créé avec succès' });
          setEditingLotId(undefined);
        }}
        existingLotId={editingLotId}
      />

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, lotId: null })}
        onConfirm={handleDelete}
        title="Supprimer le lot"
        message="Êtes-vous sûr de vouloir supprimer ce lot ? Les articles ne seront pas supprimés."
        confirmText="Supprimer"
        type="danger"
      />

      {toast && (
        <Toast
          type={toast.type}
          message={toast.text}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
