import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Calendar,
  TrendingUp,
  Sparkles,
  Clock,
  CheckCircle,
  X,
  Package,
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../components/ui/Toast';
import { ScheduleModal } from '../components/ScheduleModal';
import { Article } from '../types/article';
import { Lot } from '../types/lot';

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

interface Suggestion {
  id: string;
  article_id?: string;
  lot_id?: string;
  suggested_date: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'scheduled';
  article?: Article;
  lot?: Lot;
}

const PRIORITY_LABELS = {
  high: 'Haute priorité',
  medium: 'Priorité moyenne',
  low: 'Basse priorité',
};

const SEASON_LABELS: Record<string, string> = {
  spring: 'Printemps',
  summer: 'Été',
  autumn: 'Automne',
  winter: 'Hiver',
  'all-season': 'Toutes saisons',
  'all-seasons': 'Toutes saisons',
  'all_seasons': 'Toutes saisons',
};

export function PlannerPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedLot, setSelectedLot] = useState<Lot | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);
  const [scheduledArticlesDisplayLimit, setScheduledArticlesDisplayLimit] = useState(5);

  const [readyArticles, setReadyArticles] = useState<Article[]>([]);
  const [scheduledArticles, setScheduledArticles] = useState<Article[]>([]);
  const [scheduledLots, setScheduledLots] = useState<Lot[]>([]);

  useEffect(() => {
    async function initializePlanner() {
      await generateSuggestions();
      await loadSuggestions();
    }
    initializePlanner();
  }, []);

  useEffect(() => {
    loadArticles();
  }, [user]);

  async function loadSuggestions() {
    if (!user) return;

    try {
      setLoading(true);
      const { data: suggestionsData, error } = await supabase
        .from('selling_suggestions')
        .select('*')
        .eq('user_id', user.id)
        .order('suggested_date', { ascending: true });

      if (error) throw error;

      const suggestionsWithData = await Promise.all(
        (suggestionsData || []).map(async (suggestion) => {
          if (suggestion.article_id) {
            const { data: article } = await supabase
              .from('articles')
              .select('*')
              .eq('id', suggestion.article_id)
              .maybeSingle();
            return { ...suggestion, article };
          } else if (suggestion.lot_id) {
            const { data: lot } = await supabase
              .from('lots')
              .select('*')
              .eq('id', suggestion.lot_id)
              .maybeSingle();
            return { ...suggestion, lot };
          }
          return suggestion;
        })
      );

      const filteredSuggestions = suggestionsWithData.filter(
        (suggestion) =>
          (suggestion.article &&
            suggestion.article.status !== 'sold' &&
            suggestion.article.status !== 'draft') ||
          (suggestion.lot &&
            suggestion.lot.status !== 'sold' &&
            suggestion.lot.status !== 'draft')
      );

      setSuggestions(filteredSuggestions as Suggestion[]);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors du chargement des suggestions',
      });
    } finally {
      setLoading(false);
    }
  }

  async function generateSuggestions() {
    if (!user) return;

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData?.session?.access_token;

      if (!token) return;

      const apiUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/generate-planner-suggestions`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la génération des suggestions');
      }
    } catch (error) {
      console.error('Error generating suggestions:', error);
    }
  }

  async function acceptSuggestion(
    suggestionId: string,
    itemId: string,
    suggestedDate: string,
    isLot: boolean = false
  ) {
    try {
      const scheduledFor = new Date(suggestedDate).toISOString();
      const tableName = isLot ? 'lots' : 'articles';

      const { error: itemError } = await supabase
        .from(tableName)
        .update({ status: 'scheduled', scheduled_for: scheduledFor })
        .eq('id', itemId);

      if (itemError) throw itemError;

      const { error: suggestionError } = await supabase
        .from('selling_suggestions')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (suggestionError) throw suggestionError;

      await loadSuggestions();
      setToast({
        type: 'success',
        text: `Suggestion acceptée et ${isLot ? 'lot' : 'article'} planifié`,
      });
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      setToast({
        type: 'error',
        text: "Erreur lors de l'acceptation de la suggestion",
      });
    }
  }

  async function rejectSuggestion(suggestionId: string) {
    try {
      const { error } = await supabase
        .from('selling_suggestions')
        .update({ status: 'rejected', updated_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (error) throw error;

      await loadSuggestions();
      setToast({ type: 'success', text: 'Suggestion rejetée' });
    } catch (error) {
      console.error('Error rejecting suggestion:', error);
      setToast({
        type: 'error',
        text: 'Erreur lors du rejet de la suggestion',
      });
    }
  }

  function handleOpenScheduleModal(
    item: Article | Lot,
    suggestionId: string,
    isLot: boolean = false
  ) {
    if (isLot) {
      setSelectedLot(item as Lot);
      setSelectedArticle(null);
    } else {
      setSelectedArticle(item as Article);
      setSelectedLot(null);
    }
    setSelectedSuggestionId(suggestionId);
    setScheduleModalOpen(true);
  }

  function handleOpenPreviewModal(item: Article | Lot, isLot: boolean = false) {
    if (isLot) {
      navigate(`/lots/${item.id}/preview`);
    } else {
      navigate(`/articles/${item.id}/preview`);
    }
  }

  async function handleScheduled() {
    if (selectedSuggestionId) {
      try {
        const { error } = await supabase
          .from('selling_suggestions')
          .update({ status: 'accepted', updated_at: new Date().toISOString() })
          .eq('id', selectedSuggestionId);

        if (error) throw error;
      } catch (error) {
        console.error('Error updating suggestion:', error);
      }
    }

    await loadSuggestions();
    await loadArticles();
    setToast({ type: 'success', text: 'Article programmé avec succès' });
    setScheduleModalOpen(false);
    setSelectedArticle(null);
    setSelectedLot(null);
    setSelectedSuggestionId(null);
  }

  async function loadArticles() {
    if (!user) return;

    try {
      const { data: ready, error: readyError } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'ready')
        .order('created_at', { ascending: false });

      const { data: scheduled, error: scheduledError } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .order('scheduled_for', { ascending: true });

      const { data: scheduledLotsData, error: scheduledLotsError } = await supabase
        .from('lots')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'scheduled')
        .order('scheduled_for', { ascending: true });

      if (readyError) throw readyError;
      if (scheduledError) throw scheduledError;
      if (scheduledLotsError) throw scheduledLotsError;

      setReadyArticles(ready || []);
      setScheduledArticles(scheduled || []);
      setScheduledLots(scheduledLotsData || []);
    } catch (error) {
      console.error('Error loading articles:', error);
    }
  }

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');
  const totalReady = readyArticles.length;
  const totalScheduled = scheduledArticles.length + scheduledLots.length;

  const currentArticleForSchedule = selectedArticle || (selectedLot as any);

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      {currentArticleForSchedule && (
        <ScheduleModal
          isOpen={scheduleModalOpen}
          onClose={() => {
            setScheduleModalOpen(false);
            setSelectedArticle(null);
            setSelectedLot(null);
            setSelectedSuggestionId(null);
          }}
          article={currentArticleForSchedule}
          onScheduled={handleScheduled}
        />
      )}

      <PageContainer>
        <PageSection>
          {/* Header Apple-like */}
          <div className="mb-6 flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-2xl bg-slate-900 text-white flex items-center justify-center shadow-md">
                <Calendar className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 mb-1.5">
                  <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 truncate">
                    Planificateur intelligent
                  </h1>
                </div>
                <p className="mt-0.5 text-xs sm:text-sm text-slate-500">
                  Optimisez vos ventes en publiant vos articles et lots au meilleur
                  moment.
                </p>

                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Pill variant={totalReady > 0 ? 'primary' : 'neutral'}>
                    {totalReady} annonce{totalReady > 1 ? 's' : ''} prêtes
                  </Pill>
                  <Pill variant={totalScheduled > 0 ? 'success' : 'neutral'}>
                    {totalScheduled} publication
                    {totalScheduled > 1 ? 's' : ''} planifiée
                  </Pill>
                  <Pill variant={pendingSuggestions > 0 ? 'warning' : 'neutral'}>
                    {pendingSuggestions.length} suggestion
                    {pendingSuggestions.length > 1 ? 's' : ''} à traiter
                  </Pill>
                </div>
              </div>
            </div>

            <div className="hidden sm:flex items-center gap-3">
              <GhostButton
                onClick={generateSuggestions}
                className="text-xs px-3 py-2"
              >
                <Sparkles className="w-3.5 h-3.5" />
                Régénérer les suggestions
              </GhostButton>
            </div>
          </div>

          {loading ? (
            <Card className="py-10 sm:py-12 flex flex-col items-center justify-center text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-emerald-600 mb-4" />
              <p className="text-sm text-slate-600">
                Chargement des suggestions…
              </p>
            </Card>
          ) : (
            <div className="space-y-6">
              {/* Section Aperçu */}
              <Card>
                <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-center gap-2 text-emerald-600">
                    <CheckCircle className="w-5 h-5" />
                    <span className="text-sm font-semibold">
                      {totalReady + totalScheduled} annonce
                      {totalReady + totalScheduled > 1 ? 's prêtes' : ' prête'}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 text-xs text-slate-500">
                    <TrendingUp className="w-4 h-4" />
                    Le planificateur vous aide à lisser vos ventes dans le temps.
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Articles prêts non programmés */}
                  <SoftCard>
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      Annonces prêtes – non programmées
                    </h3>
                    <div className="text-3xl font-semibold text-slate-900 mb-1">
                      {totalReady}
                    </div>
                    <p className="text-xs text-slate-500 mb-4">
                      {totalReady > 0
                        ? 'À programmer pour profiter de la meilleure période.'
                        : 'Aucun article prêt pour le moment.'}
                    </p>

                    {readyArticles.length > 0 && (
                      <div className="space-y-2 max-h-80 overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-slate-100">
                        {readyArticles.map((article) => (
                          <button
                            key={article.id}
                            type="button"
                            onClick={() =>
                              navigate(`/articles/${article.id}/preview`)
                            }
                            className="w-full flex items-center gap-3 bg-white rounded-2xl p-2 hover:shadow-sm transition-shadow border border-slate-100 text-left"
                          >
                            {article.photos?.[0] ? (
                              <img
                                src={article.photos[0]}
                                alt={article.title}
                                className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                              />
                            ) : (
                              <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0" />
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-medium text-slate-900 truncate">
                                {article.title}
                              </p>
                              <div className="flex items-center gap-2 mt-0.5">
                                <Clock className="w-3 h-3 text-slate-400" />
                                <span className="text-xs text-slate-500">
                                  À programmer
                                </span>
                              </div>
                            </div>
                            <GhostButton
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedArticle(article);
                                setSelectedLot(null);
                                setScheduleModalOpen(true);
                              }}
                              className="text-[11px] px-2 py-1"
                            >
                              Planifier
                            </GhostButton>
                          </button>
                        ))}
                      </div>
                    )}
                  </SoftCard>

                  {/* Articles & lots programmés */}
                  <SoftCard className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-100">
                    <h3 className="text-sm font-semibold text-slate-900 mb-3">
                      Annonces programmées
                    </h3>
                    <div className="text-3xl font-semibold text-emerald-700 mb-1">
                      {totalScheduled}
                    </div>
                    <p className="text-xs text-emerald-700 mb-4">
                      {totalScheduled > 0
                        ? 'Vos prochaines publications sont déjà calées dans le temps.'
                        : 'Aucune publication planifiée.'}
                    </p>

                    {(scheduledArticles.length > 0 || scheduledLots.length > 0) && (
                      <>
                        <div className="space-y-2">
                          {scheduledArticles
                            .slice(0, scheduledArticlesDisplayLimit)
                            .map((article) => (
                              <button
                                key={`article-${article.id}`}
                                type="button"
                                onClick={() =>
                                  navigate(`/articles/${article.id}/preview`)
                                }
                                className="w-full flex items-center gap-3 bg-white rounded-2xl p-2 hover:shadow-sm transition-shadow border border-emerald-100 text-left"
                              >
                                {article.photos?.[0] ? (
                                  <img
                                    src={article.photos[0]}
                                    alt={article.title}
                                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-200 flex items-center justify-center flex-shrink-0" />
                                )}
                                <div className="flex-1 min-w-0">
                                  <p className="text-xs font-medium text-slate-900 truncate">
                                    {article.title}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    <span className="text-xs text-emerald-700">
                                      {article.scheduled_for
                                        ? new Date(
                                            article.scheduled_for
                                          ).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                          })
                                        : 'Bientôt'}
                                    </span>
                                  </div>
                                </div>
                                <Pill variant="primary" className="hidden sm:inline-flex">
                                  Planifié
                                </Pill>
                              </button>
                            ))}

                          {scheduledLots
                            .slice(
                              0,
                              Math.max(
                                0,
                                scheduledArticlesDisplayLimit -
                                  scheduledArticles.length
                              )
                            )
                            .map((lot) => (
                              <button
                                key={`lot-${lot.id}`}
                                type="button"
                                onClick={() =>
                                  navigate(`/lots/${lot.id}/preview`)
                                }
                                className="w-full flex items-center gap-3 bg-white rounded-2xl p-2 hover:shadow-sm transition-shadow border border-emerald-100 text-left"
                              >
                                {lot.cover_photo ? (
                                  <img
                                    src={lot.cover_photo}
                                    alt={lot.name}
                                    className="w-10 h-10 rounded-xl object-cover flex-shrink-0"
                                  />
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                                    <Package className="w-5 h-5 text-purple-600" />
                                  </div>
                                )}
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-0.5">
                                    <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[11px] px-1.5 py-0.5 rounded font-semibold">
                                      <Package className="w-3 h-3" />
                                      Lot
                                    </span>
                                    <p className="text-xs font-medium text-slate-900 truncate">
                                      {lot.name}
                                    </p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <Clock className="w-3 h-3 text-emerald-600" />
                                    <span className="text-xs text-emerald-700">
                                      {lot.scheduled_for
                                        ? new Date(
                                            lot.scheduled_for
                                          ).toLocaleDateString('fr-FR', {
                                            day: 'numeric',
                                            month: 'short',
                                          })
                                        : 'Bientôt'}
                                    </span>
                                  </div>
                                </div>
                                <Pill variant="primary" className="hidden sm:inline-flex">
                                  Planifié
                                </Pill>
                              </button>
                            ))}
                        </div>

                        {totalScheduled > scheduledArticlesDisplayLimit && (
                          <GhostButton
                            onClick={() =>
                              setScheduledArticlesDisplayLimit((prev) => prev + 5)
                            }
                            className="w-full mt-3 justify-center text-xs"
                          >
                            Voir + (
                            {totalScheduled - scheduledArticlesDisplayLimit} restants)
                          </GhostButton>
                        )}
                      </>
                    )}
                  </SoftCard>
                </div>
              </Card>

              {/* Bloc suggestions IA */}
              <Card className="overflow-hidden p-0">
                <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4 flex items-center gap-3">
                  <Sparkles className="w-6 h-6 text-white" />
                  <h2 className="text-sm sm:text-base font-semibold text-white">
                    Suggestions de planification optimisées
                  </h2>
                  <div className="ml-auto">
                    <span className="bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-semibold text-white">
                      {pendingSuggestions.length} suggestion
                      {pendingSuggestions.length > 1 ? 's' : ''}
                    </span>
                  </div>
                </div>

                <div className="p-4 sm:p-6">
                  {pendingSuggestions.length === 0 ? (
                    <div className="text-center py-10 px-4">
                      <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-slate-100 flex items-center justify-center">
                        <Clock className="w-10 h-10 text-slate-400" />
                      </div>
                      <p className="text-base font-medium text-slate-800 mb-1">
                        Aucune suggestion pour le moment
                      </p>
                      <p className="text-sm text-slate-500 mb-4">
                        Cliquez sur &quot;Régénérer les suggestions&quot; pour analyser votre
                        stock et proposer un plan de publication.
                      </p>
                      <PrimaryButton onClick={generateSuggestions}>
                        <Sparkles className="w-4 h-4" />
                        Régénérer les suggestions
                      </PrimaryButton>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {pendingSuggestions.map((suggestion) => {
                        const isLot = !!suggestion.lot_id;
                        const item = suggestion.lot || suggestion.article;
                        const itemPhoto =
                          suggestion.lot?.cover_photo ||
                          suggestion.article?.photos?.[0];
                        const itemTitle =
                          suggestion.lot?.name ||
                          suggestion.article?.title ||
                          'Élément inconnu';
                        const itemPrice =
                          suggestion.lot?.price || suggestion.article?.price;
                        const itemSeason =
                          suggestion.lot?.season || suggestion.article?.season;
                        const itemId = suggestion.lot?.id || suggestion.article?.id;

                        return (
                          <div
                            key={suggestion.id}
                            onClick={() => {
                              if (item) {
                                handleOpenPreviewModal(item, isLot);
                              }
                            }}
                            className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-md transition-all border border-slate-200 hover:border-emerald-300 cursor-pointer"
                          >
                            <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-emerald-50/40 opacity-0 group-hover:opacity-100 transition-opacity" />
                            <div className="relative p-3">
                              {/* Header avec image + infos principales */}
                              <div className="flex items-start gap-3 mb-2">
                                {itemPhoto ? (
                                  <div className="w-10 h-10 rounded-xl overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-slate-200">
                                    <img
                                      src={itemPhoto}
                                      alt={itemTitle}
                                      className="w-full h-full object-cover"
                                    />
                                  </div>
                                ) : (
                                  <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                                    {isLot ? (
                                      <Package className="w-5 h-5 text-slate-400" />
                                    ) : (
                                      <Calendar className="w-5 h-5 text-slate-400" />
                                    )}
                                  </div>
                                )}

                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-1.5 mb-1">
                                    {isLot && (
                                      <span className="inline-flex items-center gap-1 bg-purple-50 text-purple-700 text-[11px] px-1.5 py-0.5 rounded font-semibold">
                                        <Package className="w-3 h-3" />
                                        Lot
                                      </span>
                                    )}
                                    <h3 className="font-medium text-slate-900 text-xs line-clamp-1 leading-tight">
                                      {itemTitle}
                                    </h3>
                                  </div>

                                  <div className="flex flex-wrap items-center gap-1.5">
                                    {itemPrice && (
                                      <span className="text-xs font-semibold text-emerald-700">
                                        {itemPrice} €
                                      </span>
                                    )}
                                    <span
                                      className={[
                                        'inline-flex items-center text-[11px] font-semibold px-1.5 py-0.5 rounded',
                                        suggestion.priority === 'high'
                                          ? 'bg-red-50 text-red-700'
                                          : suggestion.priority === 'medium'
                                          ? 'bg-amber-50 text-amber-700'
                                          : 'bg-blue-50 text-blue-700',
                                      ].join(' ')}
                                    >
                                      {PRIORITY_LABELS[suggestion.priority]}
                                    </span>
                                    {itemSeason && (
                                      <span className="inline-flex items-center text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {SEASON_LABELS[itemSeason] || itemSeason}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>

                              {/* Raison */}
                              <p
                                className={[
                                  'text-xs leading-relaxed mb-2 line-clamp-2',
                                  suggestion.priority === 'high'
                                    ? 'text-red-600 font-medium'
                                    : 'text-slate-600',
                                ].join(' ')}
                              >
                                {suggestion.reason}
                              </p>

                              {/* Footer: date + actions */}
                              <div className="space-y-2 pt-2 border-t border-slate-100">
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (item) {
                                      handleOpenScheduleModal(
                                        item,
                                        suggestion.id,
                                        isLot
                                      );
                                    }
                                  }}
                                  className="w-full flex items-center justify-center gap-1.5 text-[11px] text-slate-600 hover:text-emerald-700 bg-slate-50 hover:bg-emerald-50 rounded-lg py-1.5 px-2 transition-colors"
                                  title="Cliquer pour personnaliser la date"
                                >
                                  <Calendar className="w-3 h-3" />
                                  <span className="font-medium">
                                    {new Date(
                                      suggestion.suggested_date
                                    ).toLocaleDateString('fr-FR', {
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric',
                                    })}
                                  </span>
                                </button>

                                <div className="flex gap-2">
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      rejectSuggestion(suggestion.id);
                                    }}
                                    className="flex-1 py-1.5 rounded-lg bg-slate-100 text-slate-700 hover:bg-slate-200 active:scale-95 transition-all font-medium text-[11px] flex items-center justify-center gap-1.5"
                                    title="Rejeter"
                                  >
                                    <X className="w-3 h-3" />
                                    <span className="hidden sm:inline">
                                      Rejeter
                                    </span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (itemId) {
                                        acceptSuggestion(
                                          suggestion.id,
                                          itemId,
                                          suggestion.suggested_date,
                                          isLot
                                        );
                                      }
                                    }}
                                    className="flex-[2] py-1.5 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white font-semibold hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all shadow-sm hover:shadow-md flex items-center justify-center gap-1.5 text-[11px]"
                                    title="Accepter"
                                  >
                                    <CheckCircle className="w-3 h-3" />
                                    <span>Accepter</span>
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </Card>
            </div>
          )}
        </PageSection>
      </PageContainer>
    </>
  );
}
