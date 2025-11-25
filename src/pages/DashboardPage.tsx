import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, ClipboardEdit, MoreVertical, Plus, Image as ImageIcon, Search, Copy, Trash2, DollarSign, Calendar, Clock, CheckCircle2, FileText, Send, Flower2, Sun, Leaf, Snowflake, CloudSun, ClipboardList, Upload } from 'lucide-react';
import { Article, ArticleStatus, Season } from '../types/article';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
import { Toast } from '../components/ui/Toast';
import { useAuth } from '../contexts/AuthContext';

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  scheduled: 'Planifié',
  published: 'Publié',
  sold: 'Vendu',
};

const STATUS_COLORS: Record<ArticleStatus, string> = {
  draft: 'bg-gray-100 text-gray-700',
  ready: 'bg-blue-100 text-blue-700',
 scheduled: 'bg-yellow-50 text-yellow-700 border border-yellow-200',
  published: 'bg-purple-100 text-purple-700',
  sold: 'bg-green-100 text-green-700',
};

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
  'all-seasons': 'Toutes saisons',
  undefined: 'Non défini',
};

export function DashboardPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | ArticleStatus>('all');
  const [sellerFilter, setSellerFilter] = useState<string>('all');
  const [articles, setArticles] = useState<Article[]>([]);
  const [familyMembers, setFamilyMembers] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'error' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'error',
  });

  const [deleteModal, setDeleteModal] = useState<{
    isOpen: boolean;
    articleId: string | null;
  }>({
    isOpen: false,
    articleId: null,
  });

  const [scheduleModal, setScheduleModal] = useState<{
    isOpen: boolean;
    article: Article | null;
  }>({
    isOpen: false,
    article: null,
  });

  const [statusModal, setStatusModal] = useState<{
    isOpen: boolean;
    article: Article | null;
  }>({
    isOpen: false,
    article: null,
  });

  const [soldModal, setSoldModal] = useState<{
    isOpen: boolean;
    article: Article | null;
  }>({
    isOpen: false,
    article: null,
  });


  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchArticles();
    fetchFamilyMembers();
  }, [user]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        desktopMenuRef.current &&
        !desktopMenuRef.current.contains(event.target as Node)
      ) {
        setOpenMenuId(null);
      }
    }

    if (openMenuId) {
      document.addEventListener('mousedown', handleClickOutside);
    } else {
      document.removeEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openMenuId]);

  const fetchArticles = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      setArticles(
        (data || []).map((article) => ({
          ...article,
          price: parseFloat(article.price),
          season: (article.season === 'all_seasons' ? 'all-seasons' : article.season) as Season,
        }))
      );
    } catch (error) {
      console.error('Error fetching articles:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors du chargement des articles',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchFamilyMembers = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;

      setFamilyMembers(data || []);
    } catch (error) {
      console.error('Error fetching family members:', error);
    }
  };

  const filteredArticles = articles.filter((article) => {
    const matchesStatus =
      statusFilter === 'all' ? true : article.status === statusFilter;
    const matchesSeller =
      sellerFilter === 'all' ? true : article.seller_id === sellerFilter;
    const query = searchQuery.toLowerCase();

    const matchesQuery =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.brand?.toLowerCase().includes(query) ||
      article.description?.toLowerCase().includes(query);

    const isNotSold = article.status !== 'sold';

    return matchesStatus && matchesSeller && matchesQuery && isNotSold;
  });

  const formatDate = (date?: string) => {
    if (!date) return 'Non planifié';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const renderStatusIcon = (status: ArticleStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-3.5 h-3.5" />;
      case 'ready':
        return <CheckCircle2 className="w-3.5 h-3.5" />;
      case 'scheduled':
        return <Clock className="w-3.5 h-3.5" />;
      case 'published':
        return <Send className="w-3.5 h-3.5" />;
      case 'sold':
        return <DollarSign className="w-3.5 h-3.5" />;
      default:
        return null;
    }
  };

  const renderSeasonIcon = (season?: Season, size: 'sm' | 'md' = 'md') => {
    const sizeClass = size === 'sm' ? 'w-4 h-4' : 'w-5 h-5';

    switch (season) {
      case 'spring':
        return <Flower2 className={`${sizeClass} text-pink-500`} title="Printemps" />;
      case 'summer':
        return <Sun className={`${sizeClass} text-orange-500`} title="Été" />;
      case 'autumn':
        return <Leaf className={`${sizeClass} text-amber-600`} title="Automne" />;
      case 'winter':
        return <Snowflake className={`${sizeClass} text-blue-500`} title="Hiver" />;
      case 'all-seasons':
        return <CloudSun className={`${sizeClass} text-gray-600`} title="Toutes saisons" />;
      default:
        return <CloudSun className={`${sizeClass} text-gray-400`} title="Non défini" />;
    }
  };

  const handleDuplicate = async (article: Article) => {
    try {
      const { id, created_at, updated_at, reference_number, ...rest } = article;

      const { error } = await supabase
        .from('articles')
        .insert([
          {
            ...rest,
            status: 'draft',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          },
        ]);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article dupliqué avec succès',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error duplicating article:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la duplication de l\'article',
      });
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.articleId || !user) return;

    try {
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('photos')
        .eq('id', deleteModal.articleId)
        .maybeSingle();

      if (fetchError) throw fetchError;

      if (article?.photos && article.photos.length > 0) {
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
        const folderPath = `${user.id}/${deleteModal.articleId}`;
        const { data: folderContents } = await supabase.storage
          .from('article-photos')
          .list(folderPath);

        if (folderContents && folderContents.length > 0) {
          const filesToDelete = folderContents.map(file => `${folderPath}/${file.name}`);
          await supabase.storage.from('article-photos').remove(filesToDelete);
        }
      } catch (folderError) {
        console.log('No folder to clean up or error cleaning folder:', folderError);
      }

      const { error } = await supabase
        .from('articles')
        .delete()
        .eq('id', deleteModal.articleId);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article supprimé avec succès',
      });
      setDeleteModal({ isOpen: false, articleId: null });
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la suppression de l\'article',
      });
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
    if (!soldModal.article) return;

    try {
      const netProfit = saleData.soldPrice -
        saleData.fees -
        saleData.shippingCost;

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
        .eq('id', soldModal.article.id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme vendu',
      });
      setSoldModal({ isOpen: false, article: null });
      fetchArticles();
    } catch (error) {
      console.error('Error marking article as sold:', error);
      setToast({
        type: 'error',
        text: "Erreur lors de la mise à jour de l'article",
      });
    }
  };

  const handlePlanification = (article: Article) => {
    setScheduleModal({
      isOpen: true,
      article,
    });
    setOpenMenuId(null);
  };

  const handleMarkReady = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          status: 'ready',
          updated_at: new Date().toISOString(),
        })
        .eq('id', article.id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme prêt',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error marking article as ready:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour de l\'article',
      });
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleMarkPublished = async (article: Article) => {
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', article.id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme publié',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error marking article as published:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour de l\'article',
      });
    } finally {
      setOpenMenuId(null);
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
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
      />

      <div>
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mon stock
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              Gérez vos articles, préparez-les pour Vinted et suivez leur
              statut.
            </p>
          </div>

          <Button
            onClick={() => navigate('/articles/new')}
            className="inline-flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            Nouvel article
          </Button>
        </div>

        <div className="mb-5 space-y-3">
          <div className="relative max-w-2xl w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, marque, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-3 py-2.5 text-sm border border-gray-200 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent bg-white shadow-sm transition-all hover:shadow"
            />
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-3 border border-gray-100 shadow-sm">
            <div className="space-y-3">
              <div>
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
                  {(
                    ['draft', 'ready', 'scheduled', 'published'] as ArticleStatus[]
                  ).map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 flex items-center gap-1.5 transition-all ${
                        statusFilter === status
                          ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white shadow-sm scale-[1.02]'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                      }`}
                    >
                      {renderStatusIcon(status)}
                      {STATUS_LABELS[status]}
                    </button>
                  ))}
                </div>
              </div>

              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-0.5 h-3 bg-gradient-to-b from-blue-500 to-blue-600 rounded-full"></div>
                  <h3 className="text-xs font-semibold text-gray-900">Vendeur</h3>
                </div>
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-hide -mx-0.5 px-0.5">
                  <button
                    onClick={() => setSellerFilter('all')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      sellerFilter === 'all'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm scale-[1.02]'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    Tous
                  </button>
                  {familyMembers.map((member) => (
                    <button
                      key={member.id}
                      onClick={() => setSellerFilter(member.id)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                        sellerFilter === member.id
                          ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm scale-[1.02]'
                          : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                      }`}
                    >
                      {member.name}
                    </button>
                  ))}
                  <button
                    onClick={() => setSellerFilter('none')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex-shrink-0 transition-all ${
                      sellerFilter === 'none'
                        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-sm scale-[1.02]'
                        : 'bg-white text-gray-600 border border-gray-200 hover:border-blue-300 hover:bg-blue-50'
                    }`}
                  >
                    Pfff?!
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="block md:hidden">
          {loading ? (
            <div className="px-4 py-12 text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="px-4 py-12 text-center">
              <div className="max-w-sm mx-auto">
                <ImageIcon className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                <p className="text-base font-medium text-gray-900 mb-1">Aucun article</p>
                <p className="text-sm text-gray-500">Commencez par créer votre premier article</p>
              </div>
            </div>
          ) : (
            <div className="space-y-2 px-0.5">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                  onClick={() => navigate(`/articles/${article.id}/preview`)}
                >
                  <div className="flex gap-4 p-4">
                    <div
                      className="relative w-28 h-28 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 ring-1 ring-gray-200/50"
                    >
                      {article.photos && article.photos.length > 0 ? (
                        <img
                          src={article.photos[0]}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-10 h-10 text-gray-300" />
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 truncate mb-1 group-hover:text-emerald-600 transition-colors">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-500 truncate mb-2">
                          {article.brand || 'Sans marque'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div className="text-xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                          {article.price.toFixed(0)}€
                        </div>
                        <div className="flex items-center gap-1.5">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-gray-50 border border-gray-200/50">
                            {renderSeasonIcon(article.season, 'sm')}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="px-4 pb-3 pt-2 flex items-center justify-between gap-3">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setStatusModal({ isOpen: true, article });
                      }}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium transition-all hover:shadow-md active:scale-95 ${STATUS_COLORS[article.status]}`}
                    >
                      {renderStatusIcon(article.status)}
                      {STATUS_LABELS[article.status]}
                    </button>

                    <div className="flex items-center gap-1">
                      {(article.status === 'ready' || article.status === 'scheduled') && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/articles/${article.id}/structure`);
                          }}
                          className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-all active:scale-90"
                          title="Envoyer à Vinted"
                        >
                          <Upload className="w-4 h-4" />
                        </button>
                      )}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/articles/${article.id}/edit`);
                        }}
                        className="p-2 rounded-xl hover:bg-gray-100 text-gray-500 hover:text-emerald-600 transition-all active:scale-90"
                        title="Modifier"
                      >
                        <ClipboardEdit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {article.status === 'scheduled' && article.scheduled_for && (
                    <div className="mx-4 mb-3 px-3 py-2 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/50 rounded-xl flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-yellow-800">
                        <Clock className="w-3.5 h-3.5" />
                        <span className="font-medium">Planifié</span>
                      </div>
                      <span className="text-xs font-semibold text-yellow-900">
                        {formatDate(article.scheduled_for)}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
          <div className="overflow-x-auto overflow-y-visible min-h-[600px]">
            <table className="min-w-full">
            <thead>
              <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-200/50">
                <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  Article
                </th>
                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  Détails
                </th>
                <th className="px-4 py-3.5 text-center text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  Saison
                </th>
                 <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  Statut
                </th>

                <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                  Planif.
                </th>

                <th className="px-6 py-3.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-100">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center"
                  >
                    <div className="inline-block animate-spin rounded-full h-10 w-10 border-b-2 border-gray-900"></div>
                  </td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-6 py-16 text-center"
                  >
                    <div className="max-w-sm mx-auto">
                      <ImageIcon className="w-20 h-20 text-gray-300 mx-auto mb-4" />
                      <p className="text-lg font-medium text-gray-900 mb-2">Aucun article</p>
                      <p className="text-sm text-gray-500">Commencez par créer votre premier article</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article) => (
                  <tr
                    key={article.id}
                    className="group hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent cursor-pointer transition-all duration-200"
                    onClick={() => navigate(`/articles/${article.id}/preview`)}
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-4">
                        <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center ring-1 ring-gray-200/50 group-hover:ring-emerald-300 transition-all">
                          {article.photos && article.photos.length > 0 ? (
                            <img
                              src={article.photos[0]}
                              alt={article.title}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <ImageIcon className="w-7 h-7 text-gray-300" />
                          )}
                          <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <div className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors mb-1">
                          {article.title}
                        </div>
                        <div className="text-xs text-gray-500 truncate mb-1">
                          {article.brand || 'Sans marque'}
                        </div>
                        <div className="flex items-center gap-2 mt-1.5">
                          <span className="text-base font-bold bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent">
                            {article.price.toFixed(0)}€
                          </span>
                          <span className="text-[10px] text-gray-400">
                            • {formatDate(article.created_at)}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        <div className="w-9 h-9 rounded-xl bg-gray-50 border border-gray-200/50 flex items-center justify-center group-hover:border-emerald-300 transition-all">
                          {renderSeasonIcon(article.season, 'sm')}
                        </div>
                      </div>
                    </td>

  <td className="px-4 py-4 whitespace-nowrap">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setStatusModal({ isOpen: true, article });
                        }}
                        className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[11px] font-medium transition-all hover:shadow-lg hover:scale-105 active:scale-95 ${STATUS_COLORS[article.status]}`}
                      >
                        {renderStatusIcon(article.status)}
                        {STATUS_LABELS[article.status]}
                      </button>
                    </td>

                    <td className="px-4 py-4 whitespace-nowrap">
                      {article.status === 'scheduled' && article.scheduled_for ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-yellow-50 to-amber-50 border border-yellow-200/50 rounded-lg">
                          <Clock className="w-3 h-3 text-yellow-700" />
                          <span className="text-[11px] font-medium text-yellow-900">
                            {formatDate(article.scheduled_for)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-[11px] text-gray-400 font-medium">Non planifié</span>
                      )}
                    </td>

                    <td className="px-6 py-4 whitespace-nowrap relative">
                      <div className="flex items-center justify-end gap-1">
                        {(article.status === 'ready' || article.status === 'scheduled') && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/articles/${article.id}/structure`);
                            }}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                            title="Envoyer à Vinted"
                          >
                            <Upload className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/articles/${article.id}/edit`);
                          }}
                          className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                          title="Modifier"
                        >
                          <ClipboardEdit className="w-4 h-4" />
                        </button>
                        <div
                          className="relative"
                          ref={openMenuId === article.id ? desktopMenuRef : null}
                        >
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenMenuId(
                                openMenuId === article.id ? null : article.id
                              );
                            }}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                            title="Plus d'actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === article.id && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-xl shadow-2xl border border-gray-200/50 py-2 z-[9999] backdrop-blur-sm">
                              <button
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(article);
                                }}
                              >
                                <Copy className="w-4 h-4" />
                                <span className="font-medium">Dupliquer</span>
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlanification(article);
                                }}
                              >
                                <Calendar className="w-4 h-4" />
                                <span className="font-medium">Programmer</span>
                              </button>
                              {article.status !== 'ready' && (
                                <button
                                  className="w-full text-left px-4 py-2.5 text-sm text-gray-700 hover:bg-gradient-to-r hover:from-gray-50 hover:to-gray-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkReady(article);
                                  }}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  <span className="font-medium">Marquer comme prêt</span>
                                </button>
                              )}
                              <div className="h-px bg-gray-200 my-1.5 mx-2"></div>
                              <button
                                className="w-full text-left px-4 py-2.5 text-sm text-emerald-600 hover:bg-gradient-to-r hover:from-emerald-50 hover:to-emerald-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSoldModal({ isOpen: true, article });
                                }}
                              >
                                <DollarSign className="w-4 h-4" />
                                <span className="font-medium">Marquer vendu</span>
                              </button>
                              <button
                                className="w-full text-left px-4 py-2.5 text-sm text-red-600 hover:bg-gradient-to-r hover:from-red-50 hover:to-red-100 flex items-center gap-3 rounded-lg transition-all mx-1"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({
                                    isOpen: true,
                                    articleId: article.id,
                                  });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                <span className="font-medium">Supprimer</span>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          </div>
        </div>

        <ConfirmModal
          isOpen={deleteModal.isOpen}
          onClose={() => setDeleteModal({ isOpen: false, articleId: null })}
          onConfirm={handleDelete}
          title="Supprimer l'article"
          message="Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible."
          confirmLabel="Supprimer"
          variant="danger"
        />

        {scheduleModal.article && (
          <ScheduleModal
            isOpen={scheduleModal.isOpen}
            onClose={() => setScheduleModal({ isOpen: false, article: null })}
            article={scheduleModal.article}
            onScheduled={fetchArticles}
          />
        )}

        {soldModal.article && (
          <ArticleSoldModal
            isOpen={soldModal.isOpen}
            onClose={() => setSoldModal({ isOpen: false, article: null })}
            onConfirm={handleMarkAsSold}
            article={soldModal.article}
          />
        )}

        {statusModal.article && (
          <Modal
            isOpen={statusModal.isOpen}
            onClose={() => setStatusModal({ isOpen: false, article: null })}
            title="Changer le statut"
          >
            <div className="space-y-2">
              {(['draft', 'ready', 'scheduled', 'published', 'sold'] as ArticleStatus[]).map((status) => (
                <button
                  key={status}
                  onClick={async () => {
                    try {
                      if (status === 'sold') {
                        setStatusModal({ isOpen: false, article: null });
                        setSoldModal({ isOpen: true, article: statusModal.article });
                        return;
                      }

                      const updateData: any = { status };

                      if (status === 'published' && !statusModal.article?.published_at) {
                        updateData.published_at = new Date().toISOString();
                      }

                      const { error } = await supabase
                        .from('articles')
                        .update(updateData)
                        .eq('id', statusModal.article!.id);

                      if (error) throw error;

                      setToast({
                        type: 'success',
                        text: `Statut changé en "${STATUS_LABELS[status]}"`,
                      });
                      fetchArticles();
                      setStatusModal({ isOpen: false, article: null });
                    } catch (error) {
                      console.error('Error updating status:', error);
                      setToast({
                        type: 'error',
                        text: 'Erreur lors du changement de statut',
                      });
                    }
                  }}
                  disabled={statusModal.article?.status === status}
                  className={`w-full text-left px-4 py-3 rounded-lg border transition-all flex items-center gap-3 ${
                    statusModal.article?.status === status
                      ? 'bg-gray-50 border-gray-300 cursor-not-allowed opacity-60'
                      : 'bg-white border-gray-200 hover:border-emerald-300 hover:bg-emerald-50'
                  }`}
                >
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[status]}`}>
                    {renderStatusIcon(status)}
                    {STATUS_LABELS[status]}
                  </span>
                  {statusModal.article?.status === status && (
                    <span className="ml-auto text-xs text-gray-500">(Actuel)</span>
                  )}
                </button>
              ))}
            </div>
          </Modal>
        )}

      </div>
    </>
  );
}

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}
