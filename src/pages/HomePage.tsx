import { Link } from "react-router-dom";
import { Upload, Calendar, TrendingUp } from "lucide-react";

export function HomePage() {
  return (
   
      <div className="max-w-4xl w-full bg-gray-50/50 rounded-3xl px-6 sm:px-12 py-10 sm:py-12">

        {/* HERO */}
        <div className="mb-10">
          <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 mb-6 leading-tight">
            Automatisez votre business <span className="text-emerald-600">Vinted</span>
          </h1>

          <p className="text-lg text-gray-600 max-w-2xl leading-relaxed">
            Centralisez vos fiches produits, planifiez vos publications et laissez EasyVinted publier vos annonces au meilleur moment, sans vous connecter à Vinted toutes les 5 minutes.
          </p>
        </div>

        {/* 3 AVANTAGES */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
          <div className="flex flex-col items-start">
            <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center mb-4">
              <Upload className="w-6 h-6 text-emerald-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Création automatique
            </h3>
            <p className="text-base text-gray-600 leading-relaxed">
              L&apos;IA génère titre, description, prix et catégorie à partir de vos photos.
            </p>
          </div>

          <div className="flex flex-col items-start">
            <div className="w-12 h-12 bg-sky-100 rounded-xl flex items-center justify-center mb-4">
              <Calendar className="w-6 h-6 text-sky-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Planification intelligente
            </h3>
            <p className="text-base text-gray-600 leading-relaxed">
              Programmez vos annonces selon les meilleures périodes de vente et la saison.
            </p>
          </div>

          <div className="flex flex-col items-start">
            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-4">
              <TrendingUp className="w-6 h-6 text-purple-700" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Publication optimisée
            </h3>
            <p className="text-base text-gray-600 leading-relaxed">
              EasyVinted prépare la mise en ligne pour vous : vous gardez le contrôle, sans la charge mentale.
            </p>
          </div>
        </div>

        {/* CTA */}
        <div className="flex flex-col sm:flex-row gap-4">
          <Link
            to="/articles/new"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-base font-semibold bg-emerald-600 text-white hover:bg-emerald-700 transition shadow-sm"
          >
            + Ajouter un article
          </Link>

          <Link
            to="/stock"
            className="inline-flex items-center justify-center px-8 py-3.5 rounded-xl text-base font-semibold border-2 border-gray-300 text-gray-700 bg-white hover:bg-gray-50 transition"
          >
            Mes articles
          </Link>
        </div>
      </div>
   
  );
}
