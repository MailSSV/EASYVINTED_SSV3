import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';

interface UserProfile {
  name: string;
  phone_number: string;
  clothing_size: string;
  shoe_size: string;
  dressing_name: string;
}

export function ProfilePage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const [profile, setProfile] = useState<UserProfile>({
    name: '',
    phone_number: '',
    clothing_size: '',
    shoe_size: '',
    dressing_name: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  useEffect(() => {
    loadProfile();
  }, [user]);

  const loadProfile = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle();

      if (error) throw error;

      if (data) {
        setProfile({
          name: data.name || '',
          phone_number: data.phone_number || '',
          clothing_size: data.clothing_size || '',
          shoe_size: data.shoe_size || '',
          dressing_name: data.dressing_name || 'Mon Dressing',
        });
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleProfileSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setToast(null);

    try {
      const { data: existingProfile } = await supabase
        .from('user_profiles')
        .select('id')
        .eq('id', user.id)
        .maybeSingle();

      if (existingProfile) {
        const { error } = await supabase
          .from('user_profiles')
          .update({
            ...profile,
            updated_at: new Date().toISOString(),
          })
          .eq('id', user.id);

        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_profiles')
          .insert({
            id: user.id,
            ...profile,
          });

        if (error) throw error;
      }

      setToast({ type: 'success', text: 'Profil enregistré avec succès' });
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Error saving profile:', error);
      setToast({ type: 'error', text: 'Erreur lors de l\'enregistrement du profil' });
    } finally {
      setSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setToast(null);

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setToast({ type: 'error', text: 'Les mots de passe ne correspondent pas' });
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setToast({ type: 'error', text: 'Le mot de passe doit contenir au moins 6 caractères' });
      return;
    }

    setSaving(true);

    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      setToast({ type: 'success', text: 'Mot de passe modifié avec succès' });
      setTimeout(() => navigate('/'), 1500);
    } catch (error) {
      console.error('Error updating password:', error);
      setToast({ type: 'error', text: 'Erreur lors de la modification du mot de passe' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600"></div>
      </div>
    );
  }

  return (
    <>
      {toast && (
        <Toast
          message={toast.text}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
      <div className="max-w-2xl">
        <h1 className="text-2xl font-bold text-gray-900 mb-6">Mon profil</h1>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Informations personnelles</h2>

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div>
              <label htmlFor="dressing_name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom du Dressing
              </label>
              <p className="text-sm text-gray-500 mb-2">Le nom de votre espace de vente</p>
              <input
                type="text"
                id="dressing_name"
                value={profile.dressing_name}
                onChange={(e) => setProfile({ ...profile, dressing_name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Mon Dressing"
              />
            </div>

            <div>
              <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                Nom
              </label>
              <p className="text-sm text-gray-500 mb-2">Le nom associé à ce compte</p>
              <input
                type="text"
                id="name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Votre nom"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Adresse e-mail
              </label>
              <p className="text-sm text-gray-500 mb-2">L'adresse e-mail associée à ce compte</p>
              <input
                type="email"
                id="email"
                value={user?.email || ''}
                disabled
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
            </div>

            <div>
              <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-1">
                Numéro de téléphone
              </label>
              <p className="text-sm text-gray-500 mb-2">Le numéro de téléphone associé à ce compte</p>
              <input
                type="tel"
                id="phone_number"
                value={profile.phone_number}
                onChange={(e) => setProfile({ ...profile, phone_number: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="+33612345678"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="clothing_size" className="block text-sm font-medium text-gray-700 mb-1">
                  Taille de vêtements
                </label>
                <select
                  id="clothing_size"
                  value={profile.clothing_size}
                  onChange={(e) => setProfile({ ...profile, clothing_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                >
                  <option value="">Sélectionner</option>
                  <option value="XS">XS</option>
                  <option value="S">S</option>
                  <option value="M">M</option>
                  <option value="L">L</option>
                  <option value="XL">XL</option>
                  <option value="XXL">XXL</option>
                </select>
              </div>

              <div>
                <label htmlFor="shoe_size" className="block text-sm font-medium text-gray-700 mb-1">
                  Pointure
                </label>
                <input
                  type="text"
                  id="shoe_size"
                  value={profile.shoe_size}
                  onChange={(e) => setProfile({ ...profile, shoe_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                  placeholder="Ex: 38, 42"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? 'Enregistrement...' : 'Enregistrer'}
              </Button>
            </div>
          </form>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Modifier le mot de passe</h2>

          <form onSubmit={handlePasswordSubmit} className="space-y-4">
            <div>
              <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Nouveau mot de passe
              </label>
              <input
                type="password"
                id="newPassword"
                value={passwordData.newPassword}
                onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Minimum 6 caractères"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                Confirmer le nouveau mot de passe
              </label>
              <input
                type="password"
                id="confirmPassword"
                value={passwordData.confirmPassword}
                onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500"
                placeholder="Confirmer le mot de passe"
              />
            </div>

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={saving || !passwordData.newPassword || !passwordData.confirmPassword}
              >
                {saving ? 'Modification...' : 'Modifier le mot de passe'}
              </Button>
            </div>
          </form>
        </div>
      </div>
    </>
  );
}
