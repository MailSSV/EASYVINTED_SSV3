import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ChevronLeft, Package, Calendar, Tag, TrendingDown } from 'lucide-react';
import { Lot, LotStatus } from '../types/lot';
import { Article } from '../types/article';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Toast } from '../components/ui/Toast';

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

  useEffect(() => {
    if (id) {
      fetchLot();
    }
  }, [id]);

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

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  if (!lot) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Lot introuvable</h2>
          <Button onClick={() => navigate('/lots')}>Retour aux lots</Button>
        </div>
      </div>
    );
  }

  const allPhotos = [
    ...(lot.photos || []),
    ...articles.flatMap(a => a.photos || [])
  ].filter(Boolean);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 pb-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <button
          onClick={() => navigate('/lots')}
          className="mb-6 inline-flex items-center gap-2 text-gray-600 hover:text-gray-900 transition-colors"
        >
          <ChevronLeft className="w-5 h-5" />
          Retour aux lots
        </button>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden mb-4">
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
            </div>

            {allPhotos.length > 1 && (
              <div className="grid grid-cols-5 gap-2">
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

            <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
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
    </div>
  );
}
