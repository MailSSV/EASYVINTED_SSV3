import { useState, useEffect } from 'react';
import { Package } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SaleDetailModal } from '../components/SaleDetailModal';

interface SaleRecord {
  id: string;
  title: string;
  brand: string;
  price: number;
  actual_value?: number;
  sold_price: number;
  sold_at: string;
  platform: string;
  shipping_cost: number;
  fees: number;
  net_profit: number;
  photos: string[];
  buyer_name?: string;
  sale_notes?: string;
}

export function SalesPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);

  useEffect(() => {
    if (user) {
      loadSales();
    }
  }, [user]);

  async function loadSales() {
    if (!user) return;

    try {
      setLoading(true);

      const { data: articles, error } = await supabase
        .from('articles')
        .select('*')
        .eq('user_id', user.id)
        .eq('status', 'sold')
        .not('sold_at', 'is', null)
        .order('sold_at', { ascending: false });

      if (error) throw error;

      if (articles) {
        setSalesHistory(
          articles.map(a => ({
            id: a.id,
            title: a.title,
            brand: a.brand || 'Sans marque',
            price: parseFloat(a.price),
            actual_value: a.actual_value ? parseFloat(a.actual_value) : undefined,
            sold_price: parseFloat(a.sold_price) || 0,
            sold_at: a.sold_at,
            platform: a.platform || 'Vinted',
            shipping_cost: parseFloat(a.shipping_cost) || 0,
            fees: parseFloat(a.fees) || 0,
            net_profit: parseFloat(a.net_profit) || 0,
            photos: a.photos || [],
            buyer_name: a.buyer_name,
            sale_notes: a.sale_notes,
          }))
        );
      }
    } catch (error) {
      console.error('Error loading sales:', error);
    } finally {
      setLoading(false);
    }
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Mes Ventes</h1>
        <p className="text-sm text-gray-600 mt-1">
          Historique complet de tous vos articles vendus
        </p>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {salesHistory.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <Package className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune vente enregistrée</h3>
            <p className="text-gray-600">
              Vos ventes apparaîtront ici une fois que vous aurez marqué des articles comme vendus
            </p>
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Article
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Date de vente
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Valeur
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prix vendu
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Frais
                    </th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Bénéfice
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {salesHistory.map((sale) => (
                    <tr
                      key={sale.id}
                      className="hover:bg-gray-50 transition-colors cursor-pointer"
                      onDoubleClick={() => setSelectedSale(sale)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          {sale.photos.length > 0 ? (
                            <img
                              src={sale.photos[0]}
                              alt={sale.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                              <Package className="w-6 h-6 text-gray-400" />
                            </div>
                          )}
                          <div>
                            <p className="text-sm font-medium text-gray-900">{sale.title}</p>
                            <p className="text-xs text-gray-500">{sale.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-900">
                        {formatDate(sale.sold_at)}
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-900">
                        {(sale.actual_value || 0).toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm text-right font-medium text-gray-900">
                        {sale.sold_price.toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm text-right text-gray-600">
                        {(sale.fees + sale.shipping_cost).toFixed(2)} €
                      </td>
                      <td className="px-6 py-4 text-sm text-right">
                        <span className={`font-semibold ${sale.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {sale.net_profit >= 0 ? '+' : ''}{sale.net_profit.toFixed(2)} €
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200">
              {salesHistory.map((sale) => (
                <div
                  key={sale.id}
                  className="px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => setSelectedSale(sale)}
                >
                  <div className="flex items-start gap-3">
                    {sale.photos.length > 0 ? (
                      <img
                        src={sale.photos[0]}
                        alt={sale.title}
                        className="w-16 h-16 rounded-lg object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Package className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-gray-900 truncate mb-1">
                        {sale.title}
                      </h3>
                      <div className="flex items-center justify-between gap-2 mb-2">
                        <span className="text-xs text-gray-500">
                          {formatDate(sale.sold_at)}
                        </span>
                        <span className={`text-sm font-semibold ${sale.net_profit >= 0 ? 'text-emerald-600' : 'text-red-600'}`}>
                          {sale.net_profit >= 0 ? '+' : ''}{sale.net_profit.toFixed(2)} €
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}
    </div>
  );
}
