import { Link } from "react-router-dom";
import {
  Sparkles,
  Calendar,
  Upload,
  CheckCircle2,
  Clock,
  BarChart3,
} from "lucide-react";

export function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-emerald-50 via-white to-sky-50 flex items-center px-4">
      <div className="max-w-6xl mx-auto w-full py-10 sm:py-14">
        <div className="grid gap-10 md:grid-cols-2 items-center">
          {/* COLONNE GAUCHE : TEXTE + CTA */}
          <div>
            {/* Badges */}
            <div className="inline-flex items-center gap-2 rounded-full bg-emerald-100/70 px-3 py-1 text-xs font-medium text-emerald-900 mb-4">
              <Sparkles className="h-4 w-4" />
              <span>Conçu pour les vendeurs Vinted</span>
              <span className="inline-flex items-center rounded-full bg-emerald-900 text-white px-2 py-0.5 text-[11px]">
                Bêta privée
              </span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-gray-900 mb-4">
              Automatisez votre business{" "}
              <span className="text-emerald-600">Vinted</span>
            </h1>

            <p className="text-base sm:text-lg text-gray-600 mb-6 leading-relaxed">
              Centralisez vos fiches produits, planifiez vos publications
              et laissez EasyVinted publier vos annonces au meilleur moment,
              sans vous connecter à Vinted toutes les 5 minutes.
            </p>

            {/* 3 bénéfices rapides */}
            <div className="space-y-3 mb-8">
              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-emerald-100 p-1.5">
                  <Upload className="h-4 w-4 text-emerald-700" />
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-900">
                    Création automatique
                  </p>
                  <p>
                    L&apos;IA génère titre, description, prix et catégorie
                    à partir de vos photos.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-sky-100 p-1.5">
                  <Calendar className="h-4 w-4 text-sky-700" />
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-900">
                    Planification intelligente
                  </p>
                  <p>
                    Programmez vos annonces selon les meilleures périodes de
                    vente et la saison.
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3">
                <div className="mt-1 rounded-full bg-violet-100 p-1.5">
                  <BarChart3 className="h-4 w-4 text-violet-700" />
                </div>
                <div className="text-sm text-gray-700">
                  <p className="font-medium text-gray-900">
                    Publication optimisée
                  </p>
                  <p>
                    EasyVinted prépare la mise en ligne pour vous :
                    vous gardez le contrôle, sans la charge mentale.
                  </p>
                </div>
              </div>
            </div>

            {/* CTA */}
            <div className="flex flex-wrap items-center gap-3">
              <Link to="/articles/nouveau">
                <button className="inline-flex items-center justify-center rounded-full bg-emerald-600 px-6 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-500/30 hover:bg-emerald-700 transition">
                  <span className="mr-2 text-lg">+</span>
                  Ajouter un article
                </button>
              </Link>

              <Link to="/dashboard">
                <button className="inline-flex items-center justify-center rounded-full border border-emerald-200 bg-white px-5 py-2.5 text-sm font-medium text-emerald-800 hover:border-emerald-300 hover:bg-emerald-50 transition">
                  Mes articles
                </button>
              </Link>

              <span className="text-[11px] text-gray-500">
                Aucun risque : vos annonces restent en brouillon tant
                que vous ne validez pas.
              </span>
            </div>
          </div>

          {/* COLONNE DROITE : FAUX DASHBOARD */}
          <div className="relative">
            {/* halo de fond */}
            <div className="absolute -inset-6 bg-gradient-to-tr from-emerald-200/30 via-sky-200/20 to-violet-200/40 blur-3xl opacity-60 pointer-events-none" />

            <div className="relative rounded-3xl bg-white/90 border border-emerald-50 shadow-xl shadow-emerald-100/70 p-5 sm:p-6 backdrop-blur">
              {/* header mini-dashboard */}
              <div className="flex items-center justify-between mb-4">
                <div>
                  <p className="text-xs font-medium text-emerald-600 uppercase tracking-wide">
                    Aperçu EasyVinted
                  </p>
                  <p className="text-sm text-gray-500">
                    Votre stock prêt à être publié
                  </p>
                </div>
                <span className="inline-flex items-center rounded-full bg-emerald-50 px-3 py-1 text-[11px] font-medium text-emerald-700">
                  <CheckCircle2 className="h-3 w-3 mr-1" />
                  3 annonces prêtes
                </span>
              </div>

              {/* stats */}
              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="rounded-2xl border border-slate-100 bg-slate-50/60 px-3 py-3">
                  <p className="text-[11px] text-gray-500 mb-1">Brouillons</p>
                  <p className="text-xl font-semibold text-gray-900">8</p>
                  <p className="text-[11px] text-gray-400 mt-1">
                    À finaliser avec l&apos;IA
                  </p>
                </div>
                <div className="rounded-2xl border border-emerald-100 bg-emerald-50/70 px-3 py-3">
                  <p className="text-[11px] text-emerald-700 mb-1">Prêts</p>
                  <p className="text-xl font-semibold text-emerald-900">3</p>
                  <p className="text-[11px] text-emerald-700/70 mt-1">
                    Publication en 24h
                  </p>
                </div>
              </div>

              {/* liste d’articles */}
              <div className="space-y-2.5 mb-4">
                {[
                  { title: "Robe fleurie Zara", status: "Planifié", chip: "Demain • 9h42", color: "bg-amber-50 text-amber-700" },
                  { title: "Sneakers Nike Air", status: "Prêt", chip: "À programmer", color: "bg-emerald-50 text-emerald-700" },
                  { title: "Doudoune The North Face", status: "Brouillon", chip: "Photo à ajouter", color: "bg-slate-50 text-slate-600" },
                ].map((item, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between rounded-xl border border-slate-100 bg-slate-50/60 px-3 py-2.5"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-900 truncate">
                        {item.title}
                      </p>
                      <p className="text-[11px] text-gray-500 flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" />
                        {item.chip}
                      </p>
                    </div>
                    <span
                      className={`ml-3 inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-medium ${item.color}`}
                    >
                      {item.status}
                    </span>
                  </div>
                ))}
              </div>

              {/* timeline rapide */}
              <div className="flex items-center gap-2 text-[11px] text-gray-500 border-t border-slate-100 pt-3">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-50">
                  <Sparkles className="h-3 w-3 text-emerald-700" />
                </span>
                <span>
                  1. Ajoutez vos photos · 2. L&apos;IA prépare la fiche · 3. Vous
                  validez la publication.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* baseline en bas */}
        <p className="mt-8 text-center text-xs text-gray-500">
          EasyVinted · Automatisez vos ventes Vinted tout en restant maître de
          votre flemme stratégique 😌
        </p>
      </div>
    </div>
  );
}

export default HomePage;
