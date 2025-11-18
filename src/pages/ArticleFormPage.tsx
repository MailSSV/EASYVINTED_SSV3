import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Save, CheckCircle, Trash2, Send } from 'lucide-react';
import { Condition, Season, ArticleStatus } from '../types/article';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { PhotoUpload } from '../components/PhotoUpload';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PublishInstructionsModal } from '../components/PublishInstructionsModal';
import { VINTED_CATEGORIES } from '../constants/categories';
import { COLORS, MATERIALS } from '../constants/articleAttributes';

const CONDITION_LABELS: Record<Condition, string> = {
  new_with_tag: 'Neuf avec étiquette',
  new_without_tag: 'Neuf sans étiquette',
  new_with_tags: 'Neuf avec étiquettes',
  new_without_tags: 'Neuf sans étiquettes',
  very_good: 'Très bon état',
  good: 'Bon état',
  satisfactory: 'Satisfaisant',
};

const SEASON_LABELS: Record<Season, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
  'all-seasons': 'Toutes saisons',
  undefined: 'Non défini',
};

export function ArticleFormPage() {
  const navigate = useNavigate();
  const { id } = useParams();
  const { user } = useAuth();

  const [loading, setLoading] = useState(false);
  const [analyzingWithAI, setAnalyzingWithAI] = useState(false);
  const [modalState, setModalState] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    type: 'info' | 'error' | 'success';
  }>({
    isOpen: false,
    title: '',
    message: '',
    type: 'info',
  });
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{ clothing_size: string; shoe_size: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishInstructionsModal, setPublishInstructionsModal] = useState<{ isOpen: boolean; articleId: string }>({
    isOpen: false,
    articleId: '',
  });

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    brand: '',
    size: '',
    condition: 'good' as Condition,
    main_category: '',
    subcategory: '',
    item_category: '',
    price: '',
    actual_value: '',
    season: 'undefined' as Season,
    suggested_period: '',
    photos: [] as string[],
    color: '',
    material: '',
  });

  const selectedCategory = VINTED_CATEGORIES.find((c) => c.name === formData.main_category);
  const selectedSubcategory = selectedCategory?.subcategories.find((s) => s.name === formData.subcategory);

  useEffect(() => {
    loadUserProfile();
    if (id) {
      fetchArticle();
    }
  }, [id]);

  async function loadUserProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('clothing_size, shoe_size')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setUserProfile({
          clothing_size: data.clothing_size || '',
          shoe_size: data.shoe_size || '',
        });
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
    }
  }

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
        setFormData({
          title: data.title,
          description: data.description || '',
          brand: data.brand || '',
          size: data.size || '',
          condition: data.condition as Condition,
          main_category: data.main_category || '',
          subcategory: data.subcategory || '',
          item_category: data.item_category || '',
          price: data.price.toString(),
          actual_value: data.actual_value ? data.actual_value.toString() : '',
          season: data.season as Season,
          suggested_period: data.suggested_period || '',
          photos: data.photos || [],
          color: data.color || '',
          material: data.material || '',
        });
      }
    } catch (error) {
      console.error('Error fetching article:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors du chargement de l'article",
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  }

  const handleAnalyzeWithAI = async () => {
    if (formData.photos.length === 0) {
      setModalState({
        isOpen: true,
        title: 'Aucune photo',
        message: "Veuillez ajouter au moins une photo pour utiliser l'analyse IA",
        type: 'error',
      });
      return;
    }

    try {
      setAnalyzingWithAI(true);

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-article-image`;
      const headers = {
        Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({ imageUrls: formData.photos }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || "Erreur lors de l'analyse de l'image");
      }

      const analysisResult = await response.json();

      let mainCategory = 'Femmes';
      let subcategory = 'Vêtements';
      let itemCategory = '';
      let defaultSize = formData.size;

      const aiSubcategory = analysisResult.subcategory?.toLowerCase() || '';
      const isShoeCategory =
        aiSubcategory.includes('basket') ||
        aiSubcategory.includes('sneaker') ||
        aiSubcategory.includes('botte') ||
        aiSubcategory.includes('bottine') ||
        aiSubcategory.includes('sandale') ||
        aiSubcategory.includes('talon');

      if (aiSubcategory.includes('robe')) {
        subcategory = 'Vêtements';
        itemCategory = 'Robes';
      } else if (aiSubcategory.includes('t-shirt') || aiSubcategory.includes('tee-shirt')) {
        subcategory = 'Vêtements';
        itemCategory = 'T-shirts';
      } else if (aiSubcategory.includes('top') || aiSubcategory.includes('débardeur') || aiSubcategory.includes('tank')) {
        subcategory = 'Vêtements';
        itemCategory = 'Tops & débardeurs';
      } else if (aiSubcategory.includes('chemis') || aiSubcategory.includes('blouse')) {
        subcategory = 'Vêtements';
        itemCategory = 'Chemises & blouses';
      } else if (aiSubcategory.includes('pull') || aiSubcategory.includes('sweat') || aiSubcategory.includes('hoodie') || aiSubcategory.includes('gilet')) {
        subcategory = 'Vêtements';
        itemCategory = 'Pulls, sweats & hoodies';
      } else if (aiSubcategory.includes('manteau') || aiSubcategory.includes('veste') || aiSubcategory.includes('blouson') || aiSubcategory.includes('jacket')) {
        subcategory = 'Vêtements';
        itemCategory = 'Manteaux & vestes';
      } else if (aiSubcategory.includes('jean')) {
        subcategory = 'Vêtements';
        itemCategory = 'Jeans';
      } else if (aiSubcategory.includes('pantalon')) {
        subcategory = 'Vêtements';
        itemCategory = 'Pantalons';
      } else if (aiSubcategory.includes('short')) {
        subcategory = 'Vêtements';
        itemCategory = 'Shorts';
      } else if (aiSubcategory.includes('jupe')) {
        subcategory = 'Vêtements';
        itemCategory = 'Jupes';
      } else if (aiSubcategory.includes('maillot')) {
        subcategory = 'Vêtements';
        itemCategory = 'Maillots de bain';
      } else if (aiSubcategory.includes('sport')) {
        subcategory = 'Vêtements';
        itemCategory = 'Sportswear';
      } else if (aiSubcategory.includes('basket') || aiSubcategory.includes('sneaker')) {
        subcategory = 'Chaussures';
        itemCategory = 'Baskets';
      } else if (aiSubcategory.includes('botte')) {
        subcategory = 'Chaussures';
        itemCategory = 'Bottes';
      } else if (aiSubcategory.includes('bottine')) {
        subcategory = 'Chaussures';
        itemCategory = 'Bottines';
      } else if (aiSubcategory.includes('sandale')) {
        subcategory = 'Chaussures';
        itemCategory = 'Sandales';
      } else if (aiSubcategory.includes('talon')) {
        subcategory = 'Chaussures';
        itemCategory = 'Talons';
      } else if (aiSubcategory.includes('sac')) {
        subcategory = 'Sacs';
        if (aiSubcategory.includes('dos')) {
          itemCategory = 'Sacs à dos';
        } else if (aiSubcategory.includes('bandoulière')) {
          itemCategory = 'Sacs bandoulière';
        } else {
          itemCategory = 'Sacs à main';
        }
      }

      if (!analysisResult.size && userProfile) {
        if (isShoeCategory && userProfile.shoe_size) {
          defaultSize = userProfile.shoe_size;
        } else if (!isShoeCategory && userProfile.clothing_size) {
          defaultSize = userProfile.clothing_size;
        }
      }

      setFormData({
        ...formData,
        title: analysisResult.title || formData.title,
        description: analysisResult.description || formData.description,
        brand: analysisResult.brand || formData.brand,
        size: analysisResult.size || defaultSize,
        condition: analysisResult.condition || formData.condition,
        main_category: mainCategory,
        subcategory: subcategory,
        item_category: itemCategory,
        price: analysisResult.estimatedPrice ? analysisResult.estimatedPrice.toString() : formData.price,
        season: analysisResult.season || formData.season,
        suggested_period: analysisResult.suggestedPeriod || formData.suggested_period,
        color: analysisResult.color || formData.color,
        material: analysisResult.material || formData.material,
      });

      setModalState({
        isOpen: true,
        title: 'Analyse terminée',
        message: "Les informations de l'article ont été remplies automatiquement. Vous pouvez les modifier si nécessaire.",
        type: 'success',
      });
    } catch (error) {
      console.error('Error analyzing image:', error);
      setModalState({
        isOpen: true,
        title: 'Erreur',
        message: "Erreur lors de l'analyse de l'image avec l'IA",
        type: 'error',
      });
    } finally {
      setAnalyzingWithAI(false);
    }
  };

  const validateForm = (): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!formData.title.trim()) errors.push('title');
    if (!formData.main_category) errors.push('main_category');
    if (!formData.subcategory) errors.push('subcategory');
    if (!formData.price || parseFloat(formData.price) <= 0) errors.push('price');

    return { isValid: errors.length === 0, errors };
  };

  const getErrorMessage = (errors: string[]): string => {
    const fieldNames: Record<string, string> = {
      title: 'Titre',
      main_category: 'Catégorie principale',
      subcategory: 'Sous-catégorie',
      price: 'Prix',
    };

    const missingFields = errors.map((error) => fieldNames[error]).join(', ');
    return `Veuillez remplir les champs obligatoires : ${missingFields}`;
  };

  const handleSubmit = async (e: FormEvent, status: ArticleStatus) => {
    e.preventDefault();
    setValidationErrors([]);
    setToast(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setToast({
        type: 'error',
        text: getErrorMessage(validation.errors),
      });
      return;
    }

    try {
      setLoading(true);

      const articleData = {
        title: formData.title,
        description: formData.description,
        brand: formData.brand,
        size: formData.size,
        condition: formData.condition,
        main_category: formData.main_category,
        subcategory: formData.subcategory,
        item_category: formData.item_category,
        price: parseFloat(formData.price),
        actual_value: formData.actual_value ? parseFloat(formData.actual_value) : null,
        season: formData.season,
        suggested_period: formData.suggested_period,
        photos: formData.photos,
        color: formData.color || null,
        material: formData.material || null,
        status,
        updated_at: new Date().toISOString(),
        ...(id ? {} : { user_id: user?.id }),
      };

      if (id) {
        const { error } = await supabase.from('articles').update(articleData).eq('id', id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from('articles').insert([articleData]);
        if (error) throw error;
      }

      setToast({
        type: 'success',
        text: `Article ${id ? 'modifié' : 'créé'} avec succès`,
      });
      setTimeout(() => navigate('/stock'), 1500);
    } catch (error) {
      console.error('Error saving article:', error);
      setToast({
        type: 'error',
        text: "Erreur lors de l'enregistrement de l'article",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;

    try {
      const { error } = await supabase.from('articles').delete().eq('id', id);
      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article supprimé avec succès',
      });

      setDeleteModal(false);
      setTimeout(() => navigate('/stock'), 1500);
    } catch (error) {
      console.error('Error deleting article:', error);
      setToast({
        type: 'error',
        text: "Erreur lors de la suppression de l'article",
      });
    }
  };

  const handlePublishToVinted = async (e: FormEvent) => {
    e.preventDefault();
    setValidationErrors([]);
    setToast(null);

    const validation = validateForm();
    if (!validation.isValid) {
      setValidationErrors(validation.errors);
      setToast({
        type: 'error',
        text: getErrorMessage(validation.errors),
      });
      return;
    }

    let articleIdToPublish = id;

    try {
      setPublishing(true);

      if (!id) {
        const articleData = {
          title: formData.title,
          description: formData.description,
          brand: formData.brand,
          size: formData.size,
          condition: formData.condition,
          main_category: formData.main_category,
          subcategory: formData.subcategory,
          item_category: formData.item_category,
          price: parseFloat(formData.price),
          actual_value: formData.actual_value ? parseFloat(formData.actual_value) : null,
          season: formData.season,
          suggested_period: formData.suggested_period,
          photos: formData.photos,
          color: formData.color || null,
          material: formData.material || null,
          status: 'ready',
          user_id: user?.id,
        };

        const { data: newArticle, error: insertError } = await supabase
          .from('articles')
          .insert([articleData])
          .select()
          .single();

        if (insertError) throw insertError;
        articleIdToPublish = newArticle.id;
      }

      setPublishInstructionsModal({
        isOpen: true,
        articleId: articleIdToPublish!,
      });
    } catch (error) {
      console.error('Error preparing article:', error);
      setToast({
        type: 'error',
        text: error instanceof Error ? error.message : "Erreur lors de la préparation de l'article",
      });
    } finally {
      setPublishing(false);
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
        onClose={() => setModalState({ ...modalState, isOpen: false })}
        title={modalState.title}
        message={modalState.message}
        type={modalState.type}
      />

      <PublishInstructionsModal
        isOpen={publishInstructionsModal.isOpen}
        onClose={() => setPublishInstructionsModal({ isOpen: false, articleId: '' })}
        articleId={publishInstructionsModal.articleId}
      />

      <div className="max-w-5xl mx-auto">
        <div className="mb-4">
          <Button
            variant="secondary"
            onClick={() => navigate(-1)}
            className="mb-4"
          >
            Retour
          </Button>
        </div>

        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            {id ? "Modifier l'article" : 'Nouvel article'}
          </h1>
          <p className="text-sm text-gray-600 mt-1">
            Remplissez les informations de votre article pour le préparer à la publication
          </p>
        </div>

        <form className="space-y-6">
          <div className="space-y-6">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Photos</h2>
              <PhotoUpload
                photos={formData.photos}
                onPhotosChange={(photos) => setFormData({ ...formData, photos })}
                onAnalyzeClick={handleAnalyzeWithAI}
                analyzing={analyzingWithAI}
              />
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations principales</h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Titre *</label>
                  <input
                    type="text"
                    required
                    value={formData.title}
                    onChange={(e) => {
                      setFormData({ ...formData, title: e.target.value });
                      if (validationErrors.includes('title')) {
                        setValidationErrors(validationErrors.filter((err) => err !== 'title'));
                      }
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      validationErrors.includes('title') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                    placeholder="Ex: Robe d'été fleurie"
                  />
                  {validationErrors.includes('title') && (
                    <p className="text-xs text-red-600 mt-1">Ce champ est obligatoire</p>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Décrivez votre article en détail..."
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Marque</label>
                    <input
                      type="text"
                      value={formData.brand}
                      onChange={(e) => setFormData({ ...formData, brand: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ex: Zara"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Taille</label>
                    <input
                      type="text"
                      value={formData.size}
                      onChange={(e) => setFormData({ ...formData, size: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="Ex: M, 38, 42"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Couleur</label>
                    <select
                      value={formData.color}
                      onChange={(e) => setFormData({ ...formData, color: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une couleur</option>
                      {COLORS.map((color) => (
                        <option key={color} value={color}>
                          {color}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Matière</label>
                    <select
                      value={formData.material}
                      onChange={(e) => setFormData({ ...formData, material: e.target.value })}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez une matière</option>
                      {MATERIALS.map((material) => (
                        <option key={material} value={material}>
                          {material}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">État *</label>
                  <select
                    required
                    value={formData.condition}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        condition: e.target.value as Condition,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Catégorie principale *
                  </label>
                  <select
                    required
                    value={formData.main_category}
                    onChange={(e) => {
                      setFormData({
                        ...formData,
                        main_category: e.target.value,
                        subcategory: '',
                        item_category: '',
                      });
                      if (validationErrors.includes('main_category')) {
                        setValidationErrors(validationErrors.filter((err) => err !== 'main_category'));
                      }
                    }}
                    className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                      validationErrors.includes('main_category') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Sélectionnez une catégorie</option>
                    {VINTED_CATEGORIES.map((category) => (
                      <option key={category.name} value={category.name}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {validationErrors.includes('main_category') && (
                    <p className="text-xs text-red-600 mt-1">Ce champ est obligatoire</p>
                  )}
                </div>

                {formData.main_category && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Sous-catégorie *
                    </label>
                    <select
                      required
                      value={formData.subcategory}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          subcategory: e.target.value,
                          item_category: '',
                        });
                        if (validationErrors.includes('subcategory')) {
                          setValidationErrors(validationErrors.filter((err) => err !== 'subcategory'));
                        }
                      }}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        validationErrors.includes('subcategory') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                    >
                      <option value="">Sélectionnez une sous-catégorie</option>
                      {selectedCategory?.subcategories.map((subcategory) => (
                        <option key={subcategory.name} value={subcategory.name}>
                          {subcategory.name}
                        </option>
                      ))}
                    </select>
                    {validationErrors.includes('subcategory') && (
                      <p className="text-xs text-red-600 mt-1">Ce champ est obligatoire</p>
                    )}
                  </div>
                )}

                {formData.subcategory && selectedSubcategory && selectedSubcategory.items.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">Type d'article</label>
                    <select
                      value={formData.item_category}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          item_category: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    >
                      <option value="">Sélectionnez un type (optionnel)</option>
                      {selectedSubcategory.items.map((item) => (
                        <option key={item} value={item}>
                          {item}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Valeur estimée (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={formData.actual_value}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          actual_value: e.target.value,
                        })
                      }
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                      placeholder="10.00"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Valeur d'occasion ou coût d'acquisition de l'article
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">
                      Prix de vente (€) *
                    </label>
                    <input
                      type="number"
                      required
                      step="0.01"
                      min="0"
                      value={formData.price}
                      onChange={(e) => {
                        setFormData({
                          ...formData,
                          price: e.target.value,
                        });
                        if (validationErrors.includes('price')) {
                          setValidationErrors(validationErrors.filter((err) => err !== 'price'));
                        }
                      }}
                      className={`w-full px-3 py-2 text-sm border rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent ${
                        validationErrors.includes('price') ? 'border-red-500 bg-red-50' : 'border-gray-300'
                      }`}
                      placeholder="25.00"
                    />
                    {validationErrors.includes('price') && (
                      <p className="text-xs text-red-600 mt-1">
                        Ce champ est obligatoire et doit être supérieur à 0
                      </p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h2 className="text-lg font-semibold text-gray-900 mb-4">
                Saison & période conseillée
              </h2>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Saison</label>
                  <select
                    value={formData.season}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        season: e.target.value as Season,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                  >
                    {Object.entries(SEASON_LABELS).map(([value, label]) => (
                      <option key={value} value={value}>
                        {label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">
                    Période conseillée
                  </label>
                  <input
                    type="text"
                    value={formData.suggested_period}
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        suggested_period: e.target.value,
                      })
                    }
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-md focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
                    placeholder="Ex: Avril - Juin"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  onClick={(e) => handleSubmit(e as any, 'draft')}
                  disabled={loading || publishing}
                  className="w-full sm:w-auto justify-center"
                >
                  <Save className="w-4 h-4" />
                  <span className="hidden sm:inline">Enregistrer comme brouillon</span>
                  <span className="sm:hidden">Brouillon</span>
                </Button>

                <Button
  type="button"
  variant="secondary"
  onClick={(e) => handleSubmit(e as any, 'ready')}
  disabled={loading || publishing}
  className="w-full sm:w-auto justify-center bg-blue-50 text-blue-600 border border-blue-200 hover:bg-blue-100"
>
  <CheckCircle className="w-4 h-4 mr-1" />
  <span className="hidden sm:inline">Marquer comme prêt pour Vinted</span>
  <span className="sm:hidden">Prêt</span>
</Button>


                <Button
                  type="button"
                  onClick={handlePublishToVinted}
                  disabled={loading || publishing}
                  className="w-full sm:w-auto justify-center bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  <Send className="w-4 h-4" />
                  <span className="hidden sm:inline">
                    {publishing ? 'Publication en cours...' : 'Envoyer à Vinted'}
                  </span>
                  <span className="sm:hidden">
                    {publishing ? 'Envoi...' : 'Envoyer à Vinted'}
                  </span>
                </Button>
              </div>

              {id && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setDeleteModal(true)}
                  disabled={loading || publishing}
                  className="w-full sm:w-auto justify-center bg-red-50 text-red-600 hover:bg-red-100 border-red-200"
                >
                  <Trash2 className="w-4 h-4" />
                  Supprimer
                </Button>
              )}
            </div>
          </div>
        </form>

        <ConfirmModal
          isOpen={deleteModal}
          onClose={() => setDeleteModal(false)}
          onConfirm={handleDelete}
          title="Supprimer l'article"
          message="Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible."
          confirmLabel="Supprimer"
          variant="danger"
        />
      </div>
    </>
  );
}
