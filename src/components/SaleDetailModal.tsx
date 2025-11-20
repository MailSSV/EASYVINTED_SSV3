import { X, Package, Calendar, User, FileText, ShoppingBag, Truck, CreditCard, ArrowUpRight, BadgeCheck } from 'lucide-react';

interface SaleDetailModalProps {
  sale: {
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
  };
  onClose: () => void;
}

export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      
    
    });
  };

  const totalCosts = sale.fees + sale.shipping_cost;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
      <div className="bg-white rounded-2xl shadow-2xl max-w-5xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-r from-emerald-50 to-teal-50 px-6 py-5 border-b border-emerald-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 rounded-xl flex items-center justify-center shadow-lg">
                <BadgeCheck className="w-7 h-7 text-white" />
              </div>
              <div>
                <h2 className="text-2xl font-bold text-gray-900">Vente réalisée</h2>
                <div className="flex items-center gap-4 mt-1">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{formatDate(sale.sold_at)}</span>
                  </div>
                 
                  {sale.buyer_name && (
                    <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium bg-white text-gray-700 border border-gray-200 shadow-sm">
                      <User className="w-3.5 h-3.5" />
                      <span>{sale.buyer_name}</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-white/80 rounded-lg transition-colors"
            >
              <X className="w-6 h-6 text-gray-600" />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
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
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-5 mt-6">
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
      </div>
    </div>
  );
}
