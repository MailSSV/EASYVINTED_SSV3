import { X, Printer } from 'lucide-react';
import { Button } from './ui/Button';

interface LotArticle {
  title: string;
  brand?: string;
}

interface LabelModalProps {
  isOpen: boolean;
  onClose: () => void;
  article: {
    reference_number: string;
    title: string;
    brand?: string;
    size?: string;
    color?: string;
    price: number;
  };
  sellerName?: string;
  lotArticles?: LotArticle[];
}

export function LabelModal({ isOpen, onClose, article, sellerName, lotArticles }: LabelModalProps) {
  if (!isOpen) return null;

  const isLot = lotArticles && lotArticles.length > 0;
  const uniqueBrands = isLot ? [...new Set(lotArticles.map(a => a.brand).filter(Boolean))] : [];

  const handlePrint = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const printWindow = window.open('', '_blank', 'width=800,height=600');
    if (!printWindow) {
      alert('Veuillez autoriser les popups pour imprimer l\'étiquette');
      return false;
    }

    const escapeHtml = (text: string) => {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    };

    const articlesListHTML = isLot
      ? lotArticles!.map(a => `<li>${escapeHtml(a.title)}</li>`).join('')
      : '';

    const articleContentHTML = isLot
      ? `<ul class="list-disc list-inside space-y-1">${articlesListHTML}</ul>`
      : `<p class="field-value-large">${escapeHtml(article.title)}</p>`;

    const brandsHTML = isLot && uniqueBrands.length > 0
      ? `<div>
          <p class="field-label">Marque${uniqueBrands.length > 1 ? 's' : ''}</p>
          <p class="field-value">${escapeHtml(uniqueBrands.join(', '))}</p>
        </div>`
      : article.brand
      ? `<div>
          <p class="field-label">Marque</p>
          <p class="field-value">${escapeHtml(article.brand)}</p>
        </div>`
      : '';

    const sizeHTML = article.size
      ? `<div>
          <p class="field-label">Taille</p>
          <p class="field-value">${escapeHtml(article.size)}</p>
        </div>`
      : '';

    const colorHTML = article.color
      ? `<div>
          <p class="field-label">Couleur</p>
          <p class="field-value">${escapeHtml(article.color)}</p>
        </div>`
      : '';

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Étiquette - ${article.reference_number}</title>
          <meta charset="UTF-8">
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }

            body {
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
              padding: 20mm;
              background: white;
            }

            .label-container {
              border: 2px solid #d1d5db;
              border-radius: 8px;
              padding: 24px;
              background: white;
              max-width: 180mm;
            }

            .header {
              text-align: center;
              margin-bottom: 24px;
              padding-bottom: 16px;
              border-bottom: 2px solid #e5e7eb;
            }

            .header h3 {
              font-size: 24px;
              font-weight: bold;
              color: #111827;
              margin-bottom: 12px;
            }

            .reference {
              display: inline-block;
              border: 2px solid #111827;
              padding: 8px 16px;
              border-radius: 4px;
            }

            .reference-label {
              font-size: 14px;
              font-weight: 500;
              color: #111827;
            }

            .reference-number {
              font-size: 18px;
              font-weight: bold;
              color: #111827;
            }

            .content {
              margin-top: 12px;
            }

            .content > div {
              margin-bottom: 12px;
            }

            .field-label {
              font-size: 12px;
              font-weight: 600;
              text-transform: uppercase;
              color: #6b7280;
              margin-bottom: 4px;
            }

            .field-value {
              font-size: 16px;
              color: #111827;
            }

            .field-value-large {
              font-size: 18px;
              font-weight: bold;
              color: #111827;
            }

            .grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 16px;
            }

            .price-section {
              padding-top: 12px;
              margin-top: 12px;
              border-top: 1px solid #e5e7eb;
            }

            .price {
              font-size: 24px;
              font-weight: bold;
              color: #059669;
            }

            ul {
              margin-left: 20px;
            }

            li {
              margin-bottom: 4px;
              font-size: 14px;
              color: #111827;
            }

            @page {
              size: A4;
              margin: 15mm;
            }

            @media print {
              body {
                padding: 0;
              }
            }
          </style>
        </head>
        <body>
          <div class="label-container">
            <div class="header">
              <h3>EasyVinted ${sellerName ? `by ${sellerName}` : ''}</h3>
              <div class="reference">
                <span class="reference-label">Réf: </span>
                <span class="reference-number">${article.reference_number}</span>
              </div>
            </div>

            <div class="content">
              <div>
                <p class="field-label">Article${isLot ? 's' : ''}</p>
                ${articleContentHTML}
              </div>

              ${brandsHTML}

              ${(sizeHTML || colorHTML) ? `<div class="grid">${sizeHTML}${colorHTML}</div>` : ''}

              <div class="price-section">
                <p class="field-label">Prix de vente</p>
                <p class="price">${article.price.toFixed(2)} €</p>
              </div>
            </div>
          </div>
        </body>
      </html>
    `);

    printWindow.document.close();

    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
    }, 500);

    return false;
  };

  const labelContent = (
    <div className="border-2 border-gray-300 rounded-lg p-6 bg-white">
      <div className="text-center mb-6 pb-4 border-b-2 border-gray-200">
        <h3 className="text-2xl font-bold text-gray-900 mb-3">
          EasyVinted {sellerName && `by ${sellerName}`}
        </h3>
        <div className="inline-block border-2 border-gray-900 px-4 py-2 rounded">
          <span className="text-sm font-medium text-gray-900">Réf: </span>
          <span className="text-lg font-bold text-gray-900">{article.reference_number}</span>
        </div>
      </div>

      <div className="space-y-3">
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Article{isLot ? 's' : ''}</p>
          {isLot ? (
            <ul className="list-disc list-inside space-y-1">
              {lotArticles.map((lotArticle, idx) => (
                <li key={idx} className="text-sm text-gray-900">{lotArticle.title}</li>
              ))}
            </ul>
          ) : (
            <p className="text-lg font-bold text-gray-900">{article.title}</p>
          )}
        </div>

        {(isLot ? uniqueBrands.length > 0 : article.brand) && (
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Marque{isLot && uniqueBrands.length > 1 ? 's' : ''}</p>
            {isLot ? (
              <p className="text-base text-gray-900">{uniqueBrands.join(', ')}</p>
            ) : (
              <p className="text-base text-gray-900">{article.brand}</p>
            )}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {article.size && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Taille</p>
              <p className="text-base text-gray-900">{article.size}</p>
            </div>
          )}

          {article.color && (
            <div>
              <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Couleur</p>
              <p className="text-base text-gray-900">{article.color}</p>
            </div>
          )}
        </div>

        <div className="pt-3 mt-3 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-500 uppercase mb-1">Prix de vente</p>
          <p className="text-2xl font-bold text-emerald-600">{article.price.toFixed(2)} €</p>
        </div>
      </div>
    </div>
  );

  return (
    <>
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4 no-print">
        <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between">
            <h2 className="text-xl font-bold text-gray-900">Étiquette de colis</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="p-6">
            <div className="mb-6 bg-blue-50 border border-blue-200 rounded-lg p-4">
              <p className="text-sm text-blue-800">
                Imprimez cette étiquette et collez la sur votre colis.
              </p>
                <p className="text-sm text-blue-800">
                Vous pourrez identifier plus facilement son contenu le jour de l'expedition :) 
              </p>
            </div>

            {labelContent}

            <div className="mt-6 flex gap-3">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center justify-center"
              >
                <Printer className="w-4 h-4 mr-2" />
                Imprimer l'étiquette
              </button>
              <button
                type="button"
                onClick={onClose}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded-lg font-medium transition-colors"
              >
                Fermer
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="print-only">
        {labelContent}
      </div>

      <style>{`
        .no-print {
          display: block;
        }

        .print-only {
          display: none;
        }

        @media print {
          @page {
            size: A4;
            margin: 15mm;
          }

          html, body {
            height: auto;
            overflow: visible;
          }

          .no-print {
            display: none !important;
          }

          .print-only {
            display: block !important;
            width: 180mm;
            padding: 0;
            margin: 0;
            page-break-after: avoid;
            page-break-inside: avoid;
          }

          .print-only > div {
            border: 2px solid #000 !important;
            border-radius: 8px;
            padding: 15mm;
            background: white;
            page-break-after: avoid;
            page-break-inside: avoid;
          }
        }
      `}</style>
    </>
  );
}
