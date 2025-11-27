import { useState, useEffect } from 'react';
import { X, ChevronLeft, ChevronRight, Check, Package, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Article } from '../types/article';
import { Season } from '../types/article';
import { LotStatus } from '../types/lot';
import { VINTED_CATEGORIES } from '../constants/categories';
import { Button } from './ui/Button';

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

export default function LotBuilder({ isOpen, onClose, onSuccess, existingLotId }: LotBuilderProps) {
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

      const articleIds = itemsData.map(item => item.article_id);

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
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('user_id', user.id)
      .in('status', ['draft', 'ready'])
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching articles:', error);
      return;
    }

    setArticles(data || []);
    setFilteredArticles(data || []);
  };

  const fetchArticlesInLots = async () => {
    const { data: { user } } = await supabase.auth.getUser();
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

    const articleIds = new Set(data?.map(item => item.article_id) || []);
    setArticlesInLots(articleIds);
  };

  const applyFilters = () => {
    let filtered = [...articles];

    if (filters.search) {
      filtered = filtered.filter(article =>
        article.title.toLowerCase().includes(filters.search.toLowerCase()) ||
        article.brand?.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    if (filters.season !== 'all') {
      filtered = filtered.filter(article => article.season === filters.season);
    }

    if (filters.brand !== 'all') {
      filtered = filtered.filter(article => article.brand === filters.brand);
    }

    if (filters.size !== 'all') {
      filtered = filtered.filter(article => article.size === filters.size);
    }

    setFilteredArticles(filtered);
  };

  const getAvailableBrands = () => {
    const brands = new Set(articles.map(a => a.brand).filter(Boolean));
    return Array.from(brands).sort();
  };

  const getAvailableSizes = () => {
    const sizes = new Set(articles.map(a => a.size).filter(Boolean));
    return Array.from(sizes).sort();
  };

  const toggleArticleSelection = (articleId: string) => {
    setLotData(prev => ({
      ...prev,
      selectedArticles: prev.selectedArticles.includes(articleId)
        ? prev.selectedArticles.filter(id => id !== articleId)
        : [...prev.selectedArticles, articleId],
    }));
  };

  const getSelectedArticles = () => {
    return articles.filter(a => lotData.selectedArticles.includes(a.id));
  };

  const calculateTotalPrice = () => {
    return getSelectedArticles().reduce((sum, article) => sum + article.price, 0);
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

    setCurrentStep(prev => Math.min(prev + 1, 4));
  };

  const handlePrevious = () => {
    setError('');
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const generateLotReferenceNumber = async (userId: string): Promise<string> => {
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

      const dressingName = (profile?.dressing_name || 'MonDressing').replace(/\s+/g, '_');
      const lotNumber = (count || 0) + 1;

      return `LOT_${dressingName}_${lotNumber}`;
    } catch (error) {
      console.error('Error generating lot reference number:', error);
      return `LOT_REF-${Date.now()}-${Math.random().toString(36).substring(2, 9).toUpperCase()}`;
    }
  };

  const handleSubmit = async () => {
    setLoading(true);
    setError('');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Non authentifié');

      const totalPrice = calculateTotalPrice();
      const discount = calculateDiscount();

      const selectedArticles = getSelectedArticles();
      const allPhotos = selectedArticles.flatMap(a => a.photos);

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
        photos: lotData.photos.length > 0 ? lotData.photos : allPhotos.slice(0, 5),
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

      const lotItems = lotData.selectedArticles.map(articleId => ({
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
      setError(err.message || `Erreur lors de ${existingLotId ? 'la modification' : 'la création'} du lot`);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const totalPrice = calculateTotalPrice();
  const discount = calculateDiscount();

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center">
              <Package className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{existingLotId ? 'Modifier le lot' : 'Créer un lot'}</h2>
              <p className="text-sm text-gray-500">Étape {currentStep} sur 4</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          {currentStep === 1 && (
            <div className="space-y-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Nom du lot <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={lotData.name}
                  onChange={(e) => setLotData({ ...lotData, name: e.target.value })}
                  placeholder="Ex: Pack fille 8 ans - Été"
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={lotData.description}
                  onChange={(e) => setLotData({ ...lotData, description: e.target.value })}
                  placeholder="Décrivez votre lot..."
                  rows={4}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent resize-none"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Saison
                </label>
                <select
                  value={lotData.season || ''}
                  onChange={(e) => {
                    const season = e.target.value as Season;
                    setLotData({ ...lotData, season });
                    setFilters({ ...filters, season: season || 'all' });
                  }}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
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
          )}

          {currentStep === 2 && (
            <div className="space-y-6">
              <div className="flex gap-3 mb-4">
                <input
                  type="text"
                  placeholder="Rechercher..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent text-sm"
                />
                <select
                  value={filters.season}
                  onChange={(e) => setFilters({ ...filters, season: e.target.value })}
                  className="px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 text-sm"
                >
                  <option value="all">Toutes saisons</option>
                  <option value="spring">Printemps</option>
                  <option value="summer">Été</option>
                  <option value="autumn">Automne</option>
                  <option value="winter">Hiver</option>
                  <option value="all-seasons">Toutes saisons</option>
                </select>
              </div>

              <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
                <p className="text-sm text-emerald-800">
                  <span className="font-semibold">{lotData.selectedArticles.length}</span> article(s) sélectionné(s)
                </p>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-h-96 overflow-y-auto">
                {filteredArticles.map((article) => {
                  const isSelected = lotData.selectedArticles.includes(article.id);
                  const isInAnotherLot = articlesInLots.has(article.id);

                  return (
                    <div
                      key={article.id}
                      onClick={() => !isInAnotherLot && toggleArticleSelection(article.id)}
                      className={`relative border-2 rounded-xl overflow-hidden transition-all cursor-pointer ${
                        isSelected
                          ? 'border-emerald-500 ring-2 ring-emerald-200'
                          : isInAnotherLot
                          ? 'border-gray-200 opacity-50 cursor-not-allowed'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      {isSelected && (
                        <div className="absolute top-2 right-2 z-10 w-6 h-6 bg-emerald-500 rounded-full flex items-center justify-center">
                          <Check className="w-4 h-4 text-white" />
                        </div>
                      )}
                      {isInAnotherLot && (
                        <div className="absolute top-2 left-2 z-10 bg-yellow-500 text-white text-xs px-2 py-1 rounded">
                          Dans un lot
                        </div>
                      )}
                      <div className="aspect-square bg-gray-100 flex items-center justify-center">
                        {article.photos && article.photos.length > 0 ? (
                          <img
                            src={article.photos[0]}
                            alt={article.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <Package className="w-12 h-12 text-gray-300" />
                        )}
                      </div>
                      <div className="p-3">
                        <p className="text-sm font-semibold text-gray-900 truncate">{article.title}</p>
                        <p className="text-xs text-gray-500 truncate">{article.brand || 'Sans marque'}</p>
                        <p className="text-sm font-bold text-emerald-600 mt-1">{article.price.toFixed(0)}€</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <div className="flex justify-between items-center mb-4">
                  <span className="text-sm font-medium text-gray-600">Prix total des articles</span>
                  <span className="text-lg font-bold text-gray-900">{totalPrice.toFixed(2)}€</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-600">Remise suggérée (20%)</span>
                  <button
                    onClick={() => setLotData({ ...lotData, price: totalPrice * 0.8 })}
                    className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  >
                    Appliquer
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Prix du lot <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.01"
                    value={lotData.price || ''}
                    onChange={(e) => setLotData({ ...lotData, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  />
                  <span className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500">€</span>
                </div>
                {discount !== 0 && (
                  <p className="mt-2 text-sm text-gray-600">
                    Remise: <span className={discount > 0 ? 'text-emerald-600 font-semibold' : 'text-red-600 font-semibold'}>
                      {discount}%
                    </span>
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Photos du lot
                </label>
                <div className="grid grid-cols-4 gap-3">
                  {getSelectedArticles().flatMap(a => a.photos).slice(0, 8).map((photo, idx) => (
                    <div
                      key={idx}
                      onClick={() => setLotData({ ...lotData, cover_photo: photo })}
                      className={`aspect-square rounded-xl overflow-hidden border-2 cursor-pointer transition-all ${
                        lotData.cover_photo === photo
                          ? 'border-emerald-500 ring-2 ring-emerald-200'
                          : 'border-gray-200 hover:border-emerald-300'
                      }`}
                    >
                      <img src={photo} alt="" className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs text-gray-500">Cliquez sur une photo pour la définir comme couverture</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-6">
                <label className="block text-sm font-medium text-gray-700 mb-3">
                  Statut du lot
                </label>
                <select
                  value={lotData.status}
                  onChange={(e) => setLotData({ ...lotData, status: e.target.value as LotStatus })}
                  className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                >
                  <option value="draft">Brouillon</option>
                  <option value="ready">Prêt</option>
                  <option value="scheduled">Planifié</option>
                  <option value="published">Publié</option>
                  <option value="sold">Vendu</option>
                </select>
                <p className="mt-2 text-xs text-gray-500">
                  Le lot sera créé en mode brouillon. Vous pourrez le modifier et changer son statut plus tard.
                </p>
              </div>
            </div>
          )}

          {currentStep === 4 && (
            <div className="space-y-6">
              <div className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-200 rounded-2xl p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Récapitulatif</h3>

                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Nom</span>
                    <span className="text-sm font-semibold text-gray-900">{lotData.name}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Articles</span>
                    <span className="text-sm font-semibold text-gray-900">{lotData.selectedArticles.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prix total</span>
                    <span className="text-sm text-gray-900">{totalPrice.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Prix du lot</span>
                    <span className="text-sm font-bold text-emerald-600">{lotData.price.toFixed(2)}€</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-sm text-gray-600">Remise</span>
                    <span className="text-sm font-semibold text-emerald-600">{discount}%</span>
                  </div>
                  <div className="pt-3 border-t border-emerald-200 mt-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">Statut du lot</span>
                      <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                        lotData.status === 'draft' ? 'bg-gray-100 text-gray-700' :
                        lotData.status === 'ready' ? 'bg-blue-100 text-blue-700' :
                        lotData.status === 'scheduled' ? 'bg-yellow-50 text-yellow-700 border border-yellow-200' :
                        lotData.status === 'published' ? 'bg-purple-100 text-purple-700' :
                        'bg-green-100 text-green-700'
                      }`}>
                        {lotData.status === 'draft' ? 'Brouillon' :
                         lotData.status === 'ready' ? 'Prêt' :
                         lotData.status === 'scheduled' ? 'Planifié' :
                         lotData.status === 'published' ? 'Publié' :
                         'Vendu'}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-sm font-semibold text-gray-700 mb-3">Articles inclus</h4>
                <div className="space-y-2 max-h-60 overflow-y-auto">
                  {getSelectedArticles().map((article) => (
                    <div key={article.id} className="flex items-center gap-3 p-3 bg-white border border-gray-200 rounded-xl">
                      <div className="w-12 h-12 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                        {article.photos?.[0] ? (
                          <img src={article.photos[0]} alt={article.title} className="w-full h-full object-cover" />
                        ) : (
                          <Package className="w-6 h-6 text-gray-300 m-auto mt-3" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900 truncate">{article.title}</p>
                        <p className="text-xs text-gray-500">{article.brand || 'Sans marque'}</p>
                      </div>
                      <span className="text-sm font-semibold text-gray-900">{article.price.toFixed(0)}€</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between p-6 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={handlePrevious}
            disabled={currentStep === 1}
            variant="outline"
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Précédent
          </Button>

          {currentStep < 4 ? (
            <Button onClick={handleNext} className="gap-2">
              Suivant
              <ChevronRight className="w-4 h-4" />
            </Button>
          ) : (
            <Button onClick={handleSubmit} disabled={loading} className="gap-2">
              {loading ? 'Création...' : 'Créer le lot'}
              <Check className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
