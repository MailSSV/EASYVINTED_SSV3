# Vinted Automation Scripts

Ce dossier contient les scripts d'automatisation pour publier des articles sur Vinted à partir de votre base de données Supabase.

## 📋 Prérequis

1. Node.js installé sur votre machine
2. Un compte Vinted actif
3. Des articles dans Supabase avec le statut `ready` ou `scheduled`

## 🚀 Installation

### Installer les dépendances

```bash
npm install
```

Le navigateur Playwright sera automatiquement installé lors de l'installation des dépendances.

## 🔐 Configuration initiale

### Étape 1 : Authentification Vinted

Avant de pouvoir publier automatiquement, vous devez sauvegarder votre session Vinted :

```bash
npm run vinted:setup
```

Ce script va :
1. Ouvrir un navigateur Chrome
2. Vous rediriger vers la page de connexion Vinted
3. Attendre que vous vous connectiez manuellement
4. Sauvegarder votre session dans `vinted-session.json`

**Important** : Appuyez sur Entrée dans le terminal une fois connecté pour sauvegarder la session.

### Étape 2 : Vérifier les variables d'environnement

Le fichier `.env` contient les paramètres suivants :

```env
VINTED_SESSION_PATH=./vinted-session.json
MAX_ARTICLES_PER_RUN=5
DELAY_BETWEEN_POSTS_MS=60000
```

- `VINTED_SESSION_PATH` : Chemin vers le fichier de session
- `MAX_ARTICLES_PER_RUN` : Nombre maximum d'articles à publier par exécution
- `DELAY_BETWEEN_POSTS_MS` : Délai en millisecondes entre chaque publication (par défaut 60 secondes)

## 📤 Publication d'articles

### Option 1 : Vérifier les articles prêts

```bash
npm run vinted:check
```

Affiche la liste des articles prêts à être publiés.

### Option 2 : Publication manuelle

```bash
npm run vinted:publish
```

### Option 3 : Publication automatique (recommandé)

```bash
npm run vinted:auto
```

Cette commande :
1. Vérifie s'il y a des articles à publier
2. Lance la publication automatiquement s'il y en a
3. Affiche un message si aucun article n'est prêt

Le script va :
1. Se connecter à Supabase
2. Récupérer les articles avec le statut `ready` ou `scheduled` (dont la date est atteinte)
3. Pour chaque article :
   - Ouvrir la page de création d'annonce Vinted
   - Remplir automatiquement les champs
   - Uploader les photos
   - Publier l'article
   - Récupérer l'URL de l'annonce
   - Mettre à jour le statut dans Supabase (`status='published'`)

## 📊 Statuts des articles

- `draft` : Brouillon, non prêt à être publié
- `ready` : Prêt à être publié immédiatement
- `scheduled` : Programmé pour publication à une date future
- `published` : Publié sur Vinted
- `sold` : Vendu

## ⚠️ Important

### Limites Vinted

Vinted peut limiter le nombre de publications par jour. Respectez ces limites :
- Ne publiez pas plus de 10-15 articles par jour
- Utilisez des délais raisonnables entre chaque publication (minimum 30-60 secondes)

### Sécurité

- Le fichier `vinted-session.json` contient vos données de session. **Ne le partagez jamais** et ne le commitez pas dans Git (il est déjà dans `.gitignore`)
- Vinted n'a pas d'API publique officielle. Cette automatisation utilise Playwright pour simuler un utilisateur humain.
- Si Vinted détecte une activité suspecte, votre compte pourrait être restreint.

### Maintenance

- Re-exécutez `npm run vinted:setup` si votre session expire (généralement après quelques jours/semaines)
- Vérifiez régulièrement que les sélecteurs CSS dans le code sont toujours valides (Vinted peut changer son interface)

## 🛠️ Résolution de problèmes

### "Not authenticated on Vinted"

Votre session a expiré. Exécutez à nouveau :
```bash
npm run vinted:setup
```

### Les champs ne sont pas remplis correctement

Vinted a peut-être changé son interface. Vous devrez mettre à jour les sélecteurs CSS dans `scripts/services/vintedAutomation.ts`.

### Photos non uploadées

Assurez-vous que les chemins vers les photos dans Supabase sont valides et accessibles depuis votre machine.

## 📁 Structure

```
scripts/
├── types/
│   └── vinted.ts              # Types TypeScript
├── services/
│   ├── supabaseService.ts     # Service Supabase
│   └── vintedAutomation.ts    # Automatisation Playwright
├── checkArticles.ts           # Vérifier les articles prêts
├── publishArticles.ts         # Script de publication
├── autoPublish.ts             # Publication automatique intelligente
├── setupVintedAuth.ts         # Script d'authentification
├── cron-setup.sh              # Configuration cron (Linux/Mac)
├── windows-task-setup.ps1     # Configuration Windows
└── README.md                  # Ce fichier
```

## 📝 Logs

Le script affiche des logs détaillés dans la console :
- ✅ Succès
- ❌ Erreurs
- 📊 Statistiques finales

Les tentatives de publication sont également enregistrées dans la table `publication_logs` de Supabase.

## 🔄 Automatisation complète

Pour publier automatiquement vos articles à intervalles réguliers, utilisez les scripts de configuration fournis :

### Linux / Mac (Cron)

```bash
bash scripts/cron-setup.sh
```

Ce script interactif vous permet de :
- Publier tous les jours à une heure précise
- Publier toutes les X heures
- Afficher la configuration actuelle
- Supprimer l'automatisation

Les logs seront sauvegardés dans `logs/vinted-auto.log`.

### Windows (Planificateur de tâches)

```powershell
powershell -ExecutionPolicy Bypass -File scripts/windows-task-setup.ps1
```

Ce script interactif vous permet de :
- Publier tous les jours à une heure précise
- Publier toutes les X heures
- Afficher la configuration actuelle
- Supprimer l'automatisation

### Configuration manuelle

Si vous préférez configurer manuellement :

**Cron (Linux/Mac)** - Publier tous les jours à 10h :
```bash
crontab -e
# Ajouter cette ligne :
0 10 * * * cd /chemin/vers/projet && npm run vinted:auto >> /chemin/vers/projet/logs/vinted-auto.log 2>&1
```

**Planificateur de tâches (Windows)** :
1. Ouvrir le Planificateur de tâches
2. Créer une tâche de base
3. Action : Démarrer un programme
4. Programme : `npm`
5. Arguments : `run vinted:auto`
6. Répertoire : chemin vers votre projet
