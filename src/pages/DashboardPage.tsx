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
} from 'lucide-react';
import { Article, ArticleStatus, Season } from '../types/article';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
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
  scheduled: 'bg-yellow-100 text-yellow-700',
  published: 'bg-green-100 text-green-700',
  sold: 'bg-orange-100 text-orange-700',
};

const SEASON_LABELS: Record<string, string> = {
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

  const [statusFilter, setStatusFilter] = useState<ArticleStatus | 'all'>('all');
  const [seasonFilter, setSeasonFilter] = useState<Season | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);

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

  const [openMenuId, setOpenMenuId] = useState<string | null>(null);

  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; article: Article | null }>({
    isOpen: false,
    article: null,
  });

  const [scheduleModal, setScheduleModal] = useState<{ isOpen: boolean; article: Article | null }>({
    isOpen: false,
    article: null,
  });

  const [soldModal, setSoldModal] = useState<{ isOpen: boolean; article: Article | null }>({
    isOpen: false,
    article: null,
  });

  // Deux refs séparées : une pour le menu desktop, une pour le menu mobile
  const desktopMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchArticles();
  }, []);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;

      if (
        (desktopMenuRef.current && desktopMenuRef.current.contains(target)) ||
        (mobileMenuRef.current && mobileMenuRef.current.contains(target))
      ) {
        return;
      }

      setOpenMenuId(null);
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  async function fetchArticles() {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .neq('status', 'sold')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedArticles: Article[] = (data || []).map((article: any) => ({
        ...article,
        price: parseFloat(article.price),
      }));

      setArticles(formattedArticles);
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
  }

  const filteredArticles = articles
    .filter((article) => statusFilter === 'all' || article.status === statusFilter)
    .filter((article) => seasonFilter === 'all' || article.season === seasonFilter)
    .filter((article) => {
      if (!searchQuery.trim()) return true;
      const query = searchQuery.toLowerCase();
      return (
        article.title.toLowerCase().includes(query) ||
        article.brand.toLowerCase().includes(query) ||
        article.description?.toLowerCase().includes(query)
      );
    });

  const formatDate = (date?: string) => {
    if (!date) return 'Non planifié';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const formatDateShort = (date?: string) => {
    if (!date) return '—';
    return new Date(date).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
    });
  };

  const handleDuplicate = async (article: Article) => {
    try {
      const { id, created_at, updated_at, scheduled_at, sold_at, sold_price, ...articleData } = article;
      const newArticle = {
        ...articleData,
        title: `${article.title} (Copie)`,
        status: 'draft' as ArticleStatus,
        user_id: user?.id,
      };

      const { error } = await supabase.from('articles').insert([newArticle]);
      if (error) throw error;

      setModalState({
        isOpen: true,
        title: 'Article dupliqué',
        message: "L'article a été dupliqué avec succès",
        type: 'success',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error duplicating article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors de la duplication de l'article",
        type: 'error',
      });
    }
    setOpenMenuId(null);
  };

  const handleDelete = async () => {
    if (!deleteModal.article) return;

    try {
      const { error } = await supabase.from('articles').delete().eq('id', deleteModal.article.id);

      if (error) throw error;

      setModalState({
        isOpen: true,
        title: 'Article supprimé',
        message: "L'article a été supprimé avec succès",
        type: 'success',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error deleting article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors de la suppression de l'article",
        type: 'error',
      });
    }
  };

  const handleSchedule = async (date: Date) => {
    if (!scheduleModal.article) return;

    try {
      const { error } = await supabase
        .from('articles')
        .update({
          status: 'scheduled',
          scheduled_for: date.toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', scheduleModal.article.id);

      if (error) throw error;

      setModalState({
        isOpen: true,
        title: 'Publication programmée',
        message: `L'article sera publié le ${formatDate(date.toISOString())}`,
        type: 'success',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error scheduling article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors de la programmation',
        type: 'error',
      });
    }
    setOpenMenuId(null);
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
      const actualValue = soldModal.article.actual_value || 0;
      const netProfit = saleData.soldPrice - actualValue - saleData.fees - saleData.shippingCost;

      const { error } = await supabase
        .from('articles')
        .update({
          status: 'sold',
          sold_at: saleData.soldAt,
          sold_price: saleData.soldPrice,
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

      setModalState({
        isOpen: true,
        title: 'Vente enregistrée',
        message: `L'article a été marqué comme vendu pour ${saleData.soldPrice.toFixed(
          2
        )} € (bénéfice net : ${netProfit.toFixed(2)} €)`,
        type: 'success',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error marking article as sold:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors de l'enregistrement de la vente",
        type: 'error',
      });
    }
    setOpenMenuId(null);
  };

  const handleStatusChange = async (article: Article, newStatus: ArticleStatus) => {
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus !== 'scheduled') {
        updateData.scheduled_for = null;
      }

      const { error } = await supabase.from('articles').update(updateData).eq('id', article.id);

      if (error) throw error;

      setModalState({
        isOpen: true,
        title: 'Statut modifié',
        message: `Le statut a été changé en "${STATUS_LABELS[newStatus]}"`,
        type: 'success',
      });
      fetchArticles();
    } catch (error) {
      console.error('Error changing status:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors du changement de statut',
        type: 'error',
      });
    }
    setOpenMenuId(null);
  };

  const renderStatusIcon = (status: ArticleStatus) => {
    switch (status) {
      case 'draft':
        return <FileText className="w-3 h-3" />;
      case 'ready':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'scheduled':
        return <Clock className="w-3 h-3" />;
      case 'published':
        return <CheckCircle2 className="w-3 h-3" />;
      case 'sold':
        return <DollarSign className="w-3 h-3" />;
      default:
        return null;
    }
  };

  return (
    <>
      <Modal
        isOpen={modalState.isOpen}
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />

      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Mes articles en Stock</h1>
          <p className="text-sm text-gray-600 mt-1">
            Gérez vos articles Vinted et planifiez leur publication automatique
          </p>
        </div>

        {/* Filtres */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-4 border-b border-gray-200">
            <div className="flex flex-col lg:flex-row gap-4">
              <div className="flex-1">
                <label className="block text-xs font-medium text-gray-700 mb-2">Rechercher</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Rechercher par titre, marque."
                    className="w-full pl-10 pr-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="w-full lg:w-48">
                <label className="block text-xs font-medium text-gray-700 mb-2">
                  Filtrer par saison
                </label>
                <select
                  value={seasonFilter}
                  onChange={(e) => setSeasonFilter(e.target.value as Season | 'all')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="all">Toutes</option>
                  <option value="spring">Printemps</option>
                  <option value="summer">Été</option>
                  <option value="autumn">Automne</option>
                  <option value="winter">Hiver</</assistant
