import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Package, Eye, ClipboardEdit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { SaleDetailModal } from '../components/SaleDetailModal';
import { ArticleSoldModal } from '../components/ArticleSoldModal';

interface SaleRecord {
  id: string;
  title: string;
  brand: string;
  price: number;
  sold_price: number;
  sold_at: string;
  platform: string;
  shipping_cost: number;
  fees: number;
  net_profit: number;
  photos: string[];
  buyer_name?: string;
  sale_notes?: string;
  seller_id?: string;
  seller_name?: string;
}

export function SalesPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [salesHistory, setSalesHistory] = useState<SaleRecord[]>([]);
  const [selectedSale, setSelectedSale] = useState<SaleRecord | null>(null);
  const [editingSale, setEditingSale] = useState<SaleRecord | null>(null);

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
        .select(`
          *,
          family_members:seller_id (name)
        `)
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
            sold_price: parseFloat(a.sold_price) || 0,
            sold_at: a.sold_at,
            platform: a.platform || 'Vinted',
            shipping_cost: parseFloat(a.shipping_cost) || 0,
            fees: parseFloat(a.fees) || 0,
            net_profit: parseFloat(a.net_profit) || 0,
            photos: a.photos || [],
            buyer_name: a.buyer_name,
            sale_notes: a.sale_notes,
            seller_id: a.seller_id,
            seller_name: a.family_members?.name || null,
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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
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

      {salesHistory.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200/50 px-6 py-16 text-center">
          <Package className="w-20 h-20 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Aucune vente enregistrée</h3>
          <p className="text-gray-600">
            Vos ventes apparaîtront ici une fois que vous aurez marqué des articles comme vendus
          </p>
        </div>
      ) : (
        <>
          {/* Desktop View */}
          <div className="hidden md:block bg-white rounded-2xl shadow-sm border border-gray-200/50 overflow-hidden">
            <div className="overflow-x-auto overflow-y-visible">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-gradient-to-r from-gray-50 to-gray-50/50 border-b border-gray-200/50">
                    <th className="px-6 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                      Article
                    </th>
                    <th className="px-4 py-3.5 text-left text-[10px] font-semibold text-gray-600 uppercase tracking-wide whitespace-nowrap">
                      Date vente
                    </th>
                    <th className="px-4 py-3.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                      Bénéfice
                    </th>
                    <th className="px-6 py-3.5 text-right text-[10px] font-semibold text-gray-600 uppercase tracking-wide">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {salesHistory.map((sale) => (
                    <tr
                      key={sale.id}
                      className="group hover:bg-gradient-to-r hover:from-gray-50 hover:to-transparent cursor-pointer transition-all duration-200"
                      onDoubleClick={() => setSelectedSale(sale)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-4">
                          <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center ring-1 ring-gray-200/50 group-hover:ring-emerald-300 transition-all flex-shrink-0">
                            {sale.photos.length > 0 ? (
                              <img
                                src={sale.photos[0]}
                                alt={sale.title}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <Package className="w-7 h-7 text-gray-300" />
                            )}
                            <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-gray-900 truncate group-hover:text-emerald-600 transition-colors">
                              {sale.title}
                            </p>
                            <p className="text-xs text-gray-500 truncate">{sale.brand}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className="inline-flex items-center px-2.5 py-1 bg-gray-50 border border-gray-200/50 rounded-lg text-[11px] font-medium text-gray-700">
                          {formatDate(sale.sold_at)}
                        </span>
                      </td>
                      <td className="px-4 py-4 text-right">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold ${
                          sale.net_profit >= 0
                            ? 'bg-gradient-to-r from-emerald-50 to-green-50 text-emerald-700'
                            : 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700'
                        }`}>
                          {sale.net_profit >= 0 ? '+' : ''}{sale.net_profit.toFixed(2)} €
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedSale(sale);
                            }}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 transition-all active:scale-90"
                            title="Voir les détails"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingSale(sale);
                            }}
                            className="p-2.5 rounded-xl text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all active:scale-90"
                            title="Modifier la vente"
                          >
                            <ClipboardEdit className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile View */}
          <div className="md:hidden space-y-2 px-0.5">
            {salesHistory.map((sale) => (
              <div
                key={sale.id}
                className="group bg-white rounded-2xl shadow-sm hover:shadow-xl border border-gray-100 overflow-hidden transition-all duration-300 hover:scale-[1.01] cursor-pointer"
                onClick={() => setSelectedSale(sale)}
              >
                <div className="flex gap-4 p-4">
                  <div className="relative w-24 h-24 rounded-xl bg-gradient-to-br from-gray-50 to-gray-100 overflow-hidden flex items-center justify-center flex-shrink-0 ring-1 ring-gray-200/50">
                    {sale.photos.length > 0 ? (
                      <img
                        src={sale.photos[0]}
                        alt={sale.title}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <Package className="w-10 h-10 text-gray-300" />
                    )}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>

                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className="text-sm font-semibold text-gray-900 truncate mb-1 group-hover:text-emerald-600 transition-colors">
                        {sale.title}
                      </h3>
                      <p className="text-xs text-gray-500 truncate mb-2">
                        {sale.brand}
                      </p>
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs text-gray-500 font-medium">
                        {formatDate(sale.sold_at)}
                      </span>
                      <span className={`text-base font-bold ${
                        sale.net_profit >= 0
                          ? 'bg-gradient-to-r from-emerald-600 to-emerald-700 bg-clip-text text-transparent'
                          : 'text-red-600'
                      }`}>
                        {sale.net_profit >= 0 ? '+' : ''}{sale.net_profit.toFixed(2)} €
                      </span>
                    </div>
                  </div>
                </div>

                <div className="px-4 pb-3 pt-2 bg-gradient-to-r from-gray-50 to-transparent border-t border-gray-100 flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs">
                    <div>
                      <span className="text-gray-500">Vendu:</span>
                      <span className="ml-1 font-semibold text-gray-900">{sale.sold_price.toFixed(2)} €</span>
                    </div>
                    <div className="w-px h-4 bg-gray-300"></div>
                    <div>
                      <span className="text-gray-500">Frais:</span>
                      <span className="ml-1 font-semibold text-gray-900">{(sale.fees + sale.shipping_cost).toFixed(2)} €</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedSale(sale);
                      }}
                      className="p-2 rounded-xl hover:bg-white text-gray-500 hover:text-emerald-600 transition-all active:scale-90"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingSale(sale);
                      }}
                      className="p-2 rounded-xl hover:bg-white text-gray-500 hover:text-blue-600 transition-all active:scale-90"
                    >
                      <ClipboardEdit className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {selectedSale && (
        <SaleDetailModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
        />
      )}

      {editingSale && (
        <ArticleSoldModal
          isOpen={true}
          article={{
            id: editingSale.id,
            title: editingSale.title,
            brand: editingSale.brand,
            price: editingSale.price,
            photos: editingSale.photos,
            seller_id: editingSale.seller_id,
          } as any}
          onClose={() => setEditingSale(null)}
          onConfirm={async (saleData) => {
            try {
              const netProfit = saleData.soldPrice - saleData.fees - saleData.shippingCost;

              const { error } = await supabase
                .from('articles')
                .update({
                  sold_price: saleData.soldPrice,
                  sold_at: saleData.soldAt,
                  platform: saleData.platform,
                  shipping_cost: saleData.shippingCost,
                  fees: saleData.fees,
                  net_profit: netProfit,
                  buyer_name: saleData.buyerName || null,
                  sale_notes: saleData.notes || null,
                  seller_id: saleData.sellerId || null,
                  updated_at: new Date().toISOString(),
                })
                .eq('id', editingSale.id);

              if (error) throw error;

              await loadSales();
            } catch (error) {
              console.error('Error updating sale:', error);
              throw error;
            }
          }}
          initialData={{
            soldPrice: editingSale.sold_price,
            soldAt: editingSale.sold_at,
            platform: editingSale.platform,
            fees: editingSale.fees,
            shippingCost: editingSale.shipping_cost,
            buyerName: editingSale.buyer_name,
            notes: editingSale.sale_notes,
            sellerId: editingSale.seller_id,
          }}
        />
      )}
    </div>
  );
}
