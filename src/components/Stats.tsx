import { TrendingUp, Package, ShoppingBag, Euro, Wallet, TrendingDown } from 'lucide-react';
import { Product } from '../lib/supabase';
import { Card, IconCircle, GradientStatCard, InfoRow } from './ui/UiKit';

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
      variant: 'soft' as const,
    },
    {
      icon: ShoppingBag,
      label: 'Disponibles',
      value: availableProducts,
      variant: 'success' as const,
    },
    {
      icon: TrendingUp,
      label: 'Vendus',
      value: soldProducts,
      variant: 'solid' as const,
    },
    {
      icon: Euro,
      label: 'Bénéfice réalisé',
      value: `${totalProfit.toFixed(2)}€`,
      variant: 'success' as const,
    },
  ];

  return (
    <div className="space-y-5 sm:space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <div className="flex items-center justify-between">
              <div className="min-w-0">
                <p className="text-xs sm:text-sm text-slate-500 mb-1.5">{stat.label}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900">{stat.value}</p>
              </div>
              <IconCircle icon={stat.icon} variant={stat.variant} />
            </div>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
        <Card>
          <InfoRow
            icon={TrendingDown}
            title="Investissement total"
            description="Coût d'achat cumulé"
            value={`${totalInvestment.toFixed(2)}€`}
            valueClassName="text-slate-900"
            separator={false}
          />
        </Card>

        <Card>
          <InfoRow
            icon={Wallet}
            title="Revenu total"
            description="Somme des ventes réalisées"
            value={`${totalRevenue.toFixed(2)}€`}
            valueClassName="text-emerald-600"
            separator={false}
          />
        </Card>

        <GradientStatCard
          label="Revenu potentiel"
          value={`${potentialRevenue.toFixed(2)}€`}
          sublabel="Si tous les articles disponibles sont vendus"
        />
      </div>
    </div>
  );
}
