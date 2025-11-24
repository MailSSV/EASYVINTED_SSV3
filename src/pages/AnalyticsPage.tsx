import { useState, useEffect } from 'react';
import { TrendingUp, Package, ShoppingBag, Euro, BarChart3, TrendingDown, Trophy, Medal, Award, Target } from 'lucide-react';
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

interface SellerStats {
  id: string;
  name: string;
  totalSales: number;
  totalRevenue: number;
  totalProfit: number;
  averagePrice: number;
  conversionRate: number;
  articlesPublished: number;
  articlesSold: number;
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
  const [sellerStats, setSellerStats] = useState<SellerStats[]>([]);
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

      const [articlesResult, membersResult] = await Promise.all([
        supabase
          .from('articles')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false }),
        supabase
          .from('family_members')
          .select('id, name')
          .eq('user_id', user.id)
      ]);

      if (articlesResult.error) throw articlesResult.error;
      if (membersResult.error) throw membersResult.error;

      const articles = articlesResult.data;
      const members = membersResult.data || [];

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

        const sellerStatsMap = new Map<string, SellerStats>();

        members.forEach(member => {
          const memberArticles = filteredArticles.filter(a => a.seller_id === member.id);
          const memberSold = memberArticles.filter(a => a.status === 'sold' && a.sold_at);
          const memberPublished = memberArticles.filter(a => a.status === 'published' || a.status === 'scheduled' || a.status === 'sold');
          const memberRevenue = memberSold.reduce((sum, a) => sum + (parseFloat(a.sold_price) || 0), 0);
          const memberProfit = memberSold.reduce((sum, a) => sum + (parseFloat(a.net_profit) || 0), 0);
          const memberConversion = memberPublished.length > 0 ? (memberSold.length / memberPublished.length) * 100 : 0;

          sellerStatsMap.set(member.id, {
            id: member.id,
            name: member.name,
            totalSales: memberSold.length,
            totalRevenue: memberRevenue,
            totalProfit: memberProfit,
            averagePrice: memberSold.length > 0 ? memberRevenue / memberSold.length : 0,
            conversionRate: memberConversion,
            articlesPublished: memberPublished.length,
            articlesSold: memberSold.length,
          });
        });

        const articlesWithoutSeller = filteredArticles.filter(a => !a.seller_id);
        if (articlesWithoutSeller.length > 0) {
          const soldWithoutSeller = articlesWithoutSeller.filter(a => a.status === 'sold' && a.sold_at);
          const publishedWithoutSeller = articlesWithoutSeller.filter(a => a.status === 'published' || a.status === 'scheduled' || a.status === 'sold');
          const revenueWithoutSeller = soldWithoutSeller.reduce((sum, a) => sum + (parseFloat(a.sold_price) || 0), 0);
          const profitWithoutSeller = soldWithoutSeller.reduce((sum, a) => sum + (parseFloat(a.net_profit) || 0), 0);
          const conversionWithoutSeller = publishedWithoutSeller.length > 0 ? (soldWithoutSeller.length / publishedWithoutSeller.length) * 100 : 0;

          sellerStatsMap.set('no-seller', {
            id: 'no-seller',
            name: 'Sans vendeur',
            totalSales: soldWithoutSeller.length,
            totalRevenue: revenueWithoutSeller,
            totalProfit: profitWithoutSeller,
            averagePrice: soldWithoutSeller.length > 0 ? revenueWithoutSeller / soldWithoutSeller.length : 0,
            conversionRate: conversionWithoutSeller,
            articlesPublished: publishedWithoutSeller.length,
            articlesSold: soldWithoutSeller.length,
          });
        }

        const sortedSellerStats = Array.from(sellerStatsMap.values())
          .sort((a, b) => b.totalRevenue - a.totalRevenue);

        setSellerStats(sortedSellerStats);
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
        <div className="bg-gradient-to-br from-white to-orange-50 rounded-xl shadow-md border-2 border-orange-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-orange-700 uppercase tracking-wide mb-2">
                Articles totaux
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalArticles}</p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-orange-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
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

        <div className="bg-gradient-to-br from-white to-gray-50 rounded-xl shadow-md border-2 border-gray-200 p-5 hover:shadow-lg transition-all">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide mb-2">
                Revenu total
              </p>
              <p className="text-2xl font-bold text-gray-900">{metrics.totalRevenue.toFixed(2)} €</p>
            </div>
            <div className="flex-shrink-0 w-14 h-14 bg-gradient-to-br from-gray-500 to-gray-600 rounded-xl flex items-center justify-center shadow-lg">
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


      {sellerStats.length > 0 && (
        <>
          <div className="relative my-12">
            <div className="absolute inset-0 flex items-center" aria-hidden="true">
              <div className="w-full border-t-2 border-gray-300"></div>
            </div>
            <div className="relative flex justify-center">
              <span className="bg-gradient-to-r from-gray-50 to-white px-6 py-2 rounded-full border-2 border-gray-300 shadow-sm">
                <span className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Performance des Vendeurs</span>
              </span>
            </div>
          </div>

          <div className="mb-6">
            <div className="flex items-center gap-3 mb-6">
              <div className="flex-shrink-0 w-12 h-12 bg-gradient-to-br from-yellow-400 to-orange-500 rounded-xl flex items-center justify-center shadow-lg">
                <Trophy className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Classement des Vendeurs</h2>
                <p className="text-sm text-gray-600">Qui génère le plus de ventes ?</p>
              </div>
            </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              {sellerStats.map((seller, index) => {
                const isTop3 = index < 3;
                const medalColors = [
                  'from-yellow-400 to-yellow-600',
                  'from-gray-300 to-gray-500',
                  'from-orange-400 to-orange-600'
                ];
                const borderColors = [
                  'border-yellow-400',
                  'border-gray-400',
                  'border-orange-400'
                ];

                return (
                  <div
                    key={seller.id}
                    className={`relative bg-white rounded-xl shadow-md border-2 ${
                      isTop3 ? borderColors[index] : 'border-gray-200'
                    } p-5 hover:shadow-lg transition-all`}
                  >
                    <div className="flex items-center gap-4">
                      <div className={`flex-shrink-0 w-14 h-14 rounded-xl flex items-center justify-center ${
                        isTop3
                          ? `bg-gradient-to-br ${medalColors[index]} shadow-lg`
                          : 'bg-gray-100'
                      }`}>
                        {index === 0 && <Trophy className="w-8 h-8 text-white" />}
                        {index === 1 && <Medal className="w-8 h-8 text-white" />}
                        {index === 2 && <Award className="w-8 h-8 text-white" />}
                        {index > 2 && <span className="text-xl font-bold text-gray-600">#{index + 1}</span>}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-lg font-bold text-gray-900 truncate">{seller.name}</h3>
                          <span className="text-2xl font-bold text-emerald-600">
                            {seller.totalRevenue.toFixed(0)} €
                          </span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-gray-500">Ventes</p>
                            <p className="font-semibold text-gray-900">{seller.totalSales}</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Prix moyen</p>
                            <p className="font-semibold text-gray-900">{seller.averagePrice.toFixed(0)} €</p>
                          </div>
                          <div>
                            <p className="text-gray-500">Taux</p>
                            <p className="font-semibold text-gray-900">{seller.conversionRate.toFixed(0)}%</p>
                          </div>
                        </div>
                      </div>
                    </div>
                    {isTop3 && (
                      <div className="absolute -top-2 -right-2">
                        <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${medalColors[index]} flex items-center justify-center shadow-lg ring-2 ring-white`}>
                          <span className="text-white font-bold text-sm">{index + 1}</span>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            <div className="space-y-4">
              <div className="bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl border-2 border-emerald-200 p-6 shadow-md">
                <div className="flex items-center gap-3 mb-4">
                  <Target className="w-8 h-8 text-emerald-600" />
                  <h3 className="text-lg font-bold text-gray-900">Performance Détaillée</h3>
                </div>
                <div className="space-y-4">
                  {sellerStats.slice(0, 3).map((seller, index) => (
                    <div key={seller.id} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-sm font-semibold text-gray-900">{seller.name}</span>
                        <span className="text-xs text-gray-600">
                          {seller.articlesSold}/{seller.articlesPublished} articles
                        </span>
                      </div>
                      <div className="relative h-3 bg-gray-200 rounded-full overflow-hidden">
                        <div
                          className={`absolute inset-y-0 left-0 rounded-full ${
                            index === 0 ? 'bg-gradient-to-r from-yellow-400 to-yellow-600' :
                            index === 1 ? 'bg-gradient-to-r from-gray-400 to-gray-600' :
                            'bg-gradient-to-r from-orange-400 to-orange-600'
                          }`}
                          style={{ width: `${Math.min(seller.conversionRate, 100)}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">Taux de conversion</span>
                        <span className="font-semibold text-gray-900">{seller.conversionRate.toFixed(1)}%</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border-2 border-blue-200 p-6 shadow-md">
                <h3 className="text-lg font-bold text-gray-900 mb-4">Bénéfices par Vendeur</h3>
                <div className="space-y-3">
                  {sellerStats.slice(0, 5).map((seller) => (
                    <div key={seller.id} className="flex items-center justify-between">
                      <span className="text-sm font-medium text-gray-700">{seller.name}</span>
                      <span className="text-sm font-bold text-emerald-600">
                        {seller.totalProfit.toFixed(2)} €
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        </>
      )}
    </div>
  );
}
