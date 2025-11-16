import { Link } from "react-router-dom";
import { Sparkles, Calendar, Upload } from "lucide-react";

export function HomePage() {
  return (
   
      <div className="max-w-5xl w-full bg-white rounded-3xl shadow-sm border border-emerald-100 px-6 sm:px-10 py-10 sm:py-12">
        
        {/* HERO */}
        <div className="text-center mb-10">
       

          <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 mb-3">
            Automatisez votre business Vinted
          </h1>

          <p className="text-base sm:text-lg text-gray-600 max-w-xl mx-auto leading-relaxed">
            Créez vos fiches produits avec l&apos;IA, planifiez vos publications
            et publiez vos annonces au meilleur moment, sans prise de tête.
          </p>
        </div>

        {/* 3 AVANTAGES */}
        <div className="grid md:grid-cols-3 gap-6 mb-10">
          <div className="bg-emerald-50/70 rounded-2xl p-5 border border-emerald-100">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <Sparkles className="w-5 h-5 text-emerald-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Création automatique
            </h3>
            <p className="text-sm text-gray-600">
              L&apos;IA génère titre, description, prix et catégorie à partir de vos photos.
            </p>
          </div>

          <div className="bg-grey-50/70 rounded-2xl p-5 border border-sky-100">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <Calendar className="w-5 h-5 text-sky-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Planification intelligente
            </h3>
            <p className="text-sm text-gray-600">
              Programmez vos annonces selon les meilleures périodes de vente.
            </p>
          </div>

          <div className="bg-purple-50/70 rounded-2xl p-5 border border-purple-100">
            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center mb-3 shadow-sm">
              <Upload className="w-5 h-5 text-purple-600" />
            </div>
            <h3 className="text-base font-semibold text-gray-900 mb-1.5">
              Publication optimisée
            </h3>
            <p className="text-sm text-gray-600">
              Publiez automatiquement sur Vinted aux moments les plus efficaces.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link
            to="/stock"
            className="inline-flex items-center justify-center px-8 py-3 rounded-full text-sm font-semibold border border-emerald-500 text-emerald-600 bg-white hover:bg-emerald-50 transition"
          >
            Mon Stock
          </Link>

          <Link
            to="/articles/new"
          
              className="inline-flex items-center justify-center px-8 py-3 rounded-full text-sm font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
          >
            
            + Ajouter un article
          </Link>
        </div>

        {/* Bas de page */}
        <div className="mt-6 text-center text-xs text-gray-500">
          EasyVinted · Automatisez vos ventes sur Vinted tout en restant maitres de votre flemmardise :) 

        </div>
      </div>
   
  );
}
