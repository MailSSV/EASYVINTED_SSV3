import { TrendingUp, Package, ShoppingBag, Euro } from 'lucide-react';
import { Product } from '../lib/supabase';

interface StatsProps {
  products: Product[];
}

export function Stats({ products }: StatsProps) {
  const totalProducts = products.length;
  const availableProducts = products.filter(p => p.status !== 'sold').length;
  const soldProducts = products.filter(p => p.status === 'sold').length;

  const totalInvestment = products.reduce((sum, p) => sum + (p.purchase_price || 0), 0);

  const totalRevenue = products
    .filter(p => p.status === 'sold')
    .reduce((sum, p) => sum + (p.sale_price || 0), 0);

  const totalProfit = totalRevenue - products
    .filter(p => p.status === 'sold')
    .reduce((sum, p) => sum + (p.purchase_price || 0), 0);

  const potentialRevenue = products
    .filter(p => p.status !== 'sold')
    .reduce((sum, p) => sum + p.price, 0);

  const stats = [
    {
      icon: Package,
      label: 'Total produits',
      value: totalProducts,
      color: 'bg-blue-500',
    },
    {
      icon: ShoppingBag,
      label: 'Disponibles',
      value: availableProducts,
      color: 'bg-green-500',
    },
    {
      icon: TrendingUp,
      label: 'Vendus',
      value: soldProducts,
      color: 'bg-purple-500',
    },
    {
      icon: Euro,
      label: 'Bénéfice réalisé',
      value: `${totalProfit.toFixed(2)}€`,
      color: 'bg-orange-500',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600 mb-1">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              </div>
              <div className={`${stat.color} p-3 rounded-lg`}>
                <stat.icon className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Investissement total</h3>
          <p className="text-2xl font-bold text-gray-900">{totalInvestment.toFixed(2)}€</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Revenu total</h3>
          <p className="text-2xl font-bold text-green-600">{totalRevenue.toFixed(2)}€</p>
        </div>

        <div className="bg-white rounded-lg shadow-md p-6">
          <h3 className="text-sm font-medium text-gray-600 mb-2">Revenu potentiel</h3>
          <p className="text-2xl font-bold text-blue-600">{potentialRevenue.toFixed(2)}€</p>
          <p className="text-xs text-gray-500 mt-1">Si tout est vendu</p>
        </div>
      </div>
    </div>
  );
}
