import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Star } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PERSONAS } from '../constants/personas';

interface FamilyMember {
  id: string;
  name: string;
  age: number;
  persona_id: string;
  custom_persona_id: string | null;
  is_default: boolean;
}

interface CustomPersona {
  id: string;
  name: string;
  emoji: string;
  color: string;
}

export function FamilyMembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [customPersonas, setCustomPersonas] = useState<CustomPersona[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    persona_id: 'friendly',
    custom_persona_id: null as string | null,
    is_default: false,
  });

  useEffect(() => {
    loadData();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      const [membersResult, personasResult] = await Promise.all([
        supabase
          .from('family_members')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: true }),
        supabase
          .from('custom_personas')
          .select('id, name, emoji, color')
          .eq('user_id', user.id),
      ]);

      if (membersResult.error) throw membersResult.error;
      if (personasResult.error) throw personasResult.error;

      setMembers(membersResult.data || []);
      setCustomPersonas(personasResult.data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Erreur lors du chargement des données', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  function openModal(member?: FamilyMember) {
    console.log('openModal called', member);
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        age: member.age.toString(),
        persona_id: member.persona_id,
        custom_persona_id: member.custom_persona_id,
        is_default: member.is_default,
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        age: '',
        persona_id: 'friendly',
        custom_persona_id: null,
        is_default: false,
      });
    }
    setShowModal(true);
    console.log('showModal set to true');
  }

  function closeModal() {
    setShowModal(false);
    setEditingMember(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;

    const age = parseInt(formData.age);
    if (isNaN(age) || age < 1 || age > 120) {
      setToast({ message: 'Veuillez entrer un âge valide', type: 'error' });
      return;
    }

    try {
      const memberData = {
        user_id: user.id,
        name: formData.name.trim(),
        age,
        persona_id: formData.persona_id,
        custom_persona_id: formData.custom_persona_id,
        is_default: formData.is_default,
      };

      if (editingMember) {
        const { error } = await supabase
          .from('family_members')
          .update(memberData)
          .eq('id', editingMember.id);

        if (error) throw error;
        setToast({ message: 'Membre modifié avec succès', type: 'success' });
      } else {
        const { error } = await supabase
          .from('family_members')
          .insert([memberData]);

        if (error) throw error;
        setToast({ message: 'Membre ajouté avec succès', type: 'success' });
      }

      closeModal();
      loadData();
    } catch (error) {
      console.error('Error saving member:', error);
      setToast({ message: 'Erreur lors de l\'enregistrement', type: 'error' });
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Êtes-vous sûr de vouloir supprimer ce membre ?')) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', id);

      if (error) throw error;
      setToast({ message: 'Membre supprimé avec succès', type: 'success' });
      loadData();
    } catch (error) {
      console.error('Error deleting member:', error);
      setToast({ message: 'Erreur lors de la suppression', type: 'error' });
    }
  }

  async function toggleDefault(id: string, currentDefault: boolean) {
    if (!user) return;

    try {
      if (!currentDefault) {
        await supabase
          .from('family_members')
          .update({ is_default: false })
          .eq('user_id', user.id);
      }

      const { error } = await supabase
        .from('family_members')
        .update({ is_default: !currentDefault })
        .eq('id', id);

      if (error) throw error;
      loadData();
    } catch (error) {
      console.error('Error updating default:', error);
      setToast({ message: 'Erreur lors de la mise à jour', type: 'error' });
    }
  }

  function getPersonaInfo(member: FamilyMember) {
    if (member.custom_persona_id) {
      const customPersona = customPersonas.find(p => p.id === member.custom_persona_id);
      if (customPersona) {
        return {
          name: customPersona.name,
          emoji: customPersona.emoji,
          color: customPersona.color,
        };
      }
    }
    const persona = PERSONAS.find(p => p.id === member.persona_id);
    return persona ? {
      name: persona.name,
      emoji: persona.emoji,
      color: persona.color,
    } : {
      name: 'Aucun',
      emoji: '❓',
      color: 'bg-gray-100 border-gray-300',
    };
  }

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center text-gray-600">Chargement...</div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Users className="w-8 h-8 text-teal-600" />
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Membres de la Famille</h1>
            <p className="text-sm text-gray-600">Gérez les vendeurs de votre compte</p>
          </div>
        </div>
        <Button type="button" onClick={() => openModal()}>
          <Plus className="w-5 h-5" />
          Ajouter un membre
        </Button>
      </div>

      {members.length === 0 ? (
        <div className="bg-white rounded-lg border border-gray-200 p-12 text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Aucun membre</h3>
          <p className="text-gray-600 mb-6">
            Créez des profils pour les différents vendeurs de votre famille
          </p>
          <Button type="button" onClick={() => openModal()}>
            <Plus className="w-5 h-5" />
            Créer le premier membre
          </Button>
        </div>
      ) : (
        <div className="grid gap-4">
          {members.map(member => {
            const personaInfo = getPersonaInfo(member);
            return (
              <div
                key={member.id}
                className="bg-white rounded-lg border border-gray-200 p-6 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-xl font-semibold text-gray-900">{member.name}</h3>
                      {member.is_default && (
                        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-teal-100 text-teal-800">
                          <Star className="w-3 h-3 mr-1" />
                          Par défaut
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600 mb-3">
                      {member.age} ans
                    </p>
                    <div className={`inline-flex items-center px-3 py-1.5 rounded-lg border ${personaInfo.color}`}>
                      <span className="mr-2">{personaInfo.emoji}</span>
                      <span className="text-sm font-medium">{personaInfo.name}</span>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => toggleDefault(member.id, member.is_default)}
                      className={`p-2 rounded-lg transition-colors ${
                        member.is_default
                          ? 'text-teal-600 hover:bg-teal-50'
                          : 'text-gray-400 hover:bg-gray-50 hover:text-teal-600'
                      }`}
                      title={member.is_default ? 'Retirer par défaut' : 'Définir par défaut'}
                    >
                      <Star className={`w-5 h-5 ${member.is_default ? 'fill-current' : ''}`} />
                    </button>
                    <button
                      onClick={() => openModal(member)}
                      className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Modifier"
                    >
                      <Edit2 className="w-5 h-5" />
                    </button>
                    <button
                      onClick={() => handleDelete(member.id)}
                      className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Supprimer"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {showModal && (
        <Modal onClose={closeModal} title={editingMember ? 'Modifier le membre' : 'Ajouter un membre'}>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Nom / Pseudo
              </label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Ex: Nina, Tom, Papa..."
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Âge
              </label>
              <input
                type="number"
                value={formData.age}
                onChange={e => setFormData({ ...formData, age: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                placeholder="Ex: 25"
                min="1"
                max="120"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Style rédactionnel
              </label>
              <div className="space-y-2">
                {PERSONAS.map(persona => (
                  <label
                    key={persona.id}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.persona_id === persona.id && !formData.custom_persona_id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={persona.id}
                      checked={formData.persona_id === persona.id && !formData.custom_persona_id}
                      onChange={() => setFormData({ ...formData, persona_id: persona.id, custom_persona_id: null })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="mr-2">{persona.emoji}</span>
                        <span className="font-medium text-gray-900">{persona.name}</span>
                      </div>
                      <p className="text-sm text-gray-600">{persona.description}</p>
                    </div>
                  </label>
                ))}

                {customPersonas.map(persona => (
                  <label
                    key={persona.id}
                    className={`flex items-start p-3 border rounded-lg cursor-pointer transition-colors ${
                      formData.custom_persona_id === persona.id
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value={persona.id}
                      checked={formData.custom_persona_id === persona.id}
                      onChange={() => setFormData({ ...formData, custom_persona_id: persona.id })}
                      className="mt-1 mr-3"
                    />
                    <div className="flex-1">
                      <div className="flex items-center mb-1">
                        <span className="mr-2">{persona.emoji}</span>
                        <span className="font-medium text-gray-900">{persona.name}</span>
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          Personnalisé
                        </span>
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="is_default"
                checked={formData.is_default}
                onChange={e => setFormData({ ...formData, is_default: e.target.checked })}
                className="mr-2 rounded"
              />
              <label htmlFor="is_default" className="text-sm text-gray-700">
                Définir comme vendeur par défaut
              </label>
            </div>

            <div className="flex space-x-3 pt-4">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" className="flex-1">
                {editingMember ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}
    </div>
  );
}
