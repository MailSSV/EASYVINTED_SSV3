import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Copy, CheckCircle, ArrowLeft, ExternalLink, SplitSquareHorizontal } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { VINTED_CATEGORIES } from '../constants/categories';

interface Article {
  id: string;
  title: string;
  description: string;
  price: number;
  brand: string;
  size: string;
  condition: string;
  color?: string;
  material?: string;
  category_id: number;
  subcategory_id?: number;
  photos: string[];
}

const CONDITION_LABELS: Record<string, string> = {
  new_with_tag: 'Neuf avec étiquette',
  new_without_tag: 'Neuf sans étiquette',
  new_with_tags: 'Neuf avec étiquettes',
  new_without_tags: 'Neuf sans étiquettes',
  very_good: 'Très bon état',
  good: 'Bon état',
  satisfactory: 'Satisfaisant',
};

export function StructureFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [article, setArticle] = useState<Article | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [markingAsPublished, setMarkingAsPublished] = useState(false);

  useEffect(() => {
    if (!id) return;
    loadArticle();
  }, [id]);

  async function loadArticle() {
    if (!id || !user) return;

    try {
      const { data, error } = await supabase
        .from('articles')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) throw error;
      setArticle(data);
    } catch (error) {
      console.error('Error loading article:', error);
      setToast({ message: 'Erreur lors du chargement de l\'article', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  const copyToClipboard = (text: string, fieldName: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(fieldName);
    setToast({ message: `${fieldName} copié !`, type: 'success' });
    setTimeout(() => setCopiedField(null), 2000);
  };

  const getCategoryName = (categoryId: number) => {
    const category = VINTED_CATEGORIES.find(c => c.id === categoryId);
    return category?.title || 'Non définie';
  };

  const getSubcategoryName = (categoryId: number, subcategoryId?: number) => {
    if (!subcategoryId) return 'Non définie';
    const category = VINTED_CATEGORIES.find(c => c.id === categoryId);
    const subcategory = category?.subcategories?.find(s => s.id === subcategoryId);
    return subcategory?.title || 'Non définie';
  };

  const markAsPublished = async () => {
    if (!id || !user) return;

    setMarkingAsPublished(true);
    try {
      const { error } = await supabase
        .from('articles')
        .update({
          status: 'published',
          published_at: new Date().toISOString()
        })
        .eq('id', id)
        .eq('user_id', user.id);

      if (error) throw error;

      setToast({ message: 'Article marqué comme publié !', type: 'success' });
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error marking article as published:', error);
      setToast({ message: 'Erreur lors de la mise à jour', type: 'error' });
    } finally {
      setMarkingAsPublished(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Chargement...</p>
        </div>
      </div>
    );
  }

  if (!article) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-8">
        <p className="text-red-600">Article non trouvé</p>
      </div>
    );
  }

  const fields = [
    {
      name: 'Photos',
      value: `${article.photos.length} photo(s)`,
      description: 'Téléchargez vos photos dans l\'ordre',
      copyable: false,
      showPhotos: true,
    },
    {
      name: 'Titre',
      value: article.title,
      description: 'Le titre de votre article',
    },
    {
      name: 'Description',
      value: article.description,
      description: 'Description détaillée de l\'article',
      multiline: true,
    },
    {
      name: 'Catégorie',
      value: `${getCategoryName(article.category_id)} > ${getSubcategoryName(article.category_id, article.subcategory_id)}`,
      description: 'Sélectionnez la catégorie et sous-catégorie correspondante',
    },
    {
      name: 'Marque',
      value: article.brand,
      description: 'La marque du produit',
    },
    {
      name: 'Taille',
      value: article.size,
      description: 'La taille de l\'article',
    },
    {
      name: 'État',
      value: CONDITION_LABELS[article.condition] || article.condition,
      description: 'L\'état du produit',
    },
    {
      name: 'Couleur',
      value: article.color || 'Non définie',
      description: 'Couleur principale',
    },
    {
      name: 'Matière',
      value: article.material || 'Non définie',
      description: 'Matière principale',
    },
    {
      name: 'Prix',
      value: `${article.price.toFixed(2)} €`,
      description: 'Prix de vente',
    },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="mb-6">
        <Button
          variant="secondary"
          onClick={() => navigate('/dashboard')}
          className="mb-4"
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Retour au tableau de bord
        </Button>

        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Formulaire de publication Vinted
        </h1>
        <p className="text-gray-600">
          Copiez les informations dans l'ordre pour les coller sur Vinted
        </p>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <h2 className="font-semibold text-blue-900 mb-2">Mode d'emploi</h2>
        <ol className="list-decimal list-inside space-y-1 text-blue-800 text-sm">
          <li>Ouvrez Vinted dans un nouvel onglet (et identifiez vous si besoin)</li>
          <div className="flex flex-col gap-2 mt-3">
          <a
            href="https://www.vinted.fr/items/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <ExternalLink className="w-4 h-4 mr-1" />
            Ouvrir Vinted (nouvel onglet)
          </a>
         
          
        </div>
          <li>Placez l'onglet Vinted sur la barre latérale de votre navigateur pour l'afficher "Cote à Cote" avec celui-ci (ou REcommandé : Clic droit sur l'onglet + Placer dans la barre latérale) </li>
          <li>Glissez-Déposez vos Photos dans la section "+ Ajoute des Photos" de Vinted </li>
          <li>Cliquez sur le bouton Copier pour chaque champ</li>
          <li>Collez la valeur dans le champ correspondant sur Vinted</li>
              </ol>
        
      </div>

      <div className="space-y-4">
        {fields.map((field, index) => (
          <div
            key={field.name}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="flex items-start space-x-3 flex-1">
                <span className="flex-shrink-0 w-8 h-8 bg-teal-100 text-teal-700 rounded-full flex items-center justify-center font-semibold text-sm">
                  {index + 1}
                </span>
                <div className="flex-1">
                  <h3 className="font-semibold text-gray-900">{field.name}</h3>
                  <p className="text-sm text-gray-500 mt-1">{field.description}</p>
                </div>
              </div>
              {field.copyable !== false && (
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => copyToClipboard(field.value, field.name)}
                  className="ml-4"
                >
                  {copiedField === field.name ? (
                    <>
                      <CheckCircle className="w-4 h-4 mr-1" />
                      Copié
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 mr-1" />
                      Copier
                    </>
                  )}
                </Button>
              )}
            </div>

            {field.showPhotos && article.photos.length > 0 && (
              <div className="mt-3 grid grid-cols-4 gap-2">
                {article.photos.map((photo, idx) => (
                  <div key={idx} className="relative aspect-square">
                    <img
                      src={photo}
                      alt={`Photo ${idx + 1}`}
                      className="w-full h-full object-cover rounded border border-gray-200"
                    />
                    <span className="absolute top-1 left-1 bg-black bg-opacity-70 text-white text-xs px-2 py-0.5 rounded">
                      {idx + 1}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {!field.showPhotos && (
              <div
                className={`mt-2 p-3 bg-gray-50 rounded border border-gray-200 ${
                  field.multiline ? 'whitespace-pre-wrap' : ''
                }`}
              >
                <p className={`text-gray-900 ${field.copyable === false ? 'italic text-gray-500' : ''}`}>
                  {field.value}
                </p>
              </div>
            )}
          </div>
        ))}
      </div>

      <div className="mt-8 p-4 bg-green-50 border border-green-200 rounded-lg">
        <h3 className="font-semibold text-green-900 mb-3">Une fois terminé</h3>
        <p className="text-green-800 text-sm mb-4">
          Après avoir publié l'article sur Vinted, n'oubliez pas de marquer cet article comme "Publié" dans votre tableau de bord EasyVinted.
        </p>
        <Button
          onClick={markAsPublished}
          disabled={markingAsPublished}
          className="w-full sm:w-auto"
        >
          {markingAsPublished ? (
            <>
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Enregistrement...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Marquer cet article comme Publié
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
