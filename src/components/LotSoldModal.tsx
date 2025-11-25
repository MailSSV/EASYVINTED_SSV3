import { useState, FormEvent, useEffect } from 'react';
import { X } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface LotSoldModalProps {
  isOpen: boolean;
  lot: {
    id: string;
    name: string;
    price: number;
    photos: string[];
  };
  onClose: () => void;
  onConfirm: (saleData: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName: string;
    notes: string;
  }) => Promise<void>;
  initialData?: {
    soldPrice: number;
    soldAt: string;
    platform: string;
    fees: number;
    shippingCost: number;
    buyerName?: string;
    notes?: string;
  };
}

export function LotSoldModal({ isOpen, lot, onClose, onConfirm, initialData }: LotSoldModalProps) {
  const [soldPrice, setSoldPrice] = useState(initialData?.soldPrice || lot.price);
  const [soldAt, setSoldAt] = useState(
    initialData?.soldAt || new Date().toISOString().split('T')[0]
  );
  const [platform, setPlatform] = useState(initialData?.platform || 'Vinted');
  const [fees, setFees] = useState(initialData?.fees || 0);
  const [shippingCost, setShippingCost] = useState(initialData?.shippingCost || 0);
  const [buyerName, setBuyerName] = useState(initialData?.buyerName || '');
  const [notes, setNotes] = useState(initialData?.notes || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (isOpen && initialData) {
      setSoldPrice(initialData.soldPrice);
      setSoldAt(initialData.soldAt);
      setPlatform(initialData.platform);
      setFees(initialData.fees);
      setShippingCost(initialData.shippingCost);
      setBuyerName(initialData.buyerName || '');
      setNotes(initialData.notes || '');
    }
  }, [isOpen, initialData]);

  if (!isOpen) return null;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onConfirm({
        soldPrice,
        soldAt,
        platform,
        fees,
        shippingCost,
        buyerName,
        notes,
      });
      onClose();
    } catch (err) {
      console.error('Error in handleSubmit:', err);
      setError('Erreur lors de l\'enregistrement de la vente');
    } finally {
      setSubmitting(false);
    }
  };

  const netProfit = soldPrice - fees - shippingCost;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fadeIn">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl animate-slideUp">
        <div className="border-b border-gray-200 px-6 py-4 flex items-center justify-between">
          <h2 className="text-xl font-bold text-gray-900">
            {initialData ? 'Modifier la vente' : 'Enregistrer une vente'}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6">
          <div className="flex gap-6 mb-6">
            {lot.photos.length > 0 && (
              <div className="w-32 h-32 rounded-xl overflow-hidden bg-gray-100 flex-shrink-0">
                <img
                  src={lot.photos[0]}
                  alt={lot.name}
                  className="w-full h-full object-cover"
                />
              </div>
            )}
            <div className="flex-1">
              <h3 className="font-semibold text-gray-900 mb-1">{lot.name}</h3>
              <p className="text-sm text-gray-600">Prix initial: {lot.price.toFixed(2)}€</p>
            </div>
          </div>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-600">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Prix de vente (€) *
              </label>
              <input
                type="number"
                required
                step="0.01"
                min="0"
                value={soldPrice}
                onChange={(e) => setSoldPrice(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Date de vente *
              </label>
              <input
                type="date"
                required
                value={soldAt}
                onChange={(e) => setSoldAt(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Plateforme *
              </label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="Vinted">Vinted</option>
                <option value="Leboncoin">Leboncoin</option>
                <option value="Facebook">Facebook Marketplace</option>
                <option value="eBay">eBay</option>
                <option value="Autre">Autre</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom de l'acheteur
              </label>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                placeholder="Optionnel"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frais de la plateforme (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={fees}
                onChange={(e) => setFees(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Frais d'expédition (€)
              </label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={shippingCost}
                onChange={(e) => setShippingCost(parseFloat(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Notes
            </label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              rows={3}
              placeholder="Informations supplémentaires sur la vente..."
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            />
          </div>

          <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4 mb-6">
            <div className="grid grid-cols-2 gap-4 text-sm mb-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Prix de vente:</span>
                <span className="font-semibold text-gray-900">{soldPrice.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frais plateforme:</span>
                <span className="font-semibold text-gray-900">-{fees.toFixed(2)}€</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Frais d'expédition:</span>
                <span className="font-semibold text-gray-900">-{shippingCost.toFixed(2)}€</span>
              </div>
            </div>
            <div className="border-t border-blue-200 pt-3 flex justify-between items-center">
              <span className="font-semibold text-gray-900">Bénéfice net:</span>
              <span className={`text-xl font-bold ${
                netProfit >= 0 ? 'text-green-600' : 'text-red-600'
              }`}>
                {netProfit >= 0 ? '+' : ''}{netProfit.toFixed(2)}€
              </span>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="flex-1 px-4 py-2.5 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="flex-1 px-4 py-2.5 bg-gradient-to-r from-blue-600 to-indigo-600 text-white rounded-lg hover:from-blue-700 hover:to-indigo-700 transition-all font-medium shadow-lg shadow-blue-500/30 disabled:opacity-50"
            >
              {submitting ? 'Enregistrement...' : initialData ? 'Modifier' : 'Enregistrer'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
