'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from '@dnd-kit/core';
import {
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Plus, Trash2, Pencil, ChevronDown, ChevronRight, ExternalLink, Navigation } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { PageHeader } from '@/components/admin/PageHeader';
import { EmptyState } from '@/components/admin/EmptyState';
import { apiClient } from '@/api';
import type { NavLink } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';
import { revalidateNavigation } from './actions';

type NavLinkTree = NavLink & { children: NavLink[] };

const BASE_VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publiek' },
  { value: 'authenticated', label: 'Ingelogd' },
  { value: 'admin', label: 'Admin' },
];

const VISIBILITY_VARIANT: Record<string, 'default' | 'info' | 'warning'> = {
  public: 'default',
  authenticated: 'info',
  admin: 'warning',
};

const inputClass = 'w-full bg-slate-950 border border-slate-700 rounded-lg py-2.5 px-3 text-sm text-white placeholder:text-gray-500 outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500/20 transition-colors';
const labelClass = 'block text-[11px] font-semibold uppercase tracking-wide text-gray-500 mb-1.5';

function getVisibilityLabel(visibility: string, roleOptions: { value: string; label: string }[]) {
  const opt = [...BASE_VISIBILITY_OPTIONS, ...roleOptions].find((v) => v.value === visibility);
  return opt?.label ?? visibility;
}

function getVisibilityVariant(visibility: string): 'default' | 'info' | 'warning' {
  if (visibility.startsWith('role:')) return 'info';
  return VISIBILITY_VARIANT[visibility] ?? 'default';
}

export default function AdminNavigationPage() {
  const [navItems, setNavItems] = useState<NavLinkTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedDropdowns, setExpandedDropdowns] = useState<Set<number>>(new Set());
  const [roleVisibilityOptions, setRoleVisibilityOptions] = useState<{ value: string; label: string }[]>([]);

  const [formMode, setFormMode] = useState<'none' | 'createLink' | 'createDropdown' | 'createChild' | 'edit'>('none');
  const [formParentId, setFormParentId] = useState<number | null>(null);
  const [formData, setFormData] = useState({
    label: '',
    href: '',
    icon: '',
    visibility: 'public',
    isCta: false,
    openInNewTab: false,
  });

  const fetchNavItems = useCallback(async () => {
    try {
      const res = await apiClient.GET('/navigation', {});
      if (res.data) setNavItems(res.data as NavLinkTree[]);
    } catch (err) {
      setError('Kon navigatie niet laden');
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchRoles = useCallback(async () => {
    try {
      const res = await apiClient.GET('/rbac/roles');
      if (res.data) {
        setRoleVisibilityOptions(
          (res.data as { name: string }[]).map((r) => ({
            value: `role:${r.name}`,
            label: `Rol: ${r.name}`,
          })),
        );
      }
    } catch {
      // Non-critical
    }
  }, []);

  useEffect(() => {
    fetchNavItems();
    fetchRoles();
  }, [fetchNavItems, fetchRoles]);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const handleDragEnd = async (event: DragEndEvent, parentId: number | null = null) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const items = parentId == null
      ? navItems
      : navItems.find((n) => n.id === parentId)?.children ?? [];

    const oldIndex = items.findIndex((i) => i.id === active.id);
    const newIndex = items.findIndex((i) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1) return;

    const reordered = [...items];
    const [moved] = reordered.splice(oldIndex, 1);
    reordered.splice(newIndex, 0, moved);

    const reorderPayload = reordered.map((item, idx) => ({ id: item.id, position: idx }));

    if (parentId == null) {
      setNavItems(reordered as NavLinkTree[]);
    } else {
      setNavItems((prev) =>
        prev.map((n) => (n.id === parentId ? { ...n, children: reordered } : n)),
      );
    }

    try {
      await apiClient.PATCH('/navigation/reorder', {
        body: { items: reorderPayload },
      });
      await revalidateNavigation();
    } catch {
      await fetchNavItems();
    }
  };

  const resetForm = () => {
    setFormMode('none');
    setFormParentId(null);
    setEditingId(null);
    setFormData({ label: '', href: '', icon: '', visibility: 'public', isCta: false, openInNewTab: false });
  };

  const startCreate = (mode: 'createLink' | 'createDropdown', parentId: number | null = null) => {
    resetForm();
    setFormMode(mode === 'createLink' && parentId != null ? 'createChild' : mode);
    setFormParentId(parentId);
    if (parentId != null) {
      setExpandedDropdowns((prev) => new Set(prev).add(parentId));
    }
  };

  const startEdit = (item: NavLink) => {
    setFormMode('edit');
    setEditingId(item.id);
    setFormParentId(item.parentId ?? null);
    setFormData({
      label: item.label,
      href: item.href ?? '',
      icon: item.icon ?? '',
      visibility: item.visibility,
      isCta: item.isCta,
      openInNewTab: item.openInNewTab,
    });
  };

  const handleSubmit = async () => {
    setError('');
    try {
      if (formMode === 'edit' && editingId != null) {
        await apiClient.PATCH('/navigation/{id}', {
          params: { path: { id: editingId.toString() } },
          body: {
            label: formData.label,
            href: formData.href || undefined,
            icon: formData.icon || undefined,
            visibility: formData.visibility,
            isCta: formData.isCta,
            openInNewTab: formData.openInNewTab,
          },
        });
      } else {
        const isDropdown = formMode === 'createDropdown';
        const parentId = formMode === 'createChild' ? formParentId : null;

        const siblings = parentId == null
          ? navItems
          : navItems.find((n) => n.id === parentId)?.children ?? [];
        const nextPosition = siblings.length;

        await apiClient.POST('/navigation', {
          body: {
            label: formData.label,
            href: isDropdown ? undefined : formData.href || undefined,
            icon: formData.icon || undefined,
            parentId: parentId ?? undefined,
            position: nextPosition,
            visibility: formData.visibility,
            isCta: formData.isCta,
            openInNewTab: formData.openInNewTab,
          },
        });
      }

      resetForm();
      await fetchNavItems();
      await revalidateNavigation();
    } catch (err) {
      setError(getApiErrorMessage(err as { message?: string | string[] }, 'Opslaan mislukt'));
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Weet je zeker dat je dit item wilt verwijderen?')) return;
    try {
      await apiClient.DELETE('/navigation/{id}', {
        params: { path: { id: id.toString() } },
      });
      resetForm();
      await fetchNavItems();
      await revalidateNavigation();
    } catch (err) {
      setError(getApiErrorMessage(err as { message?: string | string[] }, 'Verwijderen mislukt'));
    }
  };

  const toggleExpand = (id: number) => {
    setExpandedDropdowns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  if (loading) {
    return (
      <>
        <PageHeader title="Navigatie" description="Beheer de navigatiebalk van de website." />
        <div className="text-gray-400 text-center py-12">Laden...</div>
      </>
    );
  }

  const isFormOpen = formMode !== 'none';

  return (
    <>
      <PageHeader
        title="Navigatie"
        description="Beheer de navigatiebalk van de website."
        actions={
          <div className="flex gap-2">
            <Button size="sm" variant="primary" onClick={() => startCreate('createLink')} disabled={isFormOpen}>
              <Plus size={16} /> Link toevoegen
            </Button>
            <Button size="sm" variant="secondary" onClick={() => startCreate('createDropdown')} disabled={isFormOpen}>
              <Plus size={16} /> Dropdown
            </Button>
          </div>
        }
      />

      {error && (
        <div className="mb-6 rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Create form (top-level) */}
      {(formMode === 'createLink' || formMode === 'createDropdown') && formParentId == null && (
        <div className="mb-6">
          <NavLinkForm
            formData={formData}
            setFormData={setFormData}
            onSubmit={handleSubmit}
            onCancel={resetForm}
            isDropdown={formMode === 'createDropdown'}
            isChild={false}
            submitLabel="Toevoegen"
            roleVisibilityOptions={roleVisibilityOptions}
          />
        </div>
      )}

      {/* Nav items list */}
      <div className="bg-linear-to-br from-slate-900 via-slate-900 to-slate-900/90 rounded-xl border border-slate-800 overflow-hidden">
        {navItems.length === 0 && !isFormOpen && (
          <EmptyState icon={Navigation} title="Geen navigatie-items" description="Voeg een link of dropdown toe om te beginnen." />
        )}

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={(e) => handleDragEnd(e, null)}>
          <SortableContext items={navItems.map((i) => i.id)} strategy={verticalListSortingStrategy}>
            {navItems.map((item) => (
              <div key={item.id}>
                <SortableNavItem
                  item={item}
                  isEditing={editingId === item.id}
                  formData={formData}
                  setFormData={setFormData}
                  onEdit={() => startEdit(item)}
                  onDelete={() => handleDelete(item.id)}
                  onSubmitEdit={handleSubmit}
                  onCancelEdit={resetForm}
                  hasChildren={item.children && item.children.length > 0}
                  isExpanded={expandedDropdowns.has(item.id)}
                  onToggleExpand={() => toggleExpand(item.id)}
                  roleVisibilityOptions={roleVisibilityOptions}
                />

                {/* Children (dropdown items) */}
                {item.children && item.children.length > 0 && expandedDropdowns.has(item.id) && (
                  <div className="ml-8 border-l-2 border-slate-700">
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      onDragEnd={(e) => handleDragEnd(e, item.id)}
                    >
                      <SortableContext items={item.children.map((c) => c.id)} strategy={verticalListSortingStrategy}>
                        {item.children.map((child) => (
                          <SortableNavItem
                            key={child.id}
                            item={child}
                            isChild
                            isEditing={editingId === child.id}
                            formData={formData}
                            setFormData={setFormData}
                            onEdit={() => startEdit(child)}
                            onDelete={() => handleDelete(child.id)}
                            onSubmitEdit={handleSubmit}
                            onCancelEdit={resetForm}
                            roleVisibilityOptions={roleVisibilityOptions}
                          />
                        ))}
                      </SortableContext>
                    </DndContext>

                    {/* Add child form */}
                    {formMode === 'createChild' && formParentId === item.id && (
                      <div className="p-3">
                        <NavLinkForm
                          formData={formData}
                          setFormData={setFormData}
                          onSubmit={handleSubmit}
                          onCancel={resetForm}
                          isDropdown={false}
                          isChild
                          submitLabel="Toevoegen"
                          roleVisibilityOptions={roleVisibilityOptions}
                        />
                      </div>
                    )}

                    {/* Add child button */}
                    {formMode !== 'createChild' || formParentId !== item.id ? (
                      <button
                        onClick={() => startCreate('createLink', item.id)}
                        disabled={isFormOpen}
                        className="w-full p-2 text-sm text-gray-500 hover:text-gray-300 hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Plus size={14} /> Sub-link toevoegen
                      </button>
                    ) : null}
                  </div>
                )}

                {/* Expand area for dropdowns with no children yet */}
                {item.children && item.children.length === 0 && !item.href && (
                  <div className="ml-8 border-l-2 border-slate-700">
                    {formMode === 'createChild' && formParentId === item.id ? (
                      <div className="p-3">
                        <NavLinkForm
                          formData={formData}
                          setFormData={setFormData}
                          onSubmit={handleSubmit}
                          onCancel={resetForm}
                          isDropdown={false}
                          isChild
                          submitLabel="Toevoegen"
                          roleVisibilityOptions={roleVisibilityOptions}
                        />
                      </div>
                    ) : (
                      <button
                        onClick={() => startCreate('createLink', item.id)}
                        disabled={isFormOpen}
                        className="w-full p-3 text-sm text-gray-500 hover:text-gray-300 hover:bg-slate-800/50 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
                      >
                        <Plus size={14} /> Sub-link toevoegen
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </SortableContext>
        </DndContext>
      </div>
    </>
  );
}

// ---------- Sortable Nav Item ----------

interface SortableNavItemProps {
  item: NavLink;
  isChild?: boolean;
  isEditing: boolean;
  formData: { label: string; href: string; icon: string; visibility: string; isCta: boolean; openInNewTab: boolean };
  setFormData: React.Dispatch<React.SetStateAction<SortableNavItemProps['formData']>>;
  onEdit: () => void;
  onDelete: () => void;
  onSubmitEdit: () => void;
  onCancelEdit: () => void;
  hasChildren?: boolean;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  roleVisibilityOptions?: { value: string; label: string }[];
}

function SortableNavItem({
  item,
  isChild,
  isEditing,
  formData,
  setFormData,
  onEdit,
  onDelete,
  onSubmitEdit,
  onCancelEdit,
  hasChildren,
  isExpanded,
  onToggleExpand,
  roleVisibilityOptions,
}: SortableNavItemProps) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const isDropdownParent = !item.href && !item.isCta;

  if (isEditing) {
    return (
      <div ref={setNodeRef} style={style} className="p-3 border-b border-slate-800/60">
        <NavLinkForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={onSubmitEdit}
          onCancel={onCancelEdit}
          isDropdown={isDropdownParent}
          isChild={!!isChild}
          submitLabel="Opslaan"
          roleVisibilityOptions={roleVisibilityOptions}
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 border-b border-slate-800/60 last:border-b-0 hover:bg-slate-800/30 transition-colors group"
    >
      {/* Drag handle */}
      <button {...attributes} {...listeners} className="cursor-grab text-gray-600 hover:text-gray-400 touch-none">
        <GripVertical size={18} />
      </button>

      {/* Expand toggle for dropdowns */}
      {isDropdownParent && onToggleExpand && (
        <button onClick={onToggleExpand} className="text-gray-500 hover:text-gray-300 transition-colors">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      )}

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{item.label}</span>
          {item.isCta && <Badge variant="danger">CTA</Badge>}
          {isDropdownParent && hasChildren && <Badge variant="info">Dropdown</Badge>}
          {isDropdownParent && !hasChildren && <Badge variant="warning">Dropdown (leeg)</Badge>}
          {item.openInNewTab && <ExternalLink size={14} className="text-gray-500" />}
        </div>
        {item.href && (
          <span className="text-xs text-gray-500 truncate block">{item.href}</span>
        )}
      </div>

      {/* Visibility */}
      <Badge variant={getVisibilityVariant(item.visibility)}>
        {getVisibilityLabel(item.visibility, roleVisibilityOptions ?? [])}
      </Badge>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <button
          onClick={onEdit}
          className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <Pencil size={14} />
        </button>
        <button
          onClick={onDelete}
          disabled={item.isProtected}
          title={item.isProtected ? 'Beveiligd item kan niet verwijderd worden' : undefined}
          className="p-2 rounded-lg text-gray-400 hover:text-red-400 hover:bg-red-900/20 transition-colors disabled:opacity-30"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

// ---------- Nav Link Form ----------

interface NavLinkFormProps {
  formData: { label: string; href: string; icon: string; visibility: string; isCta: boolean; openInNewTab: boolean };
  setFormData: React.Dispatch<React.SetStateAction<NavLinkFormProps['formData']>>;
  onSubmit: () => void;
  onCancel: () => void;
  isDropdown: boolean;
  isChild: boolean;
  submitLabel: string;
  roleVisibilityOptions?: { value: string; label: string }[];
}

function NavLinkForm({ formData, setFormData, onSubmit, onCancel, isDropdown, isChild, submitLabel, roleVisibilityOptions = [] }: NavLinkFormProps) {
  const visibilityOptions = [...BASE_VISIBILITY_OPTIONS, ...roleVisibilityOptions];
  return (
    <div className="bg-slate-950/60 rounded-lg border border-slate-800/60 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className={labelClass}>Label</label>
          <input
            type="text"
            placeholder="Bijv. Events"
            className={inputClass}
            value={formData.label}
            onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
            autoFocus
          />
        </div>
        {!isDropdown && (
          <div>
            <label className={labelClass}>URL</label>
            <input
              type="text"
              placeholder="Bijv. /events"
              className={inputClass}
              value={formData.href}
              onChange={(e) => setFormData((prev) => ({ ...prev, href: e.target.value }))}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className={labelClass}>Icoon (optioneel)</label>
          <input
            type="text"
            placeholder="Bijv. Calendar"
            className={inputClass}
            value={formData.icon}
            onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
          />
        </div>
        <div>
          <label className={labelClass}>Zichtbaarheid</label>
          <select
            className={inputClass}
            value={formData.visibility}
            onChange={(e) => setFormData((prev) => ({ ...prev, visibility: e.target.value }))}
          >
            {visibilityOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-4 pb-1">
          {!isChild && !isDropdown && (
            <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
              <input
                type="checkbox"
                checked={formData.isCta}
                onChange={(e) => setFormData((prev) => ({ ...prev, isCta: e.target.checked }))}
                className="accent-red-600"
              />
              CTA Button
            </label>
          )}
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={formData.openInNewTab}
              onChange={(e) => setFormData((prev) => ({ ...prev, openInNewTab: e.target.checked }))}
              className="accent-red-600"
            />
            Nieuw tabblad
          </label>
        </div>
      </div>

      <div className="flex gap-2 pt-1">
        <Button size="sm" variant="primary" onClick={onSubmit} disabled={!formData.label.trim()}>
          {submitLabel}
        </Button>
        <Button size="sm" variant="secondary" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </div>
  );
}
