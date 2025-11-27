import { useState, useEffect } from 'react';
import {
  X,
  ChevronLeft,
  ChevronRight,
  Check,
  Package,
  AlertCircle,
  Search,
  Percent,
  Layers,
  Tag,
  Image as ImageIcon,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Article, Season } from '../types/article';
import { LotStatus } from '../types/lot';
import { VINTED_CATEGORIES } from '../constants/categories';

import {
  Card,
  SoftCard,
  Pill,
  InfoRow,
  GradientStatCard,
  PrimaryButton,
  GhostButton,
  IconButton,
} from './ui/UiKit';

interface LotBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  existingLotId?: string;
}

interface LotData {
  name: string;
  description: string;
  category_id?: number;
  season?: Season;
  selectedArticles: string[];
  price: number;
  cover_photo?: string;
  photos: string[];
  status: LotStatus;
}

export default function LotBuilder({
  isOpen,
  onClose,
  onSuccess,
  existingLotId,
}: LotBuilderProps) {
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [articles, setArticles] = useState<Article[]>([]);
  const [filteredArticles, setFilteredArticles] = useState<Article[]>([]);
  const [articlesInLots, setArticlesInLots] = useState<Set<string>>(new Set());

  const [lotData, setLotData] = useState<LotData>({
    name: '',
    description: '',
    selectedArticles: [],
    price: 0,
    photos: [],
    status: 'draft',
  });

  const [filters, setFilters] = useState({
    search: '',
    season: 'all',
    brand: 'all',
    size: 'all',
  });

  useEffect(() => {
    if (isOpen) {
      fetchArticles();
      fetchArticlesInLots();
      if (existingLotId) {
        loadExistingLot();
      } else {
        resetForm();
      }
    }
  }, [isOpen, existingLotId]);

  useEffect(() => {
    applyFilters();
  }, [filters, articles]);

  const resetForm = () => {
    setLotData({
      name: '',
      description: '',
      selectedArticles: [],
      price: 0,
      photos: [],
      status: 'draft',
    });
    setCurrentStep(1);
    setError('');
  };

  const loadExistingLot = async () => {
    if (!existingLotId) return;

    try {
      const { data: lotData, error: lotError } = await supabase
        .from('lots')
        .select('*')
        .eq('id', existingLotId)
        .single();

      if (lotError) throw lotError;

      const { data: itemsData, error: itemsError } = await supabase
        .from('lot_items')
        .select('article_id')
        .eq('lot_id', existingLotId);

      if (itemsError) throw itemsError;

      const articleIds = itemsData.map((item) => item.article_id);

      setLotData({
        name: lotData.name,
        description: lotData.description || '',
        category_id: lotData.category_id,
        season: lotData.season,
        selectedArticles: articleIds,
        price: parseFloat(lotData.price) || 0,
        cover_photo: lotData.cover_photo,
        photos: lotData.photos || [],
        status: lotData.status || 'draft',
      });
    } catch (error) {
      console.error('Error loading existing lot:', error);
      setError('Erreur lors du chargement du lot');
    }
  };

  const fetchArticles = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['draft', 'ready', 'scheduled'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      return;
    }

    setArticles(data || []);
    setFilteredArticles(data || []);
  };

  const fetchArticlesInLots = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    let query = supabase
      .from('lot_items')
      .select('article_id, lot_id, lots!inner(status)')
      .neq('lots.status', 'sold');

    if (existingLotId) {
      query = query.neq('lot_id', existingLotId);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching lot items:', error);
      return;
    }

    const articleIds = new Set(data?.map((item) => item.article_id) || []);
    setArticlesInLots(articleIds);
  };

  const applyFilters = () => {
    let filtered = [...articles];

    if (filters.search) {
      filtered = filtered.filter(
        (article) =>
          article.title
            .toLowerCase()
            .includes(filters.search.toLowerCase()) ||
          article.brand?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.season !== 'all') {
      filtered = filtered.filter((article) => article.season === filters.season);
    }

    if (filters.brand !== 'all') {
      filtered = filtered.filter((article) => article.brand === filters.brand);
    }

    if (filters.size !== 'all') {
      filtered = filtered.filter((article) => article.size === filters.size);
    }

    setFilteredArticles(filtered);
  };

  const getAvailableBrands = () => {
    const brands = new Set(articles.map((a) => a.brand).filter(Boolean));
    return Array.from(brands).sort();
  };

  const getAvailableSizes = () => {
    const sizes = new Set(articles.map((a) => a.size).filter(Boolean));
    return Array.from(sizes).sort();
  };

  const toggleArticleSelection = (articleId: string) => {
    setLotData((prev) => ({
      ...prev,
      selectedArticles: prev.selectedArticles.includes(articleId)
        ? prev.selectedArticles.filter((id) => id !== articleId)
        : [...prev.selectedArticles, articleId],
    }));
  };

  const getSelectedArticles = () => {
    return articles.filter((a) => lotData.selectedArticles.includes(a.id));
  };

  const calculateTotalPrice = () => {
    return getSelectedArticles().reduce(
      (sum, article) => sum + article.price,
      0
    );
  };

  const calculateDiscount = () => {
    const total = calculateTotalPrice();
    if (total === 0 || lotData.price === 0) return 0;
    return Math.round(((total - lotData.price) / total) * 100);
  };

  const handleNext = () => {
    setError('');

    if (currentStep === 1) {
      if (!lotData.name.trim()) {
        setError('Le nom du lot est obligatoire');
        return;
      }
    }

    if (currentStep === 2) {
      if (lotData.selectedArticles.length < 2) {
        setError('Vous devez sélectionner au moins 2 articles');
        return;
      }
    }

    if (currentStep === 3) {
      if (lotData.price <= 0) {
        setError('Le prix du lot doit être supérieur à 0');
        return;
      }
    }

    setCurrentStep((prev) => Math.min(prev + 1, 4));
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep((prev) => Math.max(prev - 1, 1));
  };

  const generateLotReferenceNumber = async (
    userId: string
  ): Promise<string> => {
    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('dressing_name')
        .eq('id', userId)
        .maybeSingle();

      const { count } = await supabase
        .from('lots')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', userId);

      const dressingName = (profile?.dressing_name || 'MonDressing').replace(
        /\s+/g,
        '_'
      );
      const lotNumber = (count || 0) + 1;

      return `LOT_${dressingName}_${lotNumber}`;
    } catch (error) {
      console.error('Error generating lot reference number:', error);
      return `LOT_REF-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const totalPrice = calculateTotalPrice();
      const discount = calculateDiscount();

      const selectedArticles = getSelectedArticles();
      const allPhotos = selectedArticles.flatMap((a) => a.photos);

      let referenceNumber: string | undefined;
      if (!existingLotId) {
        referenceNumber = await generateLotReferenceNumber(user.id);
      }

      const lotPayload: any = {
        user_id: user.id,
        name: lotData.name,
        description: lotData.description,
        category_id: lotData.category_id,
        season: lotData.season,
        price: lotData.price,
        original_total_price: totalPrice,
        discount_percentage: discount,
        cover_photo: lotData.cover_photo || allPhotos[0],
        photos:
          lotData.photos.length > 0 ? lotData.photos : allPhotos.slice(0, 5),
        status: lotData.status,
      };

      if (referenceNumber) {
        lotPayload.reference_number = referenceNumber;
      }

      let lotId: string;

      if (existingLotId) {
        const { error: lotError } = await supabase
          .from('lots')
          .update(lotPayload)
          .eq('id', existingLotId);

        if (lotError) throw lotError;
        lotId = existingLotId;

        const { error: deleteError } = await supabase
          .from('lot_items')
          .delete()
          .eq('lot_id', existingLotId);

        if (deleteError) throw deleteError;
      } else {
        const { data: lot, error: lotError } = await supabase
          .from('lots')
          .insert([lotPayload])
          .select()
          .single();

        if (lotError) throw lotError;
        lotId = lot.id;
      }

      const lotItems = lotData.selectedArticles.map((articleId) => ({
        lot_id: lotId,
        article_id: articleId,
      }));

      const { error: itemsError } = await supabase
        .from('lot_items')
        .insert(lotItems);

      if (itemsError) throw itemsError;

      onSuccess();
      onClose();
    } catch (err: any) {
      console.error('Error saving lot:', err);
      setError(
        err.message ||
          `Erreur lors de ${
            existingLotId ? 'la modification' : 'la création'
          } du lot`
      );
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPrice = calculateTotalPrice();
  const discount = calculateDiscount();

  const statusLabel = (status: LotStatus) => {
    switch (status) {
      case 'draft':
        return 'Brouillon';
      case 'ready':
        return 'Prêt';
      case 'scheduled':
        return 'Planifié';
      case 'published':
        return 'Publié';
      case 'sold':
        return 'Vendu';
      default:
        return status;
    }
  };

  const statusVariant = (status: LotStatus) => {
    switch (status) {
      case 'draft':
        return 'neutral';
      case 'ready':
      case 'published':
        return 'primary';
      case 'scheduled':
        return 'warning';
      case 'sold':
        return 'success';
      default:
        return 'neutral';
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm p-3 sm:p-4">
      <div className="bg-white w-full max-w-5xl h-full md:h-auto md:max-h-[90vh] rounded-3xl border border-slate-200 shadow-2xl overflow-hidden flex flex-col">
        {/* Header Apple-like */}
        <div className="sticky top-0 z-10 bg-white/85 backdrop-blur-xl border-b border-slate-200 px-4 sm:px-6 py-4 flex items-center justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-11 sm:h-11 rounded-2xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md flex-shrink-0">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg sm:text-xl font-semibold text-slate-900 truncate">
                {existingLotId ? 'Modifier le lot' : 'Créer un lot'}
              </h2>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                <Pill variant="neutral">Étape {currentStep} sur 4</Pill>
                {lotData.selectedArticles.length > 0 && (
                  <Pill variant="success">
                    <Layers className="w-3.5 h-3.5" />
                    {lotData.selectedArticles.length} article(s)
                  </Pill>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {discount !== 0 && currentStep >= 3 && (
              <Pill
                variant={discount > 0 ? 'success' : 'warning'}
                className="hidden sm:inline-flex"
              >
                <Percent className="w-3.5 h-3.5" />
                Remise {discount}%
              </Pill>
            )}
            <IconButton icon={X} ariaLabel="Fermer" onClick={onClose} />
          </div>
        </div>

        {/* Contenu */}
        <div className="flex-1 overflow-y-auto bg-slate-50/70 px-4 sm:px-6 py-4 sm:py-5 space-y-4 sm:space-y-5">
          {error && (
            <div className="mb-2">
              <div className="rounded-2xl border border-rose-200 bg-rose-50/80 px-4 py-3 flex gap-3 items-start">
                <div className="mt-0.5">
                  <AlertCircle className="w-4.5 h-4.5 text-rose-600" />
                </div>
                <p className="text-sm text-rose-800 leading-snug">{error}</p>
              </div>
            </div>
          )}

          {/* STEP 1 : Infos de base */}
          {currentStep === 1 && (
            <div className="grid grid-cols-1 gap-4 sm:gap-5">
              <Card>
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Nom du lot <span className="text-rose-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={lotData.name}
                      onChange={(e) =>
                        setLotData({ ...lotData, name: e.target.value })
                      }
                      placeholder="Ex : Pack fille 8 ans - Été"
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={lotData.description}
                      onChange={(e) =>
                        setLotData({
                          ...lotData,
                          description: e.target.value,
                        })
                      }
                      placeholder="Décrivez rapidement le contenu du lot, la tranche d'âge, la saison, etc."
                      rows={4}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Saison
                    </label>
                    <select
                      value={lotData.season || ''}
                      onChange={(e) => {
                        const season = e.target.value as Season;
                        setLotData({ ...lotData, season });
                        setFilters({ ...filters, season: season || 'all' });
                      }}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Sélectionner une saison</option>
                      <option value="spring">Printemps</option>
                      <option value="summer">Été</option>
                      <option value="autumn">Automne</option>
                      <option value="winter">Hiver</option>
                      <option value="all-seasons">Toutes saisons</option>
                    </select>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* STEP 2 : Sélection des articles */}
          {currentStep === 2 && (
            <div className="space-y-4 sm:space-y-5">
              <Card>
                <div className="flex flex-wrap gap-3 items-center">
                  <div className="flex-1 min-w-[180px] flex items-center gap-2">
                    <Search className="w-4 h-4 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Rechercher par titre ou marque..."
                      value={filters.search}
                      onChange={(e) =>
                        setFilters({ ...filters, search: e.target.value })
                      }
                      className="w-full px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    />
                  </div>

                  <select
                    value={filters.season}
                    onChange={(e) =>
                      setFilters({ ...filters, season: e.target.value })
                    }
                    className="px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">Toutes saisons</option>
                    <option value="spring">Printemps</option>
                    <option value="summer">Été</option>
                    <option value="autumn">Automne</option>
                    <option value="winter">Hiver</option>
                    <option value="all-seasons">Toutes saisons</option>
                  </select>

                  <select
                    value={filters.brand}
                    onChange={(e) =>
                      setFilters({ ...filters, brand: e.target.value })
                    }
                    className="px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">Toutes marques</option>
                    {getAvailableBrands().map((b) => (
                      <option key={b} value={b}>
                        {b}
                      </option>
                    ))}
                  </select>

                  <select
                    value={filters.size}
                    onChange={(e) =>
                      setFilters({ ...filters, size: e.target.value })
                    }
                    className="px-3 py-2 rounded-2xl border border-slate-200 bg-slate-50 text-xs sm:text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  >
                    <option value="all">Toutes tailles</option>
                    {getAvailableSizes().map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>

              <SoftCard>
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Layers className="w-4.5 h-4.5 text-amber-700" />
                    <p className="text-sm text-amber-900">
                      <span className="font-semibold">
                        {lotData.selectedArticles.length}
                      </span>{' '}
                      article(s) sélectionné(s) pour ce lot.
                    </p>
                  </div>
                  <p className="text-xs text-amber-900/80 hidden sm:block">
                    Un lot est plus attractif à partir de 3 pièces bien
                    assorties.
                  </p>
                </div>
              </SoftCard>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 max-h-[420px] overflow-y-auto">
                {filteredArticles.map((article) => {
                  const isSelected = lotData.selectedArticles.includes(
                    article.id
                  );
                  const isInAnotherLot = articlesInLots.has(article.id);

                  return (
                    <div
                      key={article.id}
                      onClick={() =>
                        !isInAnotherLot && toggleArticleSelection(article.id)
                      }
                      className={[
                        'group relative rounded-2xl overflow-hidden border-2 bg-white cursor-pointer transition-all',
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-200'
                          : isInAnotherLot
                          ? 'border-slate-200 opacity-50 cursor-not-allowed'
                          : 'border-slate-200 hover:border-emerald-300 hover:shadow-sm',
                      ].join(' ')}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-7 h-7 rounded-full bg-emerald-500 shadow flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {isInAnotherLot && (
                        <div className="absolute top-2 left-2 z-10 rounded-full bg-amber-500 text-[10px] text-white px-2 py-1 shadow">
                          Dans un lot
                        </div>
                      )}

                      <div className="aspect-square bg-slate-100 flex items-center justify-center">
                        {article.photos && article.photos.length > 0 ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-10 h-10 text-slate-300" />
                        )}
                      </div>

                      <div className="p-3 space-y-1">
                        <p className="text-xs font-semibold text-slate-900 truncate">
                          {article.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {article.brand || 'Sans marque'}
                        </p>
                        <p className="text-sm font-semibold text-emerald-600 mt-1">
                          {article.price.toFixed(0)} €
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3 : Prix & photos & statut */}
          {currentStep === 3 && (
            <div className="space-y-4 sm:space-y-5">
              <div className="grid gap-4 sm:gap-5 md:grid-cols-2">
                <Card>
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                    Prix & remise
                  </h3>
                  <div className="space-y-2.5">
                    <InfoRow
                      icon={Tag}
                      title="Prix total des articles"
                      description="Somme des prix individuels"
                      value={`${totalPrice.toFixed(2)} €`}
                      valueClassName="text-slate-900"
                    />

                    <div className="flex items-center justify-between py-3">
                      <div className="flex items-center gap-2">
                        <Percent className="w-4 h-4 text-slate-500" />
                        <div>
                          <p className="text-sm font-medium text-slate-900">
                            Remise suggérée (20%)
                          </p>
                          <p className="text-xs text-slate-500">
                            Appliquer automatiquement un prix de lot attractif
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setLotData({
                            ...lotData,
                            price: Math.round(totalPrice * 0.8),
                          })
                        }
                        className="text-xs sm:text-sm font-medium text-emerald-700 hover:text-emerald-800 underline-offset-2 hover:underline"
                      >
                        Appliquer
                      </button>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Prix du lot <span className="text-rose-500">*</span>
                      </label>
                      <div className="relative">
                        <input
                          type="number"
                          step="0.01"
                          value={lotData.price || ''}
                          onChange={(e) =>
                            setLotData({
                              ...lotData,
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          €
                        </span>
                      </div>
                      {discount !== 0 && (
                        <p className="mt-1.5 text-xs text-slate-600">
                          Remise :{' '}
                          <span
                            className={
                              discount > 0
                                ? 'text-emerald-600 font-semibold'
                                : 'text-rose-600 font-semibold'
                            }
                          >
                            {discount}%
                          </span>
                        </p>
                      )}
                    </div>
                  </div>
                </Card>

                <Card>
                  <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                    Statut & visibilité
                  </h3>
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Statut du lot
                      </label>
                      <select
                        value={lotData.status}
                        onChange={(e) =>
                          setLotData({
                            ...lotData,
                            status: e.target.value as LotStatus,
                          })
                        }
                        className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      >
                        <option value="draft">Brouillon</option>
                        <option value="ready">Prêt</option>
                        <option value="scheduled">Planifié</option>
                        <option value="published">Publié</option>
                        <option value="sold">Vendu</option>
                      </select>
                      <p className="mt-2 text-xs text-slate-500">
                        Le lot est créé en mode brouillon. Vous pourrez le
                        modifier et publier plus tard.
                      </p>
                    </div>

                    <div className="mt-2">
                      <p className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Résumé
                      </p>
                      <GradientStatCard
                        label="Prix du lot"
                        value={`${lotData.price.toFixed(2)} €`}
                        sublabel={
                          discount !== 0
                            ? `Remise de ${discount}% par rapport aux articles à l’unité`
                            : 'Ajustez le prix pour le rendre attractif'
                        }
                      />
                    </div>
                  </div>
                </Card>
              </div>

              <Card>
                <h3 className="text-xs font-semibold text-slate-600 uppercase tracking-wide mb-3">
                  Photos du lot
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-6 gap-3">
                  {getSelectedArticles()
                    .flatMap((a) => a.photos)
                    .slice(0, 8)
                    .map((photo, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() =>
                          setLotData({ ...lotData, cover_photo: photo })
                        }
                        className={[
                          'aspect-square rounded-2xl overflow-hidden border-2 transition-all relative group',
                          lotData.cover_photo === photo
                            ? 'border-emerald-500 ring-2 ring-emerald-200'
                            : 'border-slate-200 hover:border-emerald-300',
                        ].join(' ')}
                      >
                        {photo ? (
                          <img
                            src={photo}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-slate-100 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-slate-300" />
                          </div>
                        )}
                        {lotData.cover_photo === photo && (
                          <div className="absolute bottom-2 left-2 right-2 rounded-xl bg-slate-900/80 text-[10px] text-white px-2 py-1 text-center">
                            Photo de couverture
                          </div>
                        )}
                      </button>
                    ))}
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Cliquez sur une photo pour la définir comme couverture du lot.
                </p>
              </Card>
            </div>
          )}

          {/* STEP 4 : Récapitulatif */}
          {currentStep === 4 && (
            <div className="space-y-4 sm:space-y-5">
              <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                <h3 className="text-sm font-semibold text-slate-900 mb-3">
                  Récapitulatif du lot
                </h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Nom</span>
                      <span className="font-semibold text-slate-900">
                        {lotData.name}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Articles</span>
                      <span className="font-semibold text-slate-900">
                        {lotData.selectedArticles.length}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">
                        Prix total des articles
                      </span>
                      <span className="font-semibold text-slate-900">
                        {totalPrice.toFixed(2)} €
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Prix du lot</span>
                      <span className="font-semibold text-emerald-700">
                        {lotData.price.toFixed(2)} €
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-600">Remise</span>
                      <span className="font-semibold text-emerald-700">
                        {discount}%
                      </span>
                    </div>
                    <div className="flex items-center justify-between pt-2 border-t border-emerald-200">
                      <span className="text-sm font-medium text-slate-700">
                        Statut du lot
                      </span>
                      <Pill
                        variant={statusVariant(lotData.status)}
                        className="text-[11px]"
                      >
                        {statusLabel(lotData.status)}
                      </Pill>
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <h4 className="text-sm font-semibold text-slate-800 mb-3">
                  Articles inclus
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getSelectedArticles().map((article) => (
                    <div
                      key={article.id}
                      className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-2.5"
                    >
                      <div className="w-11 h-11 rounded-xl overflow-hidden bg-slate-100 flex-shrink-0">
                        {article.photos?.[0] ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <Package className="w-5 h-5 text-slate-300" />
                          </div>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-900 truncate">
                          {article.title}
                        </p>
                        <p className="text-[11px] text-slate-500 truncate">
                          {article.brand || 'Sans marque'}
                        </p>
                      </div>
                      <span className="text-sm font-semibold text-slate-900">
                        {article.price.toFixed(0)} €
                      </span>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}
        </div>

        {/* Footer navigation */}
        <div className="border-t border-slate-200 bg-white/90 backdrop-blur px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between gap-3">
          <GhostButton
            onClick={handlePrevious}
            className="gap-1.5 px-3 sm:px-4"
            type="button"
          >
            <ChevronLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Précédent</span>
            <span className="sm:hidden">Retour</span>
          </GhostButton>

          {currentStep < 4 ? (
            <PrimaryButton
              onClick={handleNext}
              className="gap-1.5 px-4 sm:px-5"
              type="button"
            >
              <span>Suivant</span>
              <ChevronRight className="w-4 h-4" />
            </PrimaryButton>
          ) : (
            <PrimaryButton
              onClick={handleSubmit}
              disabled={loading}
              className="gap-1.5 px-4 sm:px-5"
              type="button"
            >
              <span>{loading ? 'Création…' : 'Créer le lot'}</span>
              {!loading && <Check className="w-4 h-4" />}
            </PrimaryButton>
          )}
        </div>
      </div>
    </div>
  );
}
