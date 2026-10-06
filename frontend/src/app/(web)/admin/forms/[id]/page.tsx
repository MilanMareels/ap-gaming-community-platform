'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { DndContext, closestCenter, DragEndEvent, PointerSensor, useSensor, useSensors } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus, Trash2, GripVertical, ArrowLeft, ExternalLink, Save, X } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';

type FieldType = 'SHORT_TEXT' | 'LONG_TEXT' | 'SELECT' | 'CHECKBOX' | 'FILE_UPLOAD' | 'TEXT_BLOCK';

interface FormField {
  id: number;
  type: FieldType;
  label: string;
  required: boolean;
  position: number;
  config: Record<string, unknown> | null;
}

interface DynamicForm {
  id: number;
  cuid: string;
  title: string;
  description: string | null;
  requiresAuth: boolean;
  confirmationEmail: boolean;
  discordWebhookUrl: string | null;
  isActive: boolean;
  fields: FormField[];
  _count: { submissions: number };
}

const FIELD_TYPE_LABELS: Record<FieldType, string> = {
  SHORT_TEXT: 'Kort tekstveld',
  LONG_TEXT: 'Lang tekstveld',
  SELECT: 'Keuzelijst',
  CHECKBOX: 'Checkboxes',
  FILE_UPLOAD: 'Bestand uploaden',
  TEXT_BLOCK: 'Tekstblok',
};

function SortableField({
  field,
  onUpdate,
  onDelete,
}: {
  field: FormField;
  onUpdate: (fieldId: number, data: Partial<FormField>) => void;
  onDelete: (fieldId: number) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: field.id });
  const style = { transform: CSS.Transform.toString(transform), transition };

  const [editing, setEditing] = useState(false);
  const [label, setLabel] = useState(field.label);
  const [required, setRequired] = useState(field.required);
  const [config, setConfig] = useState(field.config || {});

  const options = (config as { options?: string[] }).options || [];
  const allowedExtensions = (config as { allowedExtensions?: string[] }).allowedExtensions || [];
  const textContent = (config as { content?: string }).content || '';

  const handleSave = () => {
    onUpdate(field.id, { label, required, config: Object.keys(config).length > 0 ? config : undefined });
    setEditing(false);
  };

  const handleCancel = () => {
    setLabel(field.label);
    setRequired(field.required);
    setConfig(field.config || {});
    setEditing(false);
  };

  const addOption = () => {
    setConfig({ ...config, options: [...options, ''] });
  };

  const updateOption = (index: number, value: string) => {
    const newOptions = [...options];
    newOptions[index] = value;
    setConfig({ ...config, options: newOptions });
  };

  const removeOption = (index: number) => {
    setConfig({ ...config, options: options.filter((_, i) => i !== index) });
  };

  return (
    <div ref={setNodeRef} style={style} className="bg-slate-900 border border-slate-800 rounded-lg p-4 mb-2">
      <div className="flex items-center gap-3">
        <button {...attributes} {...listeners} className="text-gray-500 hover:text-white cursor-grab active:cursor-grabbing">
          <GripVertical size={16} />
        </button>
        <Badge variant="info">{FIELD_TYPE_LABELS[field.type]}</Badge>
        {!editing ? (
          <>
            <span className="flex-1 font-medium">{field.label}</span>
            {field.required && <Badge variant="warning">Verplicht</Badge>}
            <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>Bewerken</Button>
            <Button size="sm" variant="danger" onClick={() => onDelete(field.id)}><Trash2 size={14} /></Button>
          </>
        ) : (
          <span className="flex-1 font-medium text-yellow-400">Bewerken...</span>
        )}
      </div>

      {editing && (
        <div className="mt-4 space-y-3 pl-9">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Label</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
            />
          </div>

          {field.type !== 'TEXT_BLOCK' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={required} onChange={(e) => setRequired(e.target.checked)} className="rounded" />
              Verplicht veld
            </label>
          )}

          {(field.type === 'SELECT' || field.type === 'CHECKBOX') && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Opties</label>
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm"
                    value={opt}
                    onChange={(e) => updateOption(i, e.target.value)}
                    placeholder={`Optie ${i + 1}`}
                  />
                  <button onClick={() => removeOption(i)} className="text-red-400 hover:text-red-300">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button onClick={addOption} className="mt-2 text-sm text-red-400 hover:text-red-300">
                + Optie toevoegen
              </button>
            </div>
          )}

          {field.type === 'FILE_UPLOAD' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Toegestane extensies (komma-gescheiden)</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                placeholder=".pdf,.jpg,.png,.docx"
                value={allowedExtensions.join(',')}
                onChange={(e) => setConfig({ ...config, allowedExtensions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          )}

          {field.type === 'TEXT_BLOCK' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Inhoud</label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1 min-h-[80px]"
                value={textContent}
                onChange={(e) => setConfig({ ...config, content: e.target.value })}
                placeholder="Tekst die getoond wordt in het formulier..."
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleSave}><Save size={14} /> Opslaan</Button>
            <Button size="sm" variant="ghost" onClick={handleCancel}>Annuleren</Button>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminFormBuilderPage() {
  const params = useParams();
  const router = useRouter();
  const formId = Number(params.id);

  const [form, setForm] = useState<DynamicForm | null>(null);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [confirmationEmail, setConfirmationEmail] = useState(true);
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [saving, setSaving] = useState(false);
  const [addingField, setAddingField] = useState(false);
  const [newFieldType, setNewFieldType] = useState<FieldType>('SHORT_TEXT');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldConfig, setNewFieldConfig] = useState<Record<string, unknown>>({});

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

  const refresh = useCallback(async () => {
    const res = await apiClient.GET('/forms/admin/{id}', { params: { path: { id: String(formId) } } });
    if (res.data) {
      const data = res.data as unknown as DynamicForm;
      setForm(data);
      setTitle(data.title);
      setDescription(data.description || '');
      setRequiresAuth(data.requiresAuth);
      setConfirmationEmail(data.confirmationEmail);
      setDiscordWebhookUrl(data.discordWebhookUrl || '');
    }
  }, [formId]);

  useEffect(() => { refresh(); }, [refresh]);

  const handleSaveMetadata = async () => {
    setSaving(true);
    await apiClient.PATCH('/forms/{id}', {
      params: { path: { id: String(formId) } },
      body: {
        title,
        description: description || undefined,
        requiresAuth,
        confirmationEmail,
        discordWebhookUrl: discordWebhookUrl || undefined,
      },
    });
    setSaving(false);
    refresh();
  };

  const resetNewField = () => {
    setAddingField(false);
    setNewFieldType('SHORT_TEXT');
    setNewFieldLabel('');
    setNewFieldRequired(false);
    setNewFieldConfig({});
  };

  const handleAddField = async () => {
    const label = newFieldLabel.trim() || FIELD_TYPE_LABELS[newFieldType];
    const position = form ? form.fields.length : 0;
    const config = Object.keys(newFieldConfig).length > 0 ? newFieldConfig : undefined;
    await apiClient.POST('/forms/{id}/fields', {
      params: { path: { id: String(formId) } },
      body: {
        type: newFieldType,
        label,
        position,
        required: newFieldRequired,
        config: (config ?? ((newFieldType === 'SELECT' || newFieldType === 'CHECKBOX') ? { options: ['Optie 1'] } : undefined)) as any,
      },
    });
    resetNewField();
    refresh();
  };

  const handleUpdateField = async (fieldId: number, data: Partial<FormField>) => {
    await apiClient.PATCH('/forms/{id}/fields/{fieldId}', {
      params: { path: { id: String(formId), fieldId: String(fieldId) } },
      body: data as any,
    });
    refresh();
  };

  const handleDeleteField = async (fieldId: number) => {
    if (!confirm('Weet je zeker dat je dit veld wilt verwijderen?')) return;
    await apiClient.DELETE('/forms/{id}/fields/{fieldId}', {
      params: { path: { id: String(formId), fieldId: String(fieldId) } },
    });
    refresh();
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    if (!form) return;
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = form.fields.findIndex((f) => f.id === active.id);
    const newIndex = form.fields.findIndex((f) => f.id === over.id);
    const reordered = arrayMove(form.fields, oldIndex, newIndex);

    setForm({ ...form, fields: reordered });

    await apiClient.PATCH('/forms/{id}/fields/reorder', {
      params: { path: { id: String(formId) } },
      body: { items: reordered.map((f, i) => ({ id: f.id, position: i })) },
    });
  };

  if (!form) return <div className="text-gray-500">Laden...</div>;

  return (
    <div>
      <div className="flex items-center gap-3 mb-6">
        <Button size="sm" variant="ghost" onClick={() => router.push('/admin/forms')}>
          <ArrowLeft size={16} />
        </Button>
        <h2 className="text-xl font-bold flex-1">Formulier bewerken</h2>
        <a href={`/forms/${form.cuid}?preview=true`} target="_blank" rel="noopener noreferrer">
          <Button size="sm" variant="ghost"><ExternalLink size={14} /> Voorbeeld</Button>
        </a>
        <Link href={`/admin/forms/${form.id}/submissions`}>
          <Button size="sm" variant="ghost">Inzendingen ({form._count.submissions})</Button>
        </Link>
      </div>

      {/* Metadata */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 mb-6 space-y-4">
        <h3 className="text-sm font-bold text-gray-400 uppercase">Instellingen</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Titel</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">Discord Webhook URL</label>
            <input
              type="text"
              className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
              placeholder="https://discord.com/api/webhooks/..."
              value={discordWebhookUrl}
              onChange={(e) => setDiscordWebhookUrl(e.target.value)}
            />
          </div>
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Beschrijving</label>
          <textarea
            className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1 min-h-[60px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optionele beschrijving van het formulier..."
          />
        </div>
        <div className="flex flex-wrap gap-6">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={requiresAuth} onChange={(e) => setRequiresAuth(e.target.checked)} className="rounded" />
            Inloggen vereist
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={confirmationEmail} onChange={(e) => setConfirmationEmail(e.target.checked)} className="rounded" />
            Bevestigingsmail versturen
          </label>
        </div>
        <Button size="sm" onClick={handleSaveMetadata} disabled={saving}>
          <Save size={14} /> {saving ? 'Opslaan...' : 'Instellingen opslaan'}
        </Button>
      </div>

      {/* Fields */}
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-400 uppercase">Velden ({form.fields.length})</h3>
        <Button size="sm" onClick={() => setAddingField(true)}>
          <Plus size={14} /> Veld toevoegen
        </Button>
      </div>

      {addingField && (
        <div className="bg-slate-900 border border-red-600/30 rounded-lg p-4 mb-4 space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Type</label>
              <select
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                value={newFieldType}
                onChange={(e) => {
                  const type = e.target.value as FieldType;
                  setNewFieldType(type);
                  setNewFieldConfig((type === 'SELECT' || type === 'CHECKBOX') ? { options: ['Optie 1'] } : {});
                }}
              >
                {(Object.keys(FIELD_TYPE_LABELS) as FieldType[]).map((type) => (
                  <option key={type} value={type}>{FIELD_TYPE_LABELS[type]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Label</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                placeholder={FIELD_TYPE_LABELS[newFieldType]}
                value={newFieldLabel}
                onChange={(e) => setNewFieldLabel(e.target.value)}
                autoFocus
              />
            </div>
          </div>

          {newFieldType !== 'TEXT_BLOCK' && (
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={newFieldRequired} onChange={(e) => setNewFieldRequired(e.target.checked)} className="rounded" />
              Verplicht veld
            </label>
          )}

          {(newFieldType === 'SELECT' || newFieldType === 'CHECKBOX') && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Opties</label>
              {((newFieldConfig as { options?: string[] }).options || []).map((opt, i) => (
                <div key={i} className="flex gap-2 mt-1">
                  <input
                    type="text"
                    className="flex-1 bg-slate-800 border border-slate-700 rounded px-3 py-1.5 text-white text-sm"
                    value={opt}
                    onChange={(e) => {
                      const opts = [...((newFieldConfig as { options?: string[] }).options || [])];
                      opts[i] = e.target.value;
                      setNewFieldConfig({ ...newFieldConfig, options: opts });
                    }}
                    placeholder={`Optie ${i + 1}`}
                  />
                  <button onClick={() => {
                    const opts = ((newFieldConfig as { options?: string[] }).options || []).filter((_, idx) => idx !== i);
                    setNewFieldConfig({ ...newFieldConfig, options: opts });
                  }} className="text-red-400 hover:text-red-300 cursor-pointer">
                    <X size={14} />
                  </button>
                </div>
              ))}
              <button
                onClick={() => setNewFieldConfig({ ...newFieldConfig, options: [...((newFieldConfig as { options?: string[] }).options || []), ''] })}
                className="mt-2 text-sm text-red-400 hover:text-red-300 cursor-pointer"
              >
                + Optie toevoegen
              </button>
            </div>
          )}

          {newFieldType === 'FILE_UPLOAD' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Toegestane extensies (komma-gescheiden)</label>
              <input
                type="text"
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1"
                placeholder=".pdf,.jpg,.png,.docx"
                value={((newFieldConfig as { allowedExtensions?: string[] }).allowedExtensions || []).join(',')}
                onChange={(e) => setNewFieldConfig({ ...newFieldConfig, allowedExtensions: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
            </div>
          )}

          {newFieldType === 'TEXT_BLOCK' && (
            <div>
              <label className="text-xs font-bold text-gray-500 uppercase">Inhoud</label>
              <textarea
                className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white text-sm mt-1 min-h-20"
                value={(newFieldConfig as { content?: string }).content || ''}
                onChange={(e) => setNewFieldConfig({ ...newFieldConfig, content: e.target.value })}
                placeholder="Tekst die getoond wordt in het formulier..."
              />
            </div>
          )}

          <div className="flex gap-2">
            <Button size="sm" onClick={handleAddField}>
              <Plus size={14} /> Toevoegen
            </Button>
            <Button size="sm" variant="ghost" onClick={resetNewField}>Annuleren</Button>
          </div>
        </div>
      )}

      {form.fields.length === 0 ? (
        <p className="text-gray-500 text-center py-8">Nog geen velden. Voeg een veld toe om te beginnen.</p>
      ) : (
        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={form.fields.map((f) => f.id)} strategy={verticalListSortingStrategy}>
            {form.fields.map((field) => (
              <SortableField
                key={field.id}
                field={field}
                onUpdate={handleUpdateField}
                onDelete={handleDeleteField}
              />
            ))}
          </SortableContext>
        </DndContext>
      )}
    </div>
  );
}
