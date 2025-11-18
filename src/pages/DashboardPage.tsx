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
        text: 'Erreur lors de la suppression de l’article',
      });
    }
  };

  const handleMarkAsSold = async (price: number) => {
    if (!soldModal.article) return;

    try {
      const { error } = await supabase
        .from('articles')
        .update({
          status: 'sold',
          sold_price: price,
          sold_at: new Date().toISOString(),
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
        text: 'Erreur lors de la mise à jour de l’article',
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

      <div className="max-w-6xl mx-auto px-4 py-6">
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

          <div className="flex items-center gap-2 overflow-x-auto">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-full text-xs font-medium border ${
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
                className={`px-3 py-1.5 rounded-full text-xs font-medium border flex items-center gap-1 ${
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
                  className="bg-white rounded-xl shadow-sm border border-gray-100 px-3 py-3 flex gap-3 cursor-pointer"
                  onClick={() => navigate(`/articles/${article.id}/preview`)}
                >
                  <div className="w-20 h-20 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0">
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

                  <div className="flex-1 min-w-0 flex flex-col">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-gray-900 truncate">
                          {article.title}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
                          <span className="truncate">
                            {article.brand || 'Non spécifié'}
                          </span>
                          <span className="w-1 h-1 rounded-full bg-gray-300" />
                          <span className="font-semibold text-gray-800">
                            {article.price.toFixed(0)}€
                          </span>
                        </div>
                      </div>

                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium whitespace-nowrap ${STATUS_COLORS[article.status]}`}
                      >
                        {renderStatusIcon(article.status)}
                        {STATUS_LABELS[article.status]}
                      </span>
                    </div>

                    {/* Saison + planification alignées à droite */}
                    <div className="mt-2 flex flex-wrap items-center justify-end gap-2">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-100 text-gray-700">
                        {SEASON_LABELS[article.season]}
                      </span>

                      {article.status === 'scheduled' && article.scheduled_for ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-yellow-50 text-yellow-700 border border-yellow-100">
                          <Clock className="w-3 h-3 mr-1" />
                          {formatDate(article.scheduled_for)}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-gray-50 text-gray-500 border border-gray-100">
                          Non planifié
                        </span>
                      )}
                    </div>

                    {/* Actions mobile */}
                    <div className="mt-3 pt-2 border-t border-gray-100 flex items-center justify-between">
                      <span className="text-[11px] text-gray-400">
                        Créé le {formatDate(article.created_at)}
                      </span>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/articles/${article.id}/preview`);
                          }}
                          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/articles/${article.id}/edit`);
                          }}
                          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenMenuId(
                              openMenuId === article.id ? null : article.id
                            );
                          }}
                          className="p-1.5 rounded-full hover:bg-gray-100 text-gray-600"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {openMenuId === article.id && (
                      <div className="mt-2 border-t border-gray-100 pt-2 space-y-1 text-[13px]">
                        <button
                          className="w-full text-left py-1.5 text-gray-700 hover:text-emerald-600 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDuplicate(article);
                          }}
                        >
                          <Copy className="w-3 h-3" />
                          Dupliquer
                        </button>
                        <button
                          className="w-full text-left py-1.5 text-gray-700 hover:text-emerald-600 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePlanification(article);
                          }}
                        >
                          <Calendar className="w-3 h-3" />
                          Programmer
                        </button>
                        {article.status !== 'ready' && (
                          <button
                            className="w-full text-left py-1.5 text-gray-700 hover:text-emerald-600 flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkReady(article);
                            }}
                          >
                            <CheckCircle2 className="w-3 h-3" />
                            Marquer comme prêt
                          </button>
                        )}
                        {article.status !== 'published' && (
                          <button
                            className="w-full text-left py-1.5 text-gray-700 hover:text-emerald-600 flex items-center gap-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMarkPublished(article);
                            }}
                          >
                            <Send className="w-3 h-3" />
                            Marquer comme publié
                          </button>
                        )}
                        <button
                          className="w-full text-left py-1.5 text-red-600 hover:text-red-700 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSoldModal({ isOpen: true, article });
                          }}
                        >
                          <DollarSign className="w-3 h-3" />
                          Marquer comme vendu
                        </button>
                        <button
                          className="w-full text-left py-1.5 text-red-600 hover:text-red-700 flex items-center gap-2"
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteModal({
                              isOpen: true,
                              articleId: article.id,
                            });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                          Supprimer
                        </button>
                      </div>
                    )}
                  </div>
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
                      <span className="text-sm text-gray-700">
                        {SEASON_LABELS[article.season]}
                      </span>
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
                          onClick={() =>
                            navigate(`/articles/${article.id}/preview`)
                          }
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
                              {article.status !== 'published' && (
                                <button
                                  className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 flex items-center gap-2"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleMarkPublished(article);
                                  }}
                                >
                                  <Send className="w-4 h-4" />
                                  Marquer comme publié
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
