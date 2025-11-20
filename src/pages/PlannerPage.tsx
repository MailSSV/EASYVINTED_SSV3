import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, TrendingUp, Clock, CheckCircle, X, Sparkles } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { Toast } from '../components/ui/Toast';
import { Button } from '../components/ui/Button';
import { ScheduleModal } from '../components/ScheduleModal';
import { Article } from '../types/article';

interface Suggestion {
  id: string;
  article_id: string;
  suggested_date: string;
  priority: 'high' | 'medium' | 'low';
  reason: string;
  status: 'pending' | 'accepted' | 'rejected' | 'scheduled';
  article?: Article;
}

const PRIORITY_COLORS = {
  high: 'bg-red-100 text-red-800 border-red-300',
  medium: 'bg-yellow-100 text-yellow-800 border-yellow-300',
  low: 'bg-blue-100 text-grey-800 border-blue-300',
};

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
  const [generating, setGenerating] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [selectedArticle, setSelectedArticle] = useState<Article | null>(null);
  const [selectedSuggestionId, setSelectedSuggestionId] = useState<string | null>(null);

  useEffect(() => {
    loadSuggestions();
  }, []);

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

      const suggestionsWithArticles = await Promise.all(
        (suggestionsData || []).map(async (suggestion) => {
          const { data: article } = await supabase
            .from('articles')
            .select('*')
            .eq('id', suggestion.article_id)
            .maybeSingle();

          return { ...suggestion, article };
        })
      );

      setSuggestions(suggestionsWithArticles);
    } catch (error) {
      console.error('Error loading suggestions:', error);
      setToast({ type: 'error', text: 'Erreur lors du chargement des suggestions' });
    } finally {
      setLoading(false);
    }
  }

  async function generateSuggestions() {
    if (!user) return;

    try {
      setGenerating(true);

      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.id)
        .in('status', ['draft', 'ready']);

      if (error) throw error;

      if (!articles || articles.length === 0) {
        setToast({ type: 'error', text: 'Aucun article à planifier' });
        return;
      }

      const newSuggestions = articles.map((article) => {
        const { suggestedDate, priority, reason } = analyzArticle(article);

        return {
          article_id: article.id,
          user_id: user.id,
          suggested_date: suggestedDate,
          priority,
          reason,
          status: 'pending' as const,
        };
      });

      const { data: existing } = await supabase
        .from('selling_suggestions')
        .select('article_id')
        .eq('user_id', user.id);

      const existingArticleIds = new Set(existing?.map((s) => s.article_id) || []);
      const toInsert = newSuggestions.filter((s) => !existingArticleIds.has(s.article_id));

      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('selling_suggestions')
          .insert(toInsert);

        if (insertError) throw insertError;
      }

      await loadSuggestions();
      setToast({ type: 'success', text: `${toInsert.length} nouvelle(s) suggestion(s) générée(s)` });
    } catch (error) {
      console.error('Error generating suggestions:', error);
      setToast({ type: 'error', text: 'Erreur lors de la génération des suggestions' });
    } finally {
      setGenerating(false);
    }
  }

  function analyzArticle(article: Article): {
    suggestedDate: string;
    priority: 'high' | 'medium' | 'low';
    reason: string;
  } {
    const now = new Date();
    const currentMonth = now.getMonth();

    let targetMonths: number[] = [];
    let priority: 'high' | 'medium' | 'low' = 'medium';
    let reason = '';
    let isAllSeasons = false;

    if (article.season === 'spring') {
      targetMonths = [2, 3];
      reason = 'Articles de printemps - meilleure période de vente en mars-avril';
    } else if (article.season === 'summer') {
      targetMonths = [4, 5];
      reason = 'Articles d\'été - meilleure période de vente en mai-juin';
    } else if (article.season === 'autumn') {
      targetMonths = [7, 8];
      reason = 'Articles d\'automne - meilleure période de vente en août-septembre';
    } else if (article.season === 'winter') {
      targetMonths = [9, 10];
      reason = 'Articles d\'hiver - meilleure période de vente en octobre-novembre';
    } else {
      isAllSeasons = true;
      targetMonths = [currentMonth];
      reason = 'Article toutes saisons - peut être publié maintenant';
    }

    const isInTargetPeriod = targetMonths.includes(currentMonth);
    const monthDifferences = targetMonths.map(month => {
      const diff = (month - currentMonth + 12) % 12;
      return diff === 0 ? 0 : diff;
    });
    const minMonthDiff = Math.min(...monthDifferences);

    if (isInTargetPeriod || minMonthDiff === 0) {
      priority = 'high';
      reason = `Période optimale maintenant ! ${reason}`;
    } else if (minMonthDiff === 1) {
      priority = 'high';
      reason = `Période optimale très proche ! ${reason}`;
    } else if (minMonthDiff <= 4) {
      priority = 'medium';
    } else {
      priority = 'low';
    }

    let suggestedDate: Date;
    if (isAllSeasons || isInTargetPeriod || minMonthDiff === 0) {
      suggestedDate = new Date(now);
      suggestedDate.setDate(suggestedDate.getDate() + 7);
    } else if (minMonthDiff === 1) {
      suggestedDate = new Date(now);
      suggestedDate.setDate(suggestedDate.getDate() + 14);
    } else {
      const targetMonth = targetMonths[0];
      suggestedDate = new Date(now.getFullYear(), targetMonth, 1);
      if (suggestedDate < now) {
        suggestedDate.setFullYear(suggestedDate.getFullYear() + 1);
      }
    }

    return {
      suggestedDate: suggestedDate.toISOString().split('T')[0],
      priority,
      reason,
    };
  }

  async function acceptSuggestion(suggestionId: string, articleId: string, suggestedDate: string) {
    try {
      const scheduledFor = new Date(suggestedDate).toISOString();

      const { error: articleError } = await supabase
        .from('articles')
        .update({ status: 'scheduled', scheduled_for: scheduledFor })
        .eq('id', articleId);

      if (articleError) throw articleError;

      const { error: suggestionError } = await supabase
        .from('selling_suggestions')
        .update({ status: 'accepted', updated_at: new Date().toISOString() })
        .eq('id', suggestionId);

      if (suggestionError) throw suggestionError;

      await loadSuggestions();
      setToast({ type: 'success', text: 'Suggestion acceptée et article planifié' });
    } catch (error) {
      console.error('Error accepting suggestion:', error);
      setToast({ type: 'error', text: 'Erreur lors de l\'acceptation de la suggestion' });
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
      setToast({ type: 'error', text: 'Erreur lors du rejet de la suggestion' });
    }
  }

  function handleOpenScheduleModal(article: Article, suggestionId: string) {
    setSelectedArticle(article);
    setSelectedSuggestionId(suggestionId);
    setScheduleModalOpen(true);
  }

  function handleOpenPreviewModal(article: Article) {
    navigate(`/articles/${article.id}/preview`);
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
    setToast({ type: 'success', text: 'Article programmé avec succès' });
    setScheduleModalOpen(false);
    setSelectedArticle(null);
    setSelectedSuggestionId(null);
  }

  const pendingSuggestions = suggestions.filter((s) => s.status === 'pending');
  const acceptedSuggestions = suggestions.filter((s) => s.status === 'accepted');

  return (
    <>
      {toast && <Toast message={toast.text} type={toast.type} onClose={() => setToast(null)} />}

      {selectedArticle && (
        <>
          <ScheduleModal
            isOpen={scheduleModalOpen}
            onClose={() => {
              setScheduleModalOpen(false);
              setSelectedArticle(null);
              setSelectedSuggestionId(null);
            }}
            article={selectedArticle}
            onScheduled={handleScheduled}
          />
        </>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="mb-6 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Planificateur Intelligent</h1>
              <p className="text-sm text-gray-600 mt-1">
                Optimisez vos ventes en publiant vos articles au bon moment
              </p>
            </div>
            <Button
              onClick={generateSuggestions}
              disabled={generating}
              className="flex items-center justify-center gap-2 shadow-lg hover:shadow-xl transition-all w-full sm:w-auto"
            >
              <Sparkles className="w-4 h-4" />
              {generating ? 'Génération...' : 'Générer suggestions'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-16">
            <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600 mx-auto"></div>
            <p className="text-gray-600 mt-4 font-medium">Chargement des suggestions...</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-md border border-gray-200 overflow-hidden">
              <div className="bg-gradient-to-r from-emerald-500 to-teal-600 px-6 py-4">
                <h2 className="text-xl font-bold text-white flex items-center gap-3">
                  <TrendingUp className="w-6 h-6" />
                  Suggestions en attente
                  <span className="ml-auto bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                    {pendingSuggestions.length}
                  </span>
                </h2>
              </div>

              <div className="p-4 sm:p-6">
                {pendingSuggestions.length === 0 ? (
                  <div className="text-center py-12 px-4">
                    <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                      <Clock className="w-10 h-10 text-gray-400" />
                    </div>
                    <p className="text-lg font-medium text-gray-700 mb-2">Aucune suggestion pour le moment</p>
                    <p className="text-sm text-gray-500">Cliquez sur "Générer suggestions" pour obtenir des recommandations</p>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {pendingSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => {
                          if (suggestion.article) {
                            handleOpenPreviewModal(suggestion.article);
                          }
                        }}
                        className="group relative bg-white rounded-2xl overflow-hidden shadow-sm hover:shadow-xl transition-all duration-300 border border-gray-200 hover:border-gray-300 cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-transparent via-transparent to-gray-50 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative p-6">
                          <div className="flex items-start gap-4 mb-4">
                            {suggestion.article?.photos?.[0] ? (
                              <div className="w-20 h-20 rounded-xl overflow-hidden flex-shrink-0 shadow-md ring-1 ring-gray-200">
                                <img
                                  src={suggestion.article.photos[0]}
                                  alt={suggestion.article.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-20 h-20 rounded-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center flex-shrink-0 shadow-md">
                                <Calendar className="w-8 h-8 text-gray-400" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-base mb-1 truncate">
                                {suggestion.article?.title || 'Article inconnu'}
                              </h3>
                              <div className="flex items-center gap-2 mb-2">
                                <span className={`inline-flex items-center text-xs font-medium px-2.5 py-1 rounded-full ${
                                  suggestion.priority === 'high'
                                    ? 'bg-red-50 text-red-700 ring-1 ring-red-200'
                                    : suggestion.priority === 'medium'
                                    ? 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
                                    : 'bg-blue-50 text-blue-700 ring-1 ring-blue-200'
                                }`}>
                                  {PRIORITY_LABELS[suggestion.priority]}
                                </span>
                                {suggestion.article?.season && (
                                  <span className="text-xs text-gray-500 font-medium">
                                    {SEASON_LABELS[suggestion.article.season] || suggestion.article.season}
                                  </span>
                                )}
                              </div>
                              {suggestion.article && (
                                <div className="text-sm font-semibold text-gray-900">
                                  {suggestion.article.price}€
                                </div>
                              )}
                            </div>
                          </div>

                          <p className={`text-sm leading-relaxed mb-4 line-clamp-2 ${
                            suggestion.priority === 'high' ? 'text-red-600 font-semibold' : 'text-gray-600'
                          }`}>
                            {suggestion.reason}
                          </p>

                          <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (suggestion.article) {
                                  handleOpenScheduleModal(suggestion.article, suggestion.id);
                                }
                              }}
                              className="flex items-center gap-2 text-sm text-gray-500 hover:text-blue-600 transition-colors group"
                              title="Cliquez pour personnaliser la date"
                            >
                              <Calendar className="w-4 h-4 group-hover:scale-110 transition-transform" />
                              <span className="font-medium">
                                {new Date(suggestion.suggested_date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'long',
                                  year: 'numeric',
                                })}
                              </span>
                            </button>

                            <div className="flex gap-2">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  rejectSuggestion(suggestion.id);
                                }}
                                className="p-2 rounded-lg bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                                title="Rejeter"
                              >
                                <X className="w-4 h-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  acceptSuggestion(suggestion.id, suggestion.article_id, suggestion.suggested_date);
                                }}
                                className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-emerald-600 text-white text-sm font-medium hover:from-emerald-600 hover:to-emerald-700 active:scale-95 transition-all shadow-sm hover:shadow-md flex items-center gap-1.5"
                                title="Accepter"
                              >
                                <CheckCircle className="w-4 h-4" />
                                <span>Accepter</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {acceptedSuggestions.length > 0 && (
              <div className="bg-gradient-to-br from-white to-green-50 rounded-2xl shadow-md border border-green-200 overflow-hidden">
                <div className="bg-gradient-to-r from-green-500 to-emerald-600 px-6 py-4">
                  <h2 className="text-xl font-bold text-white flex items-center gap-3">
                    <CheckCircle className="w-6 h-6" />
                    Suggestions acceptées
                    <span className="ml-auto bg-white/20 backdrop-blur-sm px-3 py-1 rounded-full text-sm font-semibold">
                      {acceptedSuggestions.length}
                    </span>
                  </h2>
                </div>
                <div className="p-4 sm:p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {acceptedSuggestions.map((suggestion) => (
                      <div
                        key={suggestion.id}
                        onClick={() => {
                          if (suggestion.article) {
                            handleOpenPreviewModal(suggestion.article);
                          }
                        }}
                        className="group relative bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-all duration-300 border border-emerald-200 hover:border-emerald-300 cursor-pointer"
                      >
                        <div className="absolute inset-0 bg-gradient-to-br from-emerald-50/50 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                        <div className="relative p-4">
                          <div className="flex items-start gap-3 mb-3">
                            {suggestion.article?.photos?.[0] ? (
                              <div className="w-14 h-14 rounded-lg overflow-hidden flex-shrink-0 shadow-sm ring-1 ring-emerald-100">
                                <img
                                  src={suggestion.article.photos[0]}
                                  alt={suggestion.article.title}
                                  className="w-full h-full object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-14 h-14 rounded-lg bg-gradient-to-br from-emerald-50 to-emerald-100 flex items-center justify-center flex-shrink-0 shadow-sm">
                                <Calendar className="w-6 h-6 text-emerald-600" />
                              </div>
                            )}

                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-gray-900 text-sm mb-1 line-clamp-2 leading-tight">
                                {suggestion.article?.title || 'Article inconnu'}
                              </h3>
                              {suggestion.article && (
                                <div className="text-sm font-semibold text-emerald-600">
                                  {suggestion.article.price}€
                                </div>
                              )}
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                            <div className="flex items-center gap-1.5 text-xs text-gray-500">
                              <Calendar className="w-3.5 h-3.5" />
                              <span className="font-medium">
                                Planifié le {new Date(suggestion.suggested_date).toLocaleDateString('fr-FR', {
                                  day: 'numeric',
                                  month: 'short',
                                  year: 'numeric',
                                })}
                              </span>
                            </div>
                            <div className="flex-shrink-0 w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center">
                              <CheckCircle className="w-4 h-4 text-emerald-600" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </>
  );
}
