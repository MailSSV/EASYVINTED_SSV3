import { useState, FormEvent, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Save,
  CheckCircle,
  Trash2,
  Send,
  Calendar,
  DollarSign,
  Edit,
  Eye,
  Tag,
} from 'lucide-react';
import { Condition, Season, ArticleStatus } from '../types/article';
import { Toast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { PhotoUpload } from '../components/PhotoUpload';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { PublishInstructionsModal } from '../components/PublishInstructionsModal';
import { ScheduleModal } from '../components/ScheduleModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { LabelModal } from '../components/LabelModal';
import { VINTED_CATEGORIES } from '../constants/categories';
import { COLORS, MATERIALS } from '../constants/articleAttributes';
import { migratePhotosFromTempFolder } from '../lib/photoMigration';

// UI Kit Apple-style
import {
  PageContainer,
  PageSection,
  Card,
  SoftCard,
  Pill,
  PrimaryButton,
  GhostButton,
} from '../components/ui/UiKit';

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

const STATUS_LABELS: Record<ArticleStatus, string> = {
  draft: 'Brouillon',
  ready: 'Prêt',
  scheduled: 'Planifié',
  published: 'Publié',
  sold: 'Vendu',
};

function getStatusVariant(status: ArticleStatus) {
  switch (status) {
    case 'draft':
      return 'neutral';
    case 'ready':
      return 'primary';
    case 'scheduled':
      return 'warning';
    case 'published':
      return 'primary';
    case 'sold':
      return 'success';
    default:
      return 'neutral';
  }
}

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
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [validationErrors, setValidationErrors] = useState<string[]>([]);
  const [userProfile, setUserProfile] = useState<{
    clothing_size: string;
    shoe_size: string;
  } | null>(null);
  const [deleteModal, setDeleteModal] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [publishInstructionsModal, setPublishInstructionsModal] = useState<{
    isOpen: boolean;
    articleId: string;
  }>({
    isOpen: false,
    articleId: '',
  });
  const [scheduleModal, setScheduleModal] = useState(false);
  const [soldModal, setSoldModal] = useState(false);
  const [saleDetailModal, setSaleDetailModal] = useState(false);
  const [labelModal, setLabelModal] = useState(false);
  const [currentArticle, setCurrentArticle] = useState<any>(null);
  const [articleStatus, setArticleStatus] = useState<ArticleStatus>('draft');
  const [sellerName, setSellerName] = useState<string | null>(null);

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
    season: 'undefined' as Season,
    suggested_period: '',
    photos: [] as string[],
    color: '',
    material: '',
    seller_id: null as string | null,
    reference_number: '',
  });

  const selectedCategory = VINTED_CATEGORIES.find(
    (c) => c.name === formData.main_category
  );
  const selectedSubcategory = selectedCategory?.subcategories.find(
    (s) => s.name === formData.subcategory
  );
  const [familyMembers, setFamilyMembers] = useState<
    Array<{
      id: string;
      name: string;
      is_default: boolean;
      clothing_size: string | null;
      shoe_size: string | null;
    }>
  >([]);

  useEffect(() => {
    loadUserProfile();
    loadFamilyMembers();
    if (id) {
      fetchArticle();
    }
  }, [id]);

  useEffect(() => {
    if (!id && formData.seller_id) {
      const selectedSeller = familyMembers.find((m) => m.id === formData.seller_id);
      if (selectedSeller) {
        const isShoeCategory =
          formData.subcategory === 'Chaussures' ||
          formData.subcategory === 'Chaussures enfants' ||
          formData.item_category?.toLowerCase().includes('chaussure');

        if (isShoeCategory && selectedSeller.shoe_size) {
          setFormData((prev) => ({ ...prev, size: selectedSeller.shoe_size || '' }));
        } else if (!isShoeCategory && selectedSeller.clothing_size) {
          setFormData((prev) => ({ ...prev, size: selectedSeller.clothing_size || '' }));
        }
      }
    } else if (!id && userProfile && !formData.size && !formData.seller_id) {
      const isShoeCategory =
        formData.subcategory === 'Chaussures' ||
        formData.subcategory === 'Chaussures enfants' ||
        formData.item_category?.toLowerCase().includes('chaussure');

      if (isShoeCategory && userProfile.shoe_size) {
        setFormData((prev) => ({ ...prev, size: userProfile.shoe_size }));
      } else if (!isShoeCategory && userProfile.clothing_size) {
        setFormData((prev) => ({ ...prev, size: userProfile.clothing_size }));
      }
    }
  }, [
    userProfile,
    formData.subcategory,
    formData.item_category,
    formData.seller_id,
    familyMembers,
    id,
  ]);

  async function loadUserProfile() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('clothing_size, shoe_size, dressing_name')
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

  async function generateReferenceNumber(): Promise<string> {
    if (!user)
      return `REF-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;

    try {
      const { data: profile } = await supabase
        .from('user_profiles')
        .select('dressing_name')
        .eq('id', user.id)
        .maybeSingle();

      const { count } = await supabase
        .from('articles')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id);

      const dressingName = (profile?.dressing_name || 'MonDressing').replace(/\s+/g, '_');

      let sellerNamePart = 'Principal';
      if (formData.seller_id) {
        const seller = familyMembers.find((m) => m.id === formData.seller_id);
        if (seller) {
          sellerNamePart = seller.name.replace(/\s+/g, '_');
        }
      }

      const itemNumber = (count || 0) + 1;

      return `${dressingName}_${sellerNamePart}_${itemNumber}`;
    } catch (error) {
      console.error('Error generating reference number:', error);
      return `REF-${Date.now()}-${Math.random()
        .toString(36)
        .substring(2, 9)
        .toUpperCase()}`;
    }
  }

  function updateSizeFromSeller(seller: {
    clothing_size: string | null;
    shoe_size: string | null;
  }) {
    if (!id) {
      const isShoeCategory =
        formData.subcategory === 'Chaussures' ||
        formData.subcategory === 'Chaussures enfants' ||
        formData.item_category?.toLowerCase().includes('chaussure');

      if (isShoeCategory && seller.shoe_size) {
        setFormData((prev) => ({ ...prev, size: seller.shoe_size || '' }));
      } else if (!isShoeCategory && seller.clothing_size) {
        setFormData((prev) => ({ ...prev, size: seller.clothing_size || '' }));
      }
    }
  }

  function handleSellerChange(sellerId: string) {
    setFormData((prev) => ({ ...prev, seller_id: sellerId }));
    const selectedSeller = familyMembers.find((m) => m.id === sellerId);
    if (selectedSeller) {
      updateSizeFromSeller(selectedSeller);
    }
  }

  async function loadFamilyMembers() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('id, name, is_default, clothing_size, shoe_size')
        .eq('user_id', user.id)
        .order('name');

      if (error) throw error;
      setFamilyMembers(data || []);

      if (!id && data && data.length > 0) {
        const defaultMember = data.find((m) => m.is_default);
        if (defaultMember) {
          setFormData((prev) => ({ ...prev, seller_id: defaultMember.id }));
          updateSizeFromSeller(defaultMember);
        }
      }
    } catch (error) {
      console.error('Error loading family members:', error);
    }
  }

  async function fetchArticle() {
    if (!id) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('articles')
        .select(
          `
          *,
          family_members!articles_seller_id_fkey(name)
        `
        )
        .eq('id', id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        const normalizedSeason =
          data.season === 'all_seasons' ? 'all-seasons' : data.season;
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
          season: normalizedSeason as Season,
          suggested_period: data.suggested_period || '',
          photos: data.photos || [],
          color: data.color || '',
          material: data.material || '',
          seller_id: data.seller_id || null,
          reference_number: data.reference_number || '',
        });
        setArticleStatus(data.status as ArticleStatus);
        setCurrentArticle(data);

        if (data.family_members) {
          setSellerName(data.family_members.name);
        }
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

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session) {
        throw new Error('Vous devez être connecté pour utiliser cette fonctionnalité');
      }

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-article-image`;
      const headers = {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      };

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          imageUrls: formData.photos,
          sellerId: formData.seller_id,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur inconnue' }));
        console.error('API Error:', errorData);
        throw new Error(errorData.error || "Erreur lors de l'analyse de l'image");
      }

      const analysisResult = await response.json();

      if (analysisResult.season === 'all_seasons') {
        analysisResult.season = 'all-seasons';
      }

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
      } else if (
        aiSubcategory.includes('top') ||
        aiSubcategory.includes('débardeur') ||
        aiSubcategory.includes('tank')
      ) {
        subcategory = 'Vêtements';
        itemCategory = 'Tops & débardeurs';
      } else if (aiSubcategory.includes('chemis') || aiSubcategory.includes('blouse')) {
        subcategory = 'Vêtements';
        itemCategory = 'Chemises & blouses';
      } else if (
        aiSubcategory.includes('pull') ||
        aiSubcategory.includes('sweat') ||
        aiSubcategory.includes('hoodie') ||
        aiSubcategory.includes('gilet')
      ) {
        subcategory = 'Vêtements';
        itemCategory = 'Pulls, sweats & hoodies';
      } else if (
        aiSubcategory.includes('manteau') ||
        aiSubcategory.includes('veste') ||
        aiSubcategory.includes('blouson') ||
        aiSubcategory.includes('jacket')
      ) {
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
        price: analysisResult.estimatedPrice
          ? analysisResult.estimatedPrice.toString()
          : formData.price,
        season: analysisResult.season || formData.season,
        suggested_period: analysisResult.suggestedPeriod || formData.suggested_period,
        color: analysisResult.color || formData.color,
        material: analysisResult.material || formData.material,
      });

      setModalState({
        isOpen: true,
        title: 'Analyse terminée',
        message:
          "Les informations de l'article ont été remplies automatiquement. Vous pouvez les modifier si nécessaire.",
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

      let referenceNumber = formData.reference_number;
      if (!referenceNumber) {
        referenceNumber = await generateReferenceNumber();
      }

      const articleData: any = {
        title: formData.title,
        description: formData.description,
        brand: formData.brand,
        size: formData.size,
        condition: formData.condition,
        main_category: formData.main_category,
        subcategory: formData.subcategory,
        item_category: formData.item_category,
        price: parseFloat(formData.price),
        season: formData.season,
        suggested_period: formData.suggested_period,
        photos: formData.photos,
        color: formData.color || null,
        material: formData.material || null,
        seller_id: formData.seller_id || null,
        reference_number: referenceNumber,
        status,
        updated_at: new Date().toISOString(),
        ...(id ? {} : { user_id: user?.id }),
      };

      let savedArticleId = id;

      if (id) {
        if (user?.id) {
          articleData.photos = await migratePhotosFromTempFolder(
            formData.photos,
            user.id,
            id
          );
        }

        const { error } = await supabase.from('articles').update(articleData).eq('id', id);
        if (error) throw error;

        // Gestion des selling_suggestions selon le statut
        if (status === 'draft') {
          await supabase
            .from('selling_suggestions')
            .delete()
            .eq('article_id', id)
            .eq('status', 'pending');
        } else if (status === 'ready') {
          const { data: existingSuggestion } = await supabase
            .from('selling_suggestions')
            .select('id, status')
            .eq('article_id', id)
            .eq('status', 'pending')
            .maybeSingle();

          if (existingSuggestion) {
            const now = new Date();
            const currentMonth = now.getMonth();
            let targetMonth = currentMonth;
            let priority: 'high' | 'medium' | 'low' = 'medium';
            let reason = '';

            if (formData.season === 'spring') {
              targetMonth = 2;
              reason = 'Articles de printemps - meilleure période de vente en mars-avril';
            } else if (formData.season === 'summer') {
              targetMonth = 4;
              reason = "Articles d'été - meilleure période de vente en mai-juin";
            } else if (formData.season === 'autumn') {
              targetMonth = 7;
              reason = "Articles d'automne - meilleure période de vente en août-septembre";
            } else if (formData.season === 'winter') {
              targetMonth = 9;
              reason = "Articles d'hiver - meilleure période de vente en octobre-novembre";
            } else if (formData.season === 'all-seasons') {
              targetMonth = currentMonth;
              reason = 'Article toutes saisons - peut être publié maintenant';
            } else {
              targetMonth = currentMonth;
              reason = 'Article sans saison définie - peut être publié maintenant';
            }

            const monthDiff = (targetMonth - currentMonth + 12) % 12;

            if (monthDiff === 0 || monthDiff === 1) {
              priority = 'high';
              reason = `Période optimale maintenant ! ${reason}`;
            } else if (monthDiff <= 3) {
              priority = 'medium';
            } else {
              priority = 'low';
            }

            let suggestedDate: Date;
            if (formData.season === 'all-seasons' || formData.season === 'undefined') {
              suggestedDate = new Date(now);
              suggestedDate.setDate(suggestedDate.getDate() + 7);
            } else {
              suggestedDate = new Date(now.getFullYear(), targetMonth, 1);
              if (suggestedDate < now) {
                suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
              }
            }

            await supabase
              .from('selling_suggestions')
              .update({
                suggested_date: suggestedDate.toISOString().split('T')[0],
                priority,
                reason,
                updated_at: new Date().toISOString(),
              })
              .eq('id', existingSuggestion.id);
          }
        }
      } else {
        const { data: newArticle, error } = await supabase
          .from('articles')
          .insert([articleData])
          .select()
          .single();

        if (error) throw error;

        if (newArticle) {
          savedArticleId = newArticle.id;

          if (formData.photos.length > 0 && user?.id) {
            const migratedPhotos = await migratePhotosFromTempFolder(
              formData.photos,
              user.id,
              newArticle.id
            );

            if (
              migratedPhotos.some((url: string, index: number) => url !== formData.photos[index])
            ) {
              await supabase
                .from('articles')
                .update({ photos: migratedPhotos })
                .eq('id', newArticle.id);
            }
          }
        }
      }

      setToast({
        type: 'success',
        text: `Article ${id ? 'modifié' : 'créé'} avec succès`,
      });
      setTimeout(() => navigate(`/articles/${savedArticleId}/preview`), 1500);
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
    if (!id || !user) return;

    try {
      const { data: article, error: fetchError } = await supabase
        .from('articles')
        .select('photos')
        .eq('id', id)
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
        const folderPath = `${user.id}/${id}`;
        const { data: folderContents } = await supabase.storage
          .from('article-photos')
          .list(folderPath);

        if (folderContents && folderContents.length > 0) {
          const filesToDelete = folderContents.map(
            (file: any) => `${folderPath}/${file.name}`
          );
          await supabase.storage.from('article-photos').remove(filesToDelete);
        }
      } catch (folderError) {
        console.log('No folder to clean up or error cleaning folder:', folderError);
      }

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

  const handleSchedule = async () => {
    if (!id) {
      setToast({
        type: 'error',
        text: "Veuillez enregistrer l'article avant de le programmer",
      });
      return;
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      setToast({
        type: 'error',
        text: "Erreur lors du chargement de l'article",
      });
      return;
    }

    setCurrentArticle(data);
    setScheduleModal(true);
  };

  const handleScheduleConfirm = async (scheduledDate: string) => {
    if (!id) return;

    try {
      const { error } = await supabase
        .from('articles')
        .update({
          scheduled_for: scheduledDate,
          status: 'scheduled',
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article programmé avec succès',
      });

      setScheduleModal(false);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error scheduling article:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la programmation',
      });
    }
  };

  const handleMarkAsPublished = async () => {
    if (!id) {
      setToast({
        type: 'error',
        text: "Veuillez enregistrer l'article avant de le marquer comme publié",
      });
      return;
    }

    try {
      const { error } = await supabase
        .from('articles')
        .update({
          status: 'published',
          published_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme publié',
      });

      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error marking article as published:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour',
      });
    }
  };

  const handleMarkAsSold = async () => {
    if (!id) {
      setToast({
        type: 'error',
        text: "Veuillez enregistrer l'article avant de le marquer comme vendu",
      });
      return;
    }

    const { data, error } = await supabase
      .from('articles')
      .select('*')
      .eq('id', id)
      .maybeSingle();

    if (error || !data) {
      setToast({
        type: 'error',
        text: "Erreur lors du chargement de l'article",
      });
      return;
    }

    setCurrentArticle(data);
    setSoldModal(true);
  };

  const handleSoldConfirm = async (saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
    sellerId?: string;
  }) => {
    if (!id) return;

    try {
      const netProfit = saleData.soldPrice - saleData.fees - saleData.shippingCost;

      const updateData: any = {
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
      };

      if (saleData.sellerId) {
        updateData.seller_id = saleData.sellerId;
      }

      const { error } = await supabase
        .from('articles')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;

      setToast({
        type: 'success',
        text: 'Article marqué comme vendu',
      });

      setSoldModal(false);
      setTimeout(() => {
        navigate('/dashboard');
      }, 1500);
    } catch (error) {
      console.error('Error marking article as sold:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors de la mise à jour',
      });
    }
  };

  const handleViewSaleDetail = () => {
    setSaleDetailModal(true);
  };

  const handleGenerateLabel = () => {
    if (!id) {
      setToast({
        type: 'error',
        text: "Veuillez enregistrer l'article avant de générer une étiquette",
      });
      return;
    }

    setLabelModal(true);
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
        const referenceNumber = await generateReferenceNumber();

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
          season: formData.season,
          suggested_period: formData.suggested_period,
          photos: formData.photos,
          color: formData.color || null,
          material: formData.material || null,
          reference_number: referenceNumber,
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
        text:
          error instanceof Error
            ? error.message
            : "Erreur lors de la préparation de l'article",
      });
    } finally {
      setPublishing(false);
    }
  };

  return (
    <>
      {toast && (
        <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />
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

      <PageContainer>
        <PageSection>
          {/* Header Apple-like */}
          <div className="flex items-start justify-between gap-4 mb-6">
            <div className="flex items-start gap-3 min-w-0">
              <div className="w-11 h-11 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Tag className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">
                  {id ? "Modifier l'article" : 'Nouvel article'}
                </h1>
                <p className="mt-1 text-xs sm:text-sm text-slate-500">
                  Remplissez les informations de votre article pour le préparer à la
                  publication.
                </p>

                {id && (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <Pill variant={getStatusVariant(articleStatus)}>
                      {STATUS_LABELS[articleStatus]}
                    </Pill>
                    {formData.reference_number && (
                      <Pill variant="neutral">
                        Réf. <span className="font-mono ml-1">{formData.reference_number}</span>
                      </Pill>
                    )}
                    {sellerName && (
                      <Pill variant="neutral">Vendu par {sellerName}</Pill>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Boutons rapides */}
            {id && (
              <div className="hidden sm:flex flex-col gap-2 items-end">
                {articleStatus === 'published' && (
                  <GhostButton onClick={handleMarkAsPublished} className="text-xs px-3 py-2">
                    <Send className="w-3.5 h-3.5" />
                    Marquer comme publié
                  </GhostButton>
                )}
                {formData.reference_number && (
                  <GhostButton
                    onClick={handleGenerateLabel}
                    className="text-xs px-3 py-2 bg-slate-900 text-white hover:bg-slate-800"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Étiquette
                  </GhostButton>
                )}
              </div>
            )}
          </div>

          <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
            <div className="space-y-6">
              {/* Vendeur */}
              {familyMembers.length > 0 && (
                <Card>
                  <h2 className="text-sm font-semibold text-slate-900 mb-3">Vendeur</h2>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Vendu par
                      <span className="ml-1 text-[11px] text-slate-500 font-normal normal-case">
                        (sélectionnez le vendeur avant d'analyser les photos avec l'IA)
                      </span>
                    </label>
                    <select
                      value={formData.seller_id || ''}
                      onChange={(e) => handleSellerChange(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl border border-slate-200 bg-slate-50/60 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      <option value="">Sélectionnez un vendeur</option>
                      {familyMembers.map((member) => (
                        <option key={member.id} value={member.id}>
                          {member.name} {member.is_default ? '(par défaut)' : ''}
                        </option>
                      ))}
                    </select>
                  </div>
                </Card>
              )}

              {/* Photos */}
              <Card>
                <h2 className="text-sm font-semibold text-slate-900 mb-3">Photos</h2>
                <PhotoUpload
                  photos={formData.photos}
                  onPhotosChange={(photos) => setFormData({ ...formData, photos })}
                  onAnalyzeClick={handleAnalyzeWithAI}
                  analyzing={analyzingWithAI}
                  userId={user?.id || ''}
                  articleId={id}
                />
              </Card>

              {/* Informations principales */}
              <Card>
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Informations principales
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Titre *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.title}
                      onChange={(e) => {
                        setFormData({ ...formData, title: e.target.value });
                        if (validationErrors.includes('title')) {
                          setValidationErrors(
                            validationErrors.filter((err) => err !== 'title')
                          );
                        }
                      }}
                      className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/60 ${
                        validationErrors.includes('title')
                          ? 'border-rose-400 bg-rose-50'
                          : 'border-slate-200'
                      }`}
                      placeholder="Ex: Robe d'été fleurie"
                    />
                    {validationErrors.includes('title') && (
                      <p className="text-xs text-rose-600 mt-1">
                        Ce champ est obligatoire
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Description
                    </label>
                    <textarea
                      value={formData.description}
                      onChange={(e) =>
                        setFormData({ ...formData, description: e.target.value })
                      }
                      rows={4}
                      className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 resize-none"
                      placeholder="Décrivez votre article en détail..."
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Marque
                      </label>
                      <input
                        type="text"
                        value={formData.brand}
                        onChange={(e) =>
                          setFormData({ ...formData, brand: e.target.value })
                        }
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder="Ex: Zara"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Taille
                        {!id && userProfile && (
                          <span className="ml-1 text-[11px] text-slate-500 font-normal normal-case">
                            {formData.subcategory === 'Chaussures' && userProfile.shoe_size
                              ? `(Défaut: ${userProfile.shoe_size})`
                              : userProfile.clothing_size
                              ? `(Défaut: ${userProfile.clothing_size})`
                              : ''}
                          </span>
                        )}
                      </label>
                      <input
                        type="text"
                        value={formData.size}
                        onChange={(e) =>
                          setFormData({ ...formData, size: e.target.value })
                        }
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                        placeholder={
                          !id && userProfile
                            ? formData.subcategory === 'Chaussures' &&
                              userProfile.shoe_size
                              ? userProfile.shoe_size
                              : userProfile.clothing_size || 'Ex: M, 38, 42'
                            : 'Ex: M, 38, 42'
                        }
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Couleur
                      </label>
                      <select
                        value={formData.color}
                        onChange={(e) =>
                          setFormData({ ...formData, color: e.target.value })
                        }
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Matière
                      </label>
                      <select
                        value={formData.material}
                        onChange={(e) =>
                          setFormData({ ...formData, material: e.target.value })
                        }
                        className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      État *
                    </label>
                    <select
                      required
                      value={formData.condition}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          condition: e.target.value as Condition,
                        })
                      }
                      className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {Object.entries(CONDITION_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
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
                          setValidationErrors(
                            validationErrors.filter((err) => err !== 'main_category')
                          );
                        }
                      }}
                      className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/60 ${
                        validationErrors.includes('main_category')
                          ? 'border-rose-400 bg-rose-50'
                          : 'border-slate-200'
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
                      <p className="text-xs text-rose-600 mt-1">
                        Ce champ est obligatoire
                      </p>
                    )}
                  </div>

                  {formData.main_category && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Sous-catégorie *
                      </label>
                      <select
                        required
                        value={formData.subcategory}
                        onChange={(e) => {
                          const newSubcategory = e.target.value;
                          const isShoeCategory = newSubcategory === 'Chaussures';
                          let newSize = formData.size;

                          if (!id && userProfile && !formData.size) {
                            if (isShoeCategory && userProfile.shoe_size) {
                              newSize = userProfile.shoe_size;
                            } else if (!isShoeCategory && userProfile.clothing_size) {
                              newSize = userProfile.clothing_size;
                            }
                          }

                          setFormData({
                            ...formData,
                            subcategory: newSubcategory,
                            item_category: '',
                            size: newSize,
                          });
                          if (validationErrors.includes('subcategory')) {
                            setValidationErrors(
                              validationErrors.filter((err) => err !== 'subcategory')
                            );
                          }
                        }}
                        className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/60 ${
                          validationErrors.includes('subcategory')
                            ? 'border-rose-400 bg-rose-50'
                            : 'border-slate-200'
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
                        <p className="text-xs text-rose-600 mt-1">
                          Ce champ est obligatoire
                        </p>
                      )}
                    </div>
                  )}

                  {formData.subcategory &&
                    selectedSubcategory &&
                    selectedSubcategory.items.length > 0 && (
                      <div>
                        <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                          Type d'article
                        </label>
                        <select
                          value={formData.item_category}
                          onChange={(e) =>
                            setFormData({
                              ...formData,
                              item_category: e.target.value,
                            })
                          }
                          className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
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
                </div>
              </Card>

              {/* Prix */}
              <Card>
                <h2 className="text-sm font-semibold text-slate-900 mb-4">Prix de vente</h2>

                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                        Prix de vente (€) *
                      </label>
                      <div className="relative">
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
                              setValidationErrors(
                                validationErrors.filter((err) => err !== 'price')
                              );
                            }
                          }}
                          className={`w-full px-4 py-3 text-sm rounded-2xl border focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-slate-50/60 ${
                            validationErrors.includes('price')
                              ? 'border-rose-400 bg-rose-50'
                              : 'border-slate-200'
                          }`}
                          placeholder="25.00"
                        />
                        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
                          €
                        </span>
                      </div>
                      {validationErrors.includes('price') && (
                        <p className="text-xs text-rose-600 mt-1">
                          Ce champ est obligatoire et doit être supérieur à 0
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              {/* Saison */}
              <Card>
                <h2 className="text-sm font-semibold text-slate-900 mb-4">
                  Saison & période conseillée
                </h2>

                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                      Saison
                    </label>
                    <select
                      value={formData.season}
                      onChange={(e) =>
                        setFormData({
                          ...formData,
                          season: e.target.value as Season,
                        })
                      }
                      className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                    >
                      {Object.entries(SEASON_LABELS).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
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
                      className="w-full px-4 py-3 text-sm rounded-2xl border border-slate-200 bg-slate-50/60 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                      placeholder="Ex: Avril - Juin"
                    />
                  </div>
                </div>
              </Card>
            </div>

            {/* Bannières de statut */}
            {id && articleStatus === 'ready' && (
              <SoftCard>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-emerald-900">
                        Statut : Prêt pour Vinted
                      </h3>
                      <Pill variant="success" className="text-[11px]">
                        100% complété
                      </Pill>
                    </div>
                    <p className="text-sm text-emerald-900/90 leading-relaxed">
                      Tous les champs requis sont remplis. Vous pouvez maintenant envoyer
                      cette annonce sur la plateforme Vinted.
                    </p>
                  </div>
                </div>
              </SoftCard>
            )}

            {id && articleStatus === 'draft' && (
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-slate-900 text-white shadow-sm flex-shrink-0">
                    <Edit className="h-5 w-5" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-slate-900">
                        Statut : Brouillon
                      </h3>
                      <Pill variant="neutral" className="text-[11px]">
                        En cours
                      </Pill>
                    </div>
                    <p className="text-sm text-slate-700 leading-relaxed">
                      Cette annonce est en cours de préparation. Complétez tous les
                      champs requis avant de l'envoyer sur Vinted.
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {id && articleStatus === 'scheduled' && currentArticle && (
              <SoftCard>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <Calendar className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-amber-900">
                        Statut : Planifié
                      </h3>
                      <Pill variant="warning" className="text-[11px]">
                        Programmé
                      </Pill>
                    </div>
                    <p className="text-sm text-amber-900/90 leading-relaxed">
                      {currentArticle.scheduled_for ? (
                        <>
                          Publication prévue le{' '}
                          <span className="font-semibold">
                            {new Date(
                              currentArticle.scheduled_for
                            ).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      ) : (
                        "Cet article est planifié pour une publication ultérieure."
                      )}
                    </p>
                  </div>
                </div>
              </SoftCard>
            )}

            {id && articleStatus === 'published' && currentArticle && (
              <Card>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <Send className="h-5 w-5 text-blue-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-blue-900">
                        Statut : Publié
                      </h3>
                      <Pill variant="primary" className="text-[11px]">
                        En ligne
                      </Pill>
                    </div>
                    <p className="text-sm text-blue-900/90 leading-relaxed">
                      {currentArticle.published_at ? (
                        <>
                          Publié le{' '}
                          <span className="font-semibold">
                            {new Date(
                              currentArticle.published_at
                            ).toLocaleDateString('fr-FR', {
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </>
                      ) : (
                        'Cette annonce est actuellement en ligne sur Vinted.'
                      )}
                    </p>
                  </div>
                </div>
              </Card>
            )}

            {id && articleStatus === 'sold' && (
              <SoftCard>
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white shadow-sm flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-emerald-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="text-sm sm:text-base font-semibold text-emerald-900">
                        Statut : Vendu
                      </h3>
                      <Pill variant="success" className="text-[11px]">
                        Terminé
                      </Pill>
                    </div>
                    <p className="text-sm text-emerald-900/90 leading-relaxed">
                      Cet article a été vendu avec succès
                      {sellerName ? ` par ${sellerName}` : ''}.
                    </p>
                  </div>
                </div>
              </SoftCard>
            )}

            {/* Actions principales */}
            <Card>
              <div className="space-y-4">
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:block">
                  Actions principales
                </div>

                <div className="flex flex-wrap justify-center gap-3">
                  {/* Article vendu */}
                  {articleStatus === 'sold' && (
                    <>
                      <GhostButton
                        onClick={(e) => handleSubmit(e as any, 'sold')}
                        className="flex-1 min-w-[200px] justify-center"
                      >
                        <Save className="w-4 h-4" />
                        <span>Enregistrer</span>
                      </GhostButton>

                      <GhostButton
                        onClick={handleViewSaleDetail}
                        className="flex-1 min-w-[200px] justify-center bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100"
                      >
                        <Eye className="w-4 h-4" />
                        <span>Voir la vente</span>
                      </GhostButton>
                    </>
                  )}

                  {/* Supprimer (si pas sold) */}
                  {id && articleStatus !== 'sold' && (
                    <GhostButton
                      onClick={() => setDeleteModal(true)}
                      className="flex-1 min-w-[200px] justify-center bg-rose-50 text-rose-600 border border-rose-200 hover:bg-rose-100"
                    >
                      <Trash2 className="w-4 h-4" />
                      <span>Supprimer</span>
                    </GhostButton>
                  )}

                  {/* Enregistrer (tous sauf sold -> utilise status actuel) */}
                  {articleStatus !== 'sold' && (
                    <GhostButton
                      onClick={(e) => handleSubmit(e as any, articleStatus)}
                      className="flex-1 min-w-[200px] justify-center"
                    >
                      <Save className="w-4 h-4" />
                      <span>Enregistrer</span>
                    </GhostButton>
                  )}

                  {/* Passer à prêt pour Vinted */}
                  {articleStatus === 'draft' && (
                    <GhostButton
                      onClick={(e) => handleSubmit(e as any, 'ready')}
                      className="flex-1 min-w-[200px] justify-center text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Prêt pour Vinted</span>
                    </GhostButton>
                  )}

                  {/* Programmer */}
                  {(articleStatus === 'ready' ||
                    articleStatus === 'scheduled' ||
                    articleStatus === 'published') && (
                    <GhostButton
                      onClick={handleSchedule}
                      className="flex-1 min-w-[200px] justify-center text-amber-700 bg-amber-50 border border-amber-200 hover:bg-amber-100"
                    >
                      <Calendar className="w-4 h-4" />
                      <span>Programmer</span>
                    </GhostButton>
                  )}

                  {/* Marquer vendu – pas affiché en brouillon, comme tu voulais */}
                  {(articleStatus === 'ready' ||
                    articleStatus === 'scheduled' ||
                    articleStatus === 'published') && (
                    <GhostButton
                      onClick={handleMarkAsSold}
                      className="flex-1 min-w-[200px] justify-center text-emerald-700 bg-emerald-50 border border-emerald-200 hover:bg-emerald-100"
                    >
                      <DollarSign className="w-4 h-4" />
                      <span>Marquer vendu</span>
                    </GhostButton>
                  )}

                  {/* Envoyer à Vinted */}
                  {(articleStatus === 'ready' || articleStatus === 'scheduled') && id && (
                    <PrimaryButton
                      onClick={() => navigate(`/articles/${id}/structure`)}
                      className="flex-1 min-w-[200px] justify-center"
                    >
                      <Send className="w-4 h-4" />
                      <span>Envoyer à Vinted</span>
                    </PrimaryButton>
                  )}
                </div>
              </div>
            </Card>
          </form>
        </PageSection>
      </PageContainer>

      {/* Modales secondaires */}
      <ConfirmModal
        isOpen={deleteModal}
        onClose={() => setDeleteModal(false)}
        onConfirm={handleDelete}
        title="Supprimer l'article"
        message="Êtes-vous sûr de vouloir supprimer cet article ? Cette action est irréversible."
        confirmLabel="Supprimer"
        variant="danger"
      />

      {currentArticle && (
        <>
          <ScheduleModal
            isOpen={scheduleModal}
            onClose={() => setScheduleModal(false)}
            onScheduled={handleScheduleConfirm}
            article={currentArticle}
          />

          <ArticleSoldModal
            isOpen={soldModal}
            onClose={() => setSoldModal(false)}
            onConfirm={handleSoldConfirm}
            article={currentArticle}
          />

          {saleDetailModal && currentArticle.status === 'sold' && (
            <SaleDetailModal
              sale={{
                id: currentArticle.id,
                title: formData.title,
                brand: formData.brand,
                price: parseFloat(formData.price) || 0,
                sold_price:
                  currentArticle.sold_price || parseFloat(formData.price) || 0,
                sold_at: currentArticle.sold_at || new Date().toISOString(),
                platform: currentArticle.platform || 'Vinted',
                shipping_cost: currentArticle.shipping_cost || 0,
                fees: currentArticle.fees || 0,
                net_profit: currentArticle.net_profit || 0,
                photos: formData.photos,
                buyer_name: currentArticle.buyer_name,
                sale_notes: currentArticle.sale_notes,
                seller_name: sellerName || undefined,
              }}
              onClose={() => setSaleDetailModal(false)}
            />
          )}
        </>
      )}

      {id && formData.reference_number && (
        <LabelModal
          isOpen={labelModal}
          onClose={() => setLabelModal(false)}
          article={{
            reference_number: formData.reference_number,
            title: formData.title,
            brand: formData.brand,
            size: formData.size,
            color: formData.color,
            price: parseFloat(formData.price) || 0,
          }}
          sellerName={sellerName || undefined}
        />
      )}
    </>
  );
}
