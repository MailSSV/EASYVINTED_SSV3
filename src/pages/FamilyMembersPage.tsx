import { useState, useEffect } from 'react';
import { Users, Plus, Edit2, Trash2, Star, Pencil } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { Toast } from '../components/ui/Toast';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { PERSONAS } from '../constants/personas';
import { CustomPersonaModal, CustomPersonaData } from '../components/CustomPersonaModal';

interface FamilyMember {
  id: string;
  name: string;
  age: number;
  persona_id: string;
  custom_persona_id: string | null;
  writing_style: string | null;
  is_default: boolean;
  clothing_size: string | null;
  shoe_size: string | null;
}

export function FamilyMembersPage() {
  const { user } = useAuth();
  const [members, setMembers] = useState<FamilyMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [memberToDelete, setMemberToDelete] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [editingMember, setEditingMember] = useState<FamilyMember | null>(null);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'error' } | null>(null);
  const [isPersonaModalOpen, setIsPersonaModalOpen] = useState(false);
  const [customPersonaData, setCustomPersonaData] = useState<CustomPersonaData | null>(null);
  const [editingBasePersonaId, setEditingBasePersonaId] = useState<string | null>(null);
  const [editingCustomPersonaId, setEditingCustomPersonaId] = useState<string | null>(null);
  const [customPersonas, setCustomPersonas] = useState<Record<string, CustomPersonaData & { id: string }>>({});
  const [standaloneCustomPersonas, setStandaloneCustomPersonas] = useState<Array<CustomPersonaData & { id: string }>>([]);

  const [formData, setFormData] = useState({
    name: '',
    age: '',
    persona_id: 'friendly',
    writing_style: '',
    is_default: false,
    clothing_size: '',
    shoe_size: '',
  });

  useEffect(() => {
    loadData();
    loadCustomPersonas();
  }, [user]);

  async function loadData() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('family_members')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });

      if (error) throw error;
      setMembers(data || []);
    } catch (error) {
      console.error('Error loading data:', error);
      setToast({ message: 'Erreur lors du chargement des données', type: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomPersonas() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('custom_personas')
        .select('*')
        .eq('user_id', user.id);

      if (error) throw error;

      const personasMap: Record<string, CustomPersonaData & { id: string }> = {};
      const standalone: Array<CustomPersonaData & { id: string }> = [];

      data?.forEach(persona => {
        const personaData = {
          id: persona.id,
          name: persona.name,
          emoji: persona.emoji,
          description: persona.description,
          color: persona.color,
          writing_style: persona.writing_style,
        };

        if (persona.base_persona_id) {
          personasMap[persona.base_persona_id] = personaData;
        } else {
          standalone.push(personaData);
        }
      });

      setCustomPersonas(personasMap);
      setStandaloneCustomPersonas(standalone);
    } catch (error) {
      console.error('Error loading custom personas:', error);
    }
  }

  function openModal(member?: FamilyMember) {
    if (member) {
      setEditingMember(member);
      setFormData({
        name: member.name,
        age: member.age.toString(),
        persona_id: member.persona_id,
        writing_style: member.writing_style || '',
        is_default: member.is_default,
        clothing_size: member.clothing_size || '',
        shoe_size: member.shoe_size || '',
      });
    } else {
      setEditingMember(null);
      setFormData({
        name: '',
        age: '',
        persona_id: 'friendly',
        writing_style: '',
        is_default: false,
        clothing_size: '',
        shoe_size: '',
      });
    }
    setShowModal(true);
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
        writing_style: formData.writing_style || null,
        is_default: formData.is_default,
        clothing_size: formData.clothing_size || null,
        shoe_size: formData.shoe_size || null,
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

  async function handleDelete() {
    if (!memberToDelete) return;

    try {
      const { error } = await supabase
        .from('family_members')
        .delete()
        .eq('id', memberToDelete);

      if (error) throw error;
      setToast({ message: 'Membre supprimé avec succès', type: 'success' });
      setMemberToDelete(null);
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
    if (member.persona_id === 'custom' && member.custom_persona_id) {
      const standalonePersona = standaloneCustomPersonas.find(p => p.id === member.custom_persona_id);
      if (standalonePersona) {
        return {
          name: standalonePersona.name,
          emoji: standalonePersona.emoji,
          color: standalonePersona.color,
          description: standalonePersona.description,
        };
      }
    }

    const customPersona = customPersonas[member.persona_id];
    if (customPersona) {
      return {
        name: customPersona.name,
        emoji: customPersona.emoji,
        color: customPersona.color,
        description: customPersona.description,
      };
    }

    const persona = PERSONAS.find(p => p.id === member.persona_id);
    if (persona) {
      return {
        name: persona.name,
        emoji: persona.emoji,
        color: persona.color,
        description: persona.description,
      };
    }

    return {
      name: 'Personnalisé',
      emoji: '✨',
      color: 'bg-purple-100 border-purple-300',
      description: member.writing_style || 'Style d\'écriture personnalisé',
    };
  }

  async function handleSavePersona(personaData: CustomPersonaData) {
    if (!user) return;

    try {
      if (editingCustomPersonaId) {
        const { error } = await supabase
          .from('custom_personas')
          .update({
            name: personaData.name,
            emoji: personaData.emoji,
            description: personaData.description,
            color: personaData.color,
            writing_style: personaData.writing_style,
          })
          .eq('id', editingCustomPersonaId)
          .eq('user_id', user.id);

        if (error) throw error;

        await loadCustomPersonas();
        setToast({ message: 'Persona modifié avec succès', type: 'success' });
      } else if (editingBasePersonaId) {
        const { error } = await supabase
          .from('custom_personas')
          .upsert({
            user_id: user.id,
            base_persona_id: editingBasePersonaId,
            name: personaData.name,
            emoji: personaData.emoji,
            description: personaData.description,
            color: personaData.color,
            writing_style: personaData.writing_style,
          }, {
            onConflict: 'user_id,base_persona_id'
          });

        if (error) throw error;

        await loadCustomPersonas();
        setToast({ message: 'Persona modifié avec succès', type: 'success' });
      } else {
        const { data, error } = await supabase
          .from('custom_personas')
          .insert({
            user_id: user.id,
            base_persona_id: null,
            name: personaData.name,
            emoji: personaData.emoji,
            description: personaData.description,
            color: personaData.color,
            writing_style: personaData.writing_style,
          })
          .select()
          .single();

        if (error) throw error;

        await loadCustomPersonas();

        setFormData({
          ...formData,
          persona_id: 'custom',
          writing_style: personaData.writing_style,
        });

        setToast({ message: 'Persona créé avec succès', type: 'success' });
      }

      setIsPersonaModalOpen(false);
      setEditingBasePersonaId(null);
      setEditingCustomPersonaId(null);
      setCustomPersonaData(null);
    } catch (error) {
      console.error('Error saving persona:', error);
      setToast({ message: 'Erreur lors de la sauvegarde du persona', type: 'error' });
    }
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
            <h1 className="text-2xl font-bold text-gray-900">Nos vendeurs</h1>
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
            Créez des profils pour les différents vendeurs de votre équipe
          </p>
          
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
                    {(member.clothing_size || member.shoe_size) && (
                      <div className="flex gap-3 mb-3 text-sm text-gray-700">
                        {member.clothing_size && (
                          <div>
                            <span className="text-gray-500">Taille: </span>
                            <span className="font-medium">{member.clothing_size}</span>
                          </div>
                        )}
                        {member.shoe_size && (
                          <div>
                            <span className="text-gray-500">Pointure: </span>
                            <span className="font-medium">{member.shoe_size}</span>
                          </div>
                        )}
                      </div>
                    )}
                    <div className={`flex items-center justify-between p-3 rounded-lg border ${personaInfo.color}`}>
                      <div className="flex items-center flex-1 min-w-0">
                        <span className="mr-2 text-lg flex-shrink-0">{personaInfo.emoji}</span>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">{personaInfo.name}</span>
                            {(member.persona_id === 'custom' || customPersonas[member.persona_id]) && (
                              <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                                Personnalisé
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">
                            {personaInfo.description}
                          </p>
                        </div>
                      </div>
                      <button
                        onClick={() => openModal(member)}
                        className="ml-2 p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-100 rounded transition-colors flex-shrink-0"
                        title="Modifier le persona"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
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
                      onClick={() => setMemberToDelete(member.id)}
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
        <Modal
          isOpen={showModal}
          onClose={closeModal}
          title={editingMember ? 'Modifier le membre' : 'Ajouter un membre'}
          footer={
            <div className="flex space-x-3">
              <Button type="button" variant="secondary" onClick={closeModal} className="flex-1">
                Annuler
              </Button>
              <Button type="submit" form="family-member-form" className="flex-1">
                {editingMember ? 'Modifier' : 'Ajouter'}
              </Button>
            </div>
          }
        >
          <form id="family-member-form" onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="clothing_size" className="block text-sm font-medium text-gray-700 mb-1">
                  Taille de vêtements
                </label>
                <select
                  id="clothing_size"
                  value={formData.clothing_size}
                  onChange={(e) => setFormData({ ...formData, clothing_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
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
                  value={formData.shoe_size}
                  onChange={(e) => setFormData({ ...formData, shoe_size: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-transparent"
                  placeholder="Ex: 38, 42"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="block text-sm font-medium text-gray-700">
                  Style rédactionnel
                </label>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setIsPersonaModalOpen(true)}
                  className="text-xs"
                >
                  <Plus className="w-3 h-3" />
                  Créer un style personnalisé
                </Button>
              </div>
              <div className="space-y-2">
                {PERSONAS.map(persona => {
                  const customPersona = customPersonas[persona.id];
                  const displayPersona = customPersona || persona;

                  return (
                    <div
                      key={persona.id}
                      className={`flex items-start p-3 border rounded-lg transition-colors ${
                        formData.persona_id === persona.id
                          ? 'border-teal-500 bg-teal-50'
                          : 'border-gray-200 hover:border-gray-300'
                      }`}
                    >
                      <input
                        type="radio"
                        name="persona"
                        value={persona.id}
                        checked={formData.persona_id === persona.id}
                        onChange={() => setFormData({
                          ...formData,
                          persona_id: persona.id,
                          writing_style: customPersona?.writing_style || persona.writingStyle
                        })}
                        className="mt-1 mr-3 cursor-pointer"
                      />
                      <div className="flex-1 cursor-pointer" onClick={() => setFormData({
                        ...formData,
                        persona_id: persona.id,
                        writing_style: customPersona?.writing_style || persona.writingStyle
                      })}>
                        <div className="flex items-center mb-1">
                          <span className="mr-2">{displayPersona.emoji}</span>
                          <span className="font-medium text-gray-900">{displayPersona.name}</span>
                          {customPersona && (
                            <span className="ml-2 text-xs bg-teal-100 text-teal-800 px-2 py-0.5 rounded">
                              Personnalisé
                            </span>
                          )}
                        </div>
                        <p className="text-sm text-gray-600">{displayPersona.description}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBasePersonaId(persona.id);
                          setCustomPersonaData(customPersona || {
                            name: persona.name,
                            emoji: persona.emoji,
                            description: persona.description,
                            color: persona.color,
                            writing_style: persona.writingStyle,
                          });
                          setIsPersonaModalOpen(true);
                        }}
                        className="ml-2 p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-100 rounded transition-colors"
                        title="Modifier ce persona"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                {standaloneCustomPersonas.map(customPersona => (
                  <div
                    key={customPersona.id}
                    className={`flex items-start p-3 border rounded-lg transition-colors ${
                      formData.persona_id === 'custom'
                        ? 'border-teal-500 bg-teal-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <input
                      type="radio"
                      name="persona"
                      value="custom"
                      checked={formData.persona_id === 'custom'}
                      onChange={() => setFormData({
                        ...formData,
                        persona_id: 'custom',
                        writing_style: customPersona.writing_style
                      })}
                      className="mt-1 mr-3 cursor-pointer"
                    />
                    <div className="flex-1 cursor-pointer" onClick={() => setFormData({
                      ...formData,
                      persona_id: 'custom',
                      writing_style: customPersona.writing_style
                    })}>
                      <div className="flex items-center mb-1">
                        <span className="mr-2">{customPersona.emoji}</span>
                        <span className="font-medium text-gray-900">{customPersona.name}</span>
                        <span className="ml-2 text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                          Personnalisé
                        </span>
                      </div>
                      <p className="text-sm text-gray-600">{customPersona.description}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setEditingCustomPersonaId(customPersona.id);
                        setCustomPersonaData({
                          name: customPersona.name,
                          emoji: customPersona.emoji,
                          description: customPersona.description,
                          color: customPersona.color,
                          writing_style: customPersona.writing_style,
                        });
                        setIsPersonaModalOpen(true);
                      }}
                      className="ml-2 p-1.5 text-gray-400 hover:text-teal-600 hover:bg-teal-100 rounded transition-colors"
                      title="Modifier ce persona"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                  </div>
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
          </form>
        </Modal>
      )}

      <ConfirmModal
        isOpen={memberToDelete !== null}
        onClose={() => setMemberToDelete(null)}
        onConfirm={handleDelete}
        title="Supprimer le membre"
        message="Êtes-vous sûr de vouloir supprimer ce membre ? Cette action est irréversible."
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />

      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <CustomPersonaModal
        isOpen={isPersonaModalOpen}
        onClose={() => {
          setIsPersonaModalOpen(false);
          setEditingBasePersonaId(null);
          setEditingCustomPersonaId(null);
          setCustomPersonaData(null);
        }}
        onSave={handleSavePersona}
        initialData={customPersonaData}
        basePersonaId={editingBasePersonaId || undefined}
      />
    </div>
  );
}
