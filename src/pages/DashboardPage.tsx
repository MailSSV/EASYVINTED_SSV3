import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Eye,
  Edit,
  MoreVertical,
  Plus,
  Image as ImageIcon,
  Search,
  Copy,
  Trash2,
  DollarSign,
  Calendar,
  Clock,
  CheckCircle2,
  FileText,
  Send,
  Flower2,
  Sun,
  Leaf,
  Snowflake,
  CloudSun,
} from 'lucide-react';
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
  const [articles, setArticles] = useState<Article[]>([]);
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

  const filteredArticles = articles.filter((article) => {
    const matchesStatus =
      statusFilter === 'all' ? true : article.status === statusFilter;
    const query = searchQuery.toLowerCase();

    const matchesQuery =
      !query ||
      article.title.toLowerCase().includes(query) ||
      article.brand?.toLowerCase().includes(query) ||
      article.description?.toLowerCase().includes(query);

    return matchesStatus && matchesQuery;
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
        return <FileText className="w-3 h-3 mr-1" />;
      case 'ready':
        return <CheckCircle2 className="w-3 h-3 mr-1" />;
      case 'scheduled':
        return <Clock className="w-3 h-3 mr-1" />;
      case 'published':
        return <Send className="w-3 h-3 mr-1" />;
      case 'sold':
        return <DollarSign className="w-3 h-3 mr-1" />;
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
      const { id, created_at, updated_at, ...rest } = article;

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
        text: 'Erreur lors de la duplication de l’article',
      });
    } finally {
      setOpenMenuId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.articleId) return;

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
      // Calculate net profit
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
        text: 'Erreur lors de la mise à jour de l’article',
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
        text: 'Erreur lors de la mise à jour de l’article',
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
        {/* Header */}
        <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              Mes articles
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

        {/* Filtres */}
        <div className="mb-4 flex flex-col md:flex-row gap-3 md:items-center md:justify-between">
          <div className="relative max-w-md w-full">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Rechercher par titre, marque, description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-hide -mx-4 px-4 md:mx-0 md:px-0">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 ${
                statusFilter === 'all'
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white text-gray-600 border-gray-200'
              }`}
            >
              Tous
            </button>
            {(
              ['draft', 'ready', 'scheduled', 'published', 'sold'] as ArticleStatus[]
            ).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium border whitespace-nowrap flex-shrink-0 flex items-center gap-1 ${
                  statusFilter === status
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-white text-gray-600 border-gray-200'
                }`}
              >
                {renderStatusIcon(status)}
                {STATUS_LABELS[status]}
              </button>
            ))}
          </div>
        </div>

        {/* LISTE MOBILE */}
        <div className="block md:hidden bg-gray-50">
          {loading ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Chargement...
            </div>
          ) : filteredArticles.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              Aucun article trouvé
            </div>
          ) : (
            <div className="space-y-3">
              {filteredArticles.map((article) => (
                <div
                  key={article.id}
                  className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden"
                >
                  {/* Image et titre */}
                  <div className="flex gap-3 p-3">
                    <div
                      className="w-24 h-24 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 cursor-pointer"
                      onClick={() => navigate(`/articles/${article.id}/preview`)}
                    >
                      {article.photos && article.photos.length > 0 ? (
                        <img
                          src={article.photos[0]}
                          alt={article.title}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between">
                      {/* Titre et marque */}
                      <div>
                        <h3 className="text-base font-semibold text-gray-900 truncate mb-1">
                          {article.title}
                        </h3>
                        <p className="text-sm text-gray-500 truncate">
                          {article.brand || 'Non spécifié'}
                        </p>
                      </div>

                      {/* Prix */}
                      <div className="text-lg font-bold text-emerald-600">
                        {article.price.toFixed(0)}€
                      </div>
                    </div>
                  </div>

                  {/* Métadonnées */}
                  <div className="px-3 py-2 bg-gray-50 flex items-center justify-between gap-3 border-t border-gray-100">
                    <div className="flex items-center gap-2">
                      {/* Saison */}
                      <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-white border border-gray-200">
                        {renderSeasonIcon(article.season, 'sm')}
                      </span>

                      {/* Statut */}
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[article.status]}`}
                      >
                        {renderStatusIcon(article.status)}
                        {STATUS_LABELS[article.status]}
                      </span>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/articles/${article.id}/preview`);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Voir"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/articles/${article.id}/edit`);
                        }}
                        className="p-2 rounded-lg hover:bg-gray-100 text-gray-600 transition-colors"
                        title="Modifier"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Planification si présente */}
                  {article.status === 'scheduled' && article.scheduled_for && (
                    <div className="px-3 py-2 bg-yellow-50 border-t border-yellow-100 flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs text-yellow-800">
                        <Clock className="w-4 h-4" />
                        <span className="font-medium">Planifié pour le</span>
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

        {/* TABLEAU DESKTOP */}
        <div className="hidden md:block bg-white rounded-xl shadow-sm border border-gray-200">
          <div className="overflow-x-auto overflow-y-visible">
            <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Photo
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Titre
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Saison
                </th>
                 <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Statut
                </th>
                
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Planification
                </th>
        
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-600 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Chargement...
                  </td>
                </tr>
              ) : filteredArticles.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-8 text-center text-sm text-gray-500"
                  >
                    Aucun article trouvé
                  </td>
                </tr>
              ) : (
                filteredArticles.map((article) => (
                  <tr
                    key={article.id}
                    className="hover:bg-gray-50 cursor-pointer"
                    onDoubleClick={() =>
                      navigate(`/articles/${article.id}/preview`)
                    }
                  >
                    <td className="px-4 py-3">
                      <div className="w-16 h-16 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center">
                        {article.photos && article.photos.length > 0 ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageIcon className="w-6 h-6 text-gray-400" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium text-gray-900 truncate">
                        {article.title}
                      </div>
                      <div className="text-xs text-gray-500 truncate">
                        {article.brand} • {article.price.toFixed(0)}€
                      </div>
                      <div className="text-xs text-gray-400 mt-0.5">
                        Créé le {formatDate(article.created_at)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center justify-center">
                        {renderSeasonIcon(article.season)}
                      </div>
                    </td>

  <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-medium ${STATUS_COLORS[article.status]}`}
                      >
                        {renderStatusIcon(article.status)}
                        {STATUS_LABELS[article.status]}
                      </span>
                    </td>
                    
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="text-sm text-gray-700">
                        {article.status === 'scheduled' && article.scheduled_for
                          ? formatDate(article.scheduled_for)
                          : 'Non planifié'}
                      </span>
                    </td>
                  
                    <td className="px-4 py-3 whitespace-nowrap relative">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/articles/${article.id}/preview`);
                          }}
                          className="p-1 text-gray-600 hover:text-emerald-600 transition-colors"
                          title="Voir"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() =>
                            navigate(`/articles/${article.id}/edit`)
                          }
                          className="p-1 text-gray-600 hover:text-emerald-600 transition-colors"
                          title="Modifier"
                        >
                          <Edit className="w-4 h-4" />
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
                            className="p-1 text-gray-600 hover:text-emerald-600 transition-colors"
                            title="Plus d’actions"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>

                          {openMenuId === article.id && (
                            <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-[100]">
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDuplicate(article);
                                }}
                              >
                                <Copy className="w-4 h-4" />
                                Dupliquer
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handlePlanification(article);
                                }}
                              >
                                <Calendar className="w-4 h-4" />
                                Programmer
                              </button>
                              {article.status !== 'ready' && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkReady(article);
                                  }}
                                >
                                  <CheckCircle2 className="w-4 h-4" />
                                  Marquer comme prêt
                                </button>
                              )}
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSoldModal({ isOpen: true, article });
                                }}
                              >
                                <DollarSign className="w-4 h-4" />
                                Marquer comme vendu
                              </button>
                              <button
                                className="w-full text-left px-3 py-2 text-sm text-red-600 hover:bg-red-50 flex items-center gap-2"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setDeleteModal({
                                    isOpen: true,
                                    articleId: article.id,
                                  });
                                }}
                              >
                                <Trash2 className="w-4 h-4" />
                                Supprimer
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

        {/* Modales */}
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

      </div>
    </>
  );
}

function SendIcon(props: React.SVGProps<SVGSVGElement>) {
  return <svg {...props} />;
}
