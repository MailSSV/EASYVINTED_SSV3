import { X, Package, Calendar, User, FileText, ShoppingBag, Truck, CreditCard, ArrowDownRight, ArrowUpRight, BadgeCheck } from 'lucide-react';

interface SaleDetailModalProps {
  sale: {
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
  };
  onClose: () => void;
}

export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const totalCosts = (sale.actual_value || 0) + sale.fees + sale.shipping_cost;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gray-100 px-6 py-5 flex items-center justify-between border-b border-gray-200">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-500 rounded-lg flex items-center justify-center">
              <BadgeCheck className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">Vente réalisée</h2>
              <p className="text-sm text-gray-600">{formatDate(sale.sold_at)}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-200 rounded-lg transition-colors"
          >
            <X className="w-6 h-6 text-gray-600" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
              <div className="lg:col-span-1">
                <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                  {sale.photos.length > 0 ? (
                    <img
                      src={sale.photos[0]}
                      alt={sale.title}
                      className="w-full aspect-square rounded-lg object-cover mb-4"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-200 rounded-lg flex items-center justify-center mb-4">
                      <Package className="w-20 h-20 text-gray-400" />
                    </div>
                  )}

                  <div className="space-y-2">
                    <h3 className="text-lg font-bold text-gray-900">{sale.title}</h3>
                    <p className="text-sm text-gray-600 font-medium">{sale.brand}</p>

                    <div className="pt-3 flex items-center justify-between">
                      <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-semibold bg-emerald-100 text-emerald-800 border border-emerald-200">
                        <ShoppingBag className="w-4 h-4" />
                        {sale.platform}
                      </span>
                      {sale.buyer_name && (
                        <div className="flex items-center gap-2 text-xs text-gray-600">
                          <User className="w-4 h-4" />
                          <span className="font-medium">{sale.buyer_name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2 space-y-6">
                {sale.actual_value !== undefined && (
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                      <p className="text-xs font-medium text-gray-500 mb-1">COÛTS TOTAUX</p>
                      <p className="text-xl font-bold text-gray-900">{totalCosts.toFixed(2)} €</p>
                    </div>
                    <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                      <p className="text-xs font-medium text-blue-700 mb-1">REVENU BRUT</p>
                      <p className="text-xl font-bold text-blue-900">{sale.sold_price.toFixed(2)} €</p>
                    </div>
                    <div className="bg-emerald-50 rounded-xl p-4 border border-emerald-200">
                      <p className="text-xs font-medium text-emerald-700 mb-1">BÉNÉFICE NET</p>
                      <p className="text-xl font-bold text-emerald-900">{sale.net_profit.toFixed(2)} €</p>
                    </div>
                  </div>
                )}

                <div className="bg-white border border-gray-200 rounded-xl p-6">
                  <h4 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Détail de la transaction</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                          <ArrowUpRight className="w-5 h-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Prix de vente</p>
                          <p className="text-xs text-gray-500">Montant reçu</p>
                        </div>
                      </div>
                      <p className="text-lg font-bold text-gray-900">{sale.sold_price.toFixed(2)} €</p>
                    </div>

                    {sale.actual_value !== undefined && (
                      <div className="flex items-center justify-between py-3 border-b border-gray-100">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center">
                            <ArrowDownRight className="w-5 h-5 text-gray-600" />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">Coût d'acquisition</p>
                            <p className="text-xs text-gray-500">Prix d'achat initial</p>
                          </div>
                        </div>
                        <p className="text-base font-semibold text-gray-600">- {sale.actual_value.toFixed(2)} €</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-red-50 rounded-lg flex items-center justify-center">
                          <CreditCard className="w-5 h-5 text-red-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Frais de plateforme</p>
                          <p className="text-xs text-gray-500">Commission {sale.platform}</p>
                        </div>
                      </div>
                      <p className="text-base font-semibold text-red-600">- {sale.fees.toFixed(2)} €</p>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-orange-50 rounded-lg flex items-center justify-center">
                          <Truck className="w-5 h-5 text-orange-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">Frais d'expédition</p>
                          <p className="text-xs text-gray-500">Livraison à l'acheteur</p>
                        </div>
                      </div>
                      <p className="text-base font-semibold text-orange-600">- {sale.shipping_cost.toFixed(2)} €</p>
                    </div>

                    <div className="flex items-center justify-between py-4 bg-emerald-50 rounded-lg px-4 mt-4">
                      <div>
                        <p className="text-sm font-semibold text-emerald-900">BÉNÉFICE NET</p>
                        <p className="text-xs text-emerald-700">Après tous les frais</p>
                      </div>
                      <p className="text-2xl font-bold text-emerald-600">{sale.net_profit.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {sale.sale_notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-amber-100 rounded-lg flex items-center justify-center flex-shrink-0">
                    <FileText className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">Notes de vente</h4>
                    <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{sale.sale_notes}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="sticky bottom-0 bg-gray-50 border-t border-gray-200 px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <Calendar className="w-4 h-4" />
            <span>Référence: {sale.id.slice(0, 8)}</span>
          </div>
          <button
            onClick={onClose}
            className="px-6 py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-all font-semibold shadow-sm hover:shadow-md"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
}
