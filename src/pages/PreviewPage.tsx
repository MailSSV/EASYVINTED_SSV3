import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Edit, Send, Package, ShoppingBag, ChevronLeft, ChevronRight, CheckCircle, Layers, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { supabase } from '../lib/supabase';
import { Article } from '../types/article';
import { Modal } from '../components/ui/Modal';

export function PreviewPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [modalState, setModalState] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'error' }>(
    { isOpen: false, title: '', message: '', type: 'info' }
  );

  useEffect(() => {
    if (id) {
      fetchArticle();
    }
  }, [id]);

  async function fetchArticle() {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setArticle({
          ...data,
          price: parseFloat(data.price),
        });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: 'Erreur lors du chargement de l\'article',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  }

  async function handleValidateAndSend() {
    console.log('TODO: Future API call to automation service');
    console.log('Article ID:', id);
    setModalState({
      isOpen: true,
      title: 'Paramètres Vinted enregistrés (simulation)',
      message: 'L\'annonce serait envoyée à Vinted via automatisation (Puppeteer/Playwright).',
      type: 'info'
    });
  }

  const CONDITION_LABELS: Record<string, string> = {
    new_with_tags: 'Neuf avec étiquette',
    new_without_tags: 'Neuf sans étiquette',
    very_good: 'Très bon état',
    good: 'Bon état',
    satisfactory: 'Satisfaisant',
  };

  const handlePreviousPhoto = () => {
    if (!article?.photos) return;
    setCurrentPhotoIndex((prev) => (prev === 0 ? article.photos.length - 1 : prev - 1));
  };

  const handleNextPhoto = () => {
    if (!article?.photos) return;
    setCurrentPhotoIndex((prev) => (prev === article.photos.length - 1 ? 0 : prev + 1));
  };

  const handlePhotoClick = (index: number) => {
    setCurrentPhotoIndex(index);
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
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Button
            variant="secondary"
            onClick={() => navigate('/dashboard')}
            className="mb-4"
          >
            Retour
          </Button>
          <h1 className="text-3xl font-bold text-gray-900">Prévisualisation de l'annonce</h1>
          <p className="text-gray-600 mt-2">
            Vérifiez le rendu de votre annonce avant de l'envoyer sur Vinted
          </p>
        </div>

        {loading ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mb-4"></div>
              <p className="text-gray-600">Chargement...</p>
            </div>
          </div>
        ) : !article ? (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-12">
            <div className="flex flex-col items-center justify-center text-center">
              <Package className="w-20 h-20 text-gray-300 mb-4" />
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Article non trouvé
              </h2>
            </div>
          </div>
        ) : (
          <>
            {article.status === 'ready' && (
              <div className="bg-emerald-50 border-l-4 border-emerald-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-emerald-900 mb-1">Statut : Prêt pour Vinted</h3>
                  <p className="text-sm text-emerald-800">Tous les champs requis sont remplis. Vous pouvez maintenant envoyer cette annonce sur la plateforme Vinted.</p>
                </div>
              </div>
            )}
            {article.status === 'draft' && (
              <div className="bg-amber-50 border-l-4 border-amber-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Package className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-amber-900 mb-1">Statut : Brouillon</h3>
                  <p className="text-sm text-amber-800">Cette annonce est en cours de préparation. Complétez tous les champs requis avant de l'envoyer sur Vinted.</p>
                </div>
              </div>
            )}
            {article.status === 'scheduled' && (
              <div className="bg-blue-50 border-l-4 border-blue-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Calendar className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-blue-900 mb-1">Statut : Planifié</h3>
                  <p className="text-sm text-blue-800">
                    {article.scheduled_at ? (
                      <>
                        Publication prévue le{' '}
                        <span className="font-semibold">
                          {new Date(article.scheduled_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </>
                    ) : (
                      'Cette annonce est planifiée pour une publication ultérieure sur Vinted.'
                    )}
                  </p>
                </div>
              </div>
            )}
            {article.status === 'published' && (
              <div className="bg-purple-50 border-l-4 border-purple-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <Send className="w-5 h-5 text-purple-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-purple-900 mb-1">Statut : Publié</h3>
                  <p className="text-sm text-purple-800">
                    {article.published_at ? (
                      <>
                        Publié le{' '}
                        <span className="font-semibold">
                          {new Date(article.published_at).toLocaleDateString('fr-FR', {
                            day: 'numeric',
                            month: 'long',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      </>
                    ) : (
                      'Cette annonce est actuellement en ligne sur Vinted.'
                    )}
                  </p>
                </div>
              </div>
            )}
            {article.status === 'sold' && (
              <div className="bg-green-50 border-l-4 border-green-500 rounded-lg p-4 mb-6 flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                <div>
                  <h3 className="font-semibold text-green-900 mb-1">Statut : Vendu</h3>
                  <p className="text-sm text-green-800">Cet article a été vendu avec succès.</p>
                </div>
              </div>
            )}

            <div className="space-y-6 mb-6">
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                {article.photos && article.photos.length > 0 ? (
                  <div className="aspect-[16/10] bg-gray-50 relative group">
                    <img
                      src={article.photos[currentPhotoIndex]}
                      alt={article.title}
                      className="w-full h-full object-cover"
                    />
                    {article.photos.length > 1 && (
                      <>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handlePreviousPhoto();
                          }}
                          className="absolute left-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronLeft className="w-6 h-6" />
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleNextPhoto();
                          }}
                          className="absolute right-4 top-1/2 -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full transition-all opacity-0 group-hover:opacity-100"
                        >
                          <ChevronRight className="w-6 h-6" />
                        </button>
                        <div className="absolute bottom-4 right-4 bg-black/70 text-white px-3 py-1.5 rounded-full text-sm font-medium backdrop-blur-sm">
                          {currentPhotoIndex + 1} / {article.photos.length}
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div className="aspect-[16/10] bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
                    <Package className="w-24 h-24 text-gray-300" />
                  </div>
                )}

                {article.photos && article.photos.length > 1 && (
                  <div className="p-4 bg-white border-t border-gray-200">
                    <div className="grid grid-cols-6 gap-2">
                      {article.photos.map((photo, index) => (
                        <button
                          key={index}
                          onClick={() => handlePhotoClick(index)}
                          className={`aspect-square bg-gray-100 rounded-lg overflow-hidden border-2 transition-all ${
                            index === currentPhotoIndex ? 'border-emerald-500 ring-2 ring-emerald-200' : 'border-gray-200 hover:border-gray-300'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`${article.title} - ${index + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div className="mb-6">
                  <h2 className="text-3xl font-bold text-gray-900 mb-3">
                    {article.title}
                  </h2>
                  <div className="flex items-center gap-2 text-gray-600 mb-4">
                    <ShoppingBag className="w-5 h-5" />
                    <span className="text-lg font-medium">{article.brand || 'Non spécifié'}</span>
                  </div>
                  <div className="flex items-baseline gap-2">
                    <span className="text-5xl font-bold text-emerald-600">
                      {article.price.toFixed(2)} €
                    </span>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4">
                    Description
                  </h3>
                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 leading-relaxed whitespace-pre-wrap">
                      {article.description || 'Aucune description'}
                    </p>
                  </div>
                </div>

                <div className="border-t border-gray-200 pt-6 mb-6">
                  <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                    <Package className="w-4 h-4" />
                    Caractéristiques
                  </h3>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Taille</p>
                      <p className="font-semibold text-gray-900">{article.size || 'Non spécifié'}</p>
                    </div>

                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">État</p>
                      <p className="font-semibold text-gray-900">
                        {CONDITION_LABELS[article.condition] || article.condition}
                      </p>
                    </div>

                    {article.color && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Couleur</p>
                        <p className="font-semibold text-gray-900">{article.color}</p>
                      </div>
                    )}

                    {article.material && (
                      <div className="p-3 bg-gray-50 rounded-lg">
                        <p className="text-xs text-gray-500 uppercase tracking-wide mb-1">Matière</p>
                        <p className="font-semibold text-gray-900">{article.material}</p>
                      </div>
                    )}
                  </div>
                </div>

                {(article.main_category || article.subcategory || article.item_category) && (
                  <div className="border-t border-gray-200 pt-6">
                    <h3 className="text-sm font-semibold text-gray-900 uppercase tracking-wide mb-4 flex items-center gap-2">
                      <Layers className="w-4 h-4" />
                      Catégorisation Vinted
                    </h3>
                    <div className="space-y-2">
                      {article.main_category && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-xs text-blue-700 font-medium">Catégorie principale</span>
                          <span className="text-sm text-blue-900 font-semibold">{article.main_category}</span>
                        </div>
                      )}
                      {article.subcategory && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-xs text-blue-700 font-medium">Sous-catégorie</span>
                          <span className="text-sm text-blue-900 font-semibold">{article.subcategory}</span>
                        </div>
                      )}
                      {article.item_category && (
                        <div className="flex items-center justify-between p-3 bg-blue-50 rounded-lg">
                          <span className="text-xs text-blue-700 font-medium">Type d'article</span>
                          <span className="text-sm text-blue-900 font-semibold">{article.item_category}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            <div className="flex flex-col md:flex-row items-stretch md:items-center justify-center md:justify-end gap-3">
              <Button
                variant="secondary"
                onClick={() => navigate(`/articles/${id}/edit`)}
                className="px-6 w-full md:w-auto"
              >
                <Edit className="w-4 h-4 mr-2" />
                Modifier
              </Button>
              <Button onClick={handleValidateAndSend} className="px-6 w-full md:w-auto">
                <Send className="w-4 h-4 mr-2" />
                Valider et envoyer à Vinted
              </Button>
            </div>
          </>
        )}
      </div>
    </>
  );
}
