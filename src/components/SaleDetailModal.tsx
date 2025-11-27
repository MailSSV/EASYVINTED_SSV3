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
    seller_name?: string;
  };
  onClose: () => void;
}

export function SaleDetailModal({ sale, onClose }: SaleDetailModalProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('fr-FR', {
      day: 'numeric',
      month: 'numeric',
      year: 'numeric',
      
    
    });
  };

  const totalCosts = sale.fees + sale.shipping_cost;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-[60] p-0 md:p-4 backdrop-blur-sm">
      <div className="bg-white md:rounded-2xl shadow-2xl max-w-5xl w-full h-full md:h-auto md:max-h-[90vh] overflow-hidden flex flex-col">
        <div className="sticky top-0 bg-gradient-to-br from-emerald-500 to-teal-600 px-4 md:px-6 pt-4 md:pt-5 pb-4">
          <div className="flex items-start gap-3 md:gap-4">
            <div className="w-11 h-11 md:w-12 md:h-12 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg flex-shrink-0">
              <BadgeCheck className="w-6 h-6 md:w-7 md:h-7 text-white" />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-xl md:text-2xl font-bold text-white mb-2">Vente réalisée</h2>
              <div className="flex items-center gap-2 text-sm text-white/90 mb-3">
                <Calendar className="w-3.5 h-3.5 flex-shrink-0" />
                <span className="font-medium">{formatDate(sale.sold_at)}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {sale.buyer_name && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/95 text-gray-700 backdrop-blur-sm shadow-sm">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{sale.buyer_name}</span>
                  </div>
                )}

                {sale.seller_name && (
                  <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/20 text-white backdrop-blur-sm border border-white/30">
                    <User className="w-3.5 h-3.5 flex-shrink-0" />
                    <span className="truncate max-w-[120px]">{sale.seller_name}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto bg-gray-50">
          <div className="p-4 md:p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
              <div className="lg:col-span-1">
                <div className="bg-white rounded-xl md:rounded-2xl p-4 shadow-sm border border-gray-100">
                  {sale.photos.length > 0 ? (
                    <img
                      src={sale.photos[0]}
                      alt={sale.title}
                      className="w-full aspect-square rounded-lg md:rounded-xl object-cover mb-4"
                    />
                  ) : (
                    <div className="w-full aspect-square bg-gray-100 rounded-lg md:rounded-xl flex items-center justify-center mb-4">
                      <Package className="w-16 h-16 md:w-20 md:h-20 text-gray-300" />
                    </div>
                  )}

                  <div className="space-y-1">
                    <h3 className="text-base md:text-lg font-bold text-gray-900 leading-snug">{sale.title}</h3>
                    <p className="text-sm text-gray-600 font-medium">{sale.brand}</p>
                  </div>
                </div>
              </div>

              <div className="lg:col-span-2">
                <div className="bg-white rounded-xl md:rounded-2xl p-4 md:p-6 shadow-sm border border-gray-100">
                  <h4 className="text-xs md:text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">Détail de la transaction</h4>

                  <div className="space-y-3">
                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-blue-50 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                          <ArrowUpRight className="w-4 h-4 md:w-5 md:h-5 text-blue-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">Prix de vente</p>
                          <p className="text-xs text-gray-500">Montant reçu</p>
                        </div>
                      </div>
                      <p className="text-base md:text-lg font-bold text-gray-900 ml-2 flex-shrink-0">{sale.sold_price.toFixed(2)} €</p>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-red-50 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                          <CreditCard className="w-4 h-4 md:w-5 md:h-5 text-red-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">Frais de plateforme</p>
                          <p className="text-xs text-gray-500 truncate">Commission {sale.platform}</p>
                        </div>
                      </div>
                      <p className="text-sm md:text-base font-semibold text-red-600 ml-2 flex-shrink-0">- {sale.fees.toFixed(2)} €</p>
                    </div>

                    <div className="flex items-center justify-between py-3 border-b border-gray-100">
                      <div className="flex items-center gap-2.5 md:gap-3 flex-1 min-w-0">
                        <div className="w-9 h-9 md:w-10 md:h-10 bg-orange-50 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                          <Truck className="w-4 h-4 md:w-5 md:h-5 text-orange-600" />
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900 truncate">Frais d'expédition</p>
                          <p className="text-xs text-gray-500">Livraison à l'acheteur</p>
                        </div>
                      </div>
                      <p className="text-sm md:text-base font-semibold text-orange-600 ml-2 flex-shrink-0">- {sale.shipping_cost.toFixed(2)} €</p>
                    </div>

                    <div className="flex items-center justify-between py-4 bg-gradient-to-br from-emerald-50 to-teal-50 rounded-xl md:rounded-2xl px-4 mt-4 shadow-sm border border-emerald-100">
                      <div>
                        <p className="text-sm font-bold text-emerald-900">BÉNÉFICE NET</p>
                        <p className="text-xs text-emerald-700">Après tous les frais</p>
                      </div>
                      <p className="text-xl md:text-2xl font-bold text-emerald-600">{sale.net_profit.toFixed(2)} €</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {sale.sale_notes && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl md:rounded-2xl p-4 md:p-5 mt-4 md:mt-6 shadow-sm">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 md:w-10 md:h-10 bg-amber-100 rounded-lg md:rounded-xl flex items-center justify-center flex-shrink-0">
                    <FileText className="w-4 h-4 md:w-5 md:h-5 text-amber-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-amber-900 mb-2">Notes de vente</h4>
                    <p className="text-sm text-amber-800 whitespace-pre-wrap leading-relaxed">{sale.sale_notes}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="mt-6 pb-2">
              <button
                onClick={onClose}
                className="w-full py-3.5 px-4 bg-gray-900 hover:bg-gray-800 text-white font-semibold rounded-xl md:rounded-2xl transition-all duration-200 shadow-lg active:scale-[0.98]"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
