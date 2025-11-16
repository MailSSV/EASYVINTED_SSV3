import { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingBag, Euro, BarChart3, TrendingDown } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface SalesMetrics {
  totalArticles: number;
  draftArticles: number;
  readyArticles: number;
  publishedArticles: number;
  soldArticles: number;
  totalRevenue: number;
  totalFees: number;
  totalShipping: number;
  totalNetProfit: number;
  averageSalePrice: number;
  conversionRate: number;
}

export function AnalyticsPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<SalesMetrics>({
    totalArticles: 0,
    draftArticles: 0,
    readyArticles: 0,
    publishedArticles: 0,
    soldArticles: 0,
    totalRevenue: 0,
    totalFees: 0,
    totalShipping: 0,
    totalNetProfit: 0,
    averageSalePrice: 0,
    conversionRate: 0,
  });
  const [timeRange, setTimeRange] = useState<'7d' | '30d' | '90d' | 'all'>('30d');

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user, timeRange]);

  async function loadAnalytics() {
    if (!user) return;

    try {
      setLoading(true);

      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      if (articles) {
        const now = new Date();
        const filteredArticles = articles.filter(article => {
          if (timeRange === 'all') return true;
          const createdDate = new Date(article.created_at);
          const daysAgo = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
          const cutoffDate = new Date(now.getTime() - daysAgo * 24 * 60 * 60 * 1000);
          return createdDate >= cutoffDate;
        });

        const soldArticles = filteredArticles.filter(a => a.status === 'sold' && a.sold_at);
        const totalRevenue = soldArticles.reduce((sum, a) => sum + (parseFloat(a.sold_price) || 0), 0);
        const totalFees = soldArticles.reduce((sum, a) => sum + (parseFloat(a.fees) || 0), 0);
        const totalShipping = soldArticles.reduce((sum, a) => sum + (parseFloat(a.shipping_cost) || 0), 0);
        const totalNetProfit = soldArticles.reduce((sum, a) => sum + (parseFloat(a.net_profit) || 0), 0);
        const publishedCount = filteredArticles.filter(a => a.status === 'published' || a.status === 'scheduled' || a.status === 'sold').length;
        const conversionRate = publishedCount > 0 ? (soldArticles.length / publishedCount) * 100 : 0;

        setMetrics({
          totalArticles: filteredArticles.length,
          draftArticles: filteredArticles.filter(a => a.status === 'draft').length,
          readyArticles: filteredArticles.filter(a => a.status === 'ready').length,
          publishedArticles: publishedCount,
          soldArticles: soldArticles.length,
          totalRevenue,
          totalFees,
          totalShipping,
          totalNetProfit,
          averageSalePrice: soldArticles.length > 0 ? totalRevenue / soldArticles.length : 0,
          conversionRate,
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-16 w-16 border-4 border-emerald-200 border-t-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="mb-6 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Statistiques & Analyses</h1>
            <p className="text-sm text-gray-600 mt-1">
              Suivez les performances de vos ventes et analysez vos résultats
            </p>
          </div>
          <div className="bg-white rounded-xl border-2 border-gray-200 p-1.5 shadow-md">
            <div className="flex flex-wrap gap-1">
              <button
                onClick={() => setTimeRange('7d')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === '7d'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                7 jours
              </button>
              <button
                onClick={() => setTimeRange('30d')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === '30d'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                30 jours
              </button>
              <button
                onClick={() => setTimeRange('90d')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === '90d'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                90 jours
              </button>
              <button
                onClick={() => setTimeRange('all')}
                className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${
                  timeRange === 'all'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-md'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                Tout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6 mb-6">
        <div className="bg-gradient-to-br from-white to-blue-50 rounded-xl shadow-md border-2 border-blue-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-blue-700 uppercase tracking-wide mb-2">
                Articles totaux
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalArticles}</p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <Package className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-emerald-50 rounded-xl shadow-md border-2 border-emerald-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                Articles vendus
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.soldArticles}</p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <ShoppingBag className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-md border-2 border-orange-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-2">
                Revenu total
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalRevenue.toFixed(2)} €</p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
              <Euro className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-br from-white to-emerald-50 rounded-xl shadow-md border-2 border-emerald-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-emerald-700 uppercase tracking-wide mb-2">
                Bénéfice net
              </p>
              <p className="text-2xl font-bold text-emerald-600">{metrics.totalNetProfit.toFixed(2)} €</p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-xl flex items-center justify-center shadow-lg">
              <TrendingUp className="w-7 h-7 text-white" />
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <BarChart3 className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Prix de vente moyen</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.averageSalePrice.toFixed(2)} €</p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingDown className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Frais totaux</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{(metrics.totalFees + metrics.totalShipping).toFixed(2)} €</p>
          <p className="text-xs text-gray-500 mt-1">
            Plateforme: {metrics.totalFees.toFixed(2)} € · Livraison: {metrics.totalShipping.toFixed(2)} €
          </p>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-gray-600" />
            </div>
            <h3 className="text-sm font-semibold text-gray-900">Taux de conversion</h3>
          </div>
          <p className="text-2xl font-bold text-gray-900">{metrics.conversionRate.toFixed(1)} %</p>
          <p className="text-xs text-gray-500 mt-1">
            {metrics.soldArticles} vendus sur {metrics.publishedArticles} publiés
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 rounded-lg border border-gray-200 p-4">
          <p className="text-xs font-medium text-gray-600 uppercase tracking-wide mb-1">Brouillons</p>
          <p className="text-xl font-bold text-gray-900">{metrics.draftArticles}</p>
        </div>

        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-lg border border-blue-200 p-4">
          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide mb-1">Prêts</p>
          <p className="text-xl font-bold text-blue-900">{metrics.readyArticles}</p>
        </div>

        <div className="bg-gradient-to-br from-emerald-50 to-emerald-100 rounded-lg border border-emerald-200 p-4">
          <p className="text-xs font-medium text-emerald-700 uppercase tracking-wide mb-1">Publiés</p>
          <p className="text-xl font-bold text-emerald-900">{metrics.publishedArticles}</p>
        </div>

        <div className="bg-gradient-to-br from-orange-50 to-orange-100 rounded-lg border border-orange-200 p-4">
          <p className="text-xs font-medium text-orange-700 uppercase tracking-wide mb-1">Vendus</p>
          <p className="text-xl font-bold text-orange-900">{metrics.soldArticles}</p>
        </div>
      </div>
    </div>
  );
}
