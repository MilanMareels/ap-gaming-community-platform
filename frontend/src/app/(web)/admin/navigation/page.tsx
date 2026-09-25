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
import { GripVertical, Plus, Trash2, Pencil, ChevronDown, ChevronRight, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { apiClient } from '@/api';
import type { NavLink } from '@/api';
import { getApiErrorMessage } from '@/util/api-error';

type NavLinkTree = NavLink & { children: NavLink[] };

const VISIBILITY_OPTIONS = [
  { value: 'public', label: 'Publiek' },
  { value: 'authenticated', label: 'Ingelogd' },
  { value: 'admin', label: 'Admin' },
];

const VISIBILITY_VARIANT: Record<string, 'default' | 'info' | 'warning'> = {
  public: 'default',
  authenticated: 'info',
  admin: 'warning',
};

export default function AdminNavigationPage() {
  const [navItems, setNavItems] = useState<NavLinkTree[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedDropdowns, setExpandedDropdowns] = useState<Set<number>>(new Set());

  // Form state for creating/editing
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

  useEffect(() => {
    fetchNavItems();
  }, [fetchNavItems]);

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

    // Optimistic reorder
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
    } catch {
      // Revert on failure
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
            visibility: formData.visibility as 'public' | 'authenticated' | 'admin',
            isCta: formData.isCta,
            openInNewTab: formData.openInNewTab,
          },
        });
      } else {
        const isDropdown = formMode === 'createDropdown';
        const parentId = formMode === 'createChild' ? formParentId : null;

        // Calculate next position
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
            visibility: formData.visibility as 'public' | 'authenticated' | 'admin',
            isCta: formData.isCta,
            openInNewTab: formData.openInNewTab,
          },
        });
      }

      resetForm();
      await fetchNavItems();
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
    return <div className="text-gray-400">Laden...</div>;
  }

  const isFormOpen = formMode !== 'none';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold">Navigatie</h2>
          <p className="text-gray-400 text-sm">Beheer de navigatiebalk van de website.</p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => startCreate('createLink')} disabled={isFormOpen}>
            <Plus size={16} /> Link toevoegen
          </Button>
          <Button variant="secondary" onClick={() => startCreate('createDropdown')} disabled={isFormOpen}>
            <Plus size={16} /> Dropdown toevoegen
          </Button>
        </div>
      </div>

      {error && (
        <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-300">{error}</div>
      )}

      {/* Create form (top-level) */}
      {(formMode === 'createLink' || formMode === 'createDropdown') && formParentId == null && (
        <NavLinkForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={handleSubmit}
          onCancel={resetForm}
          isDropdown={formMode === 'createDropdown'}
          isChild={false}
          submitLabel="Toevoegen"
        />
      )}

      {/* Nav items list */}
      <div className="bg-slate-900 rounded-xl border border-slate-800">
        {navItems.length === 0 && !isFormOpen && (
          <div className="p-8 text-center text-gray-500">Geen navigatie-items. Voeg er een toe.</div>
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
    </div>
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
      <div ref={setNodeRef} style={style} className="p-3 border-b border-slate-800">
        <NavLinkForm
          formData={formData}
          setFormData={setFormData}
          onSubmit={onSubmitEdit}
          onCancel={onCancelEdit}
          isDropdown={isDropdownParent}
          isChild={!!isChild}
          submitLabel="Opslaan"
        />
      </div>
    );
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className="flex items-center gap-3 px-4 py-3 border-b border-slate-800 last:border-b-0 hover:bg-slate-800/30 transition-colors group"
    >
      {/* Drag handle */}
      <button {...attributes} {...listeners} className="cursor-grab text-gray-600 hover:text-gray-400 touch-none">
        <GripVertical size={18} />
      </button>

      {/* Expand toggle for dropdowns */}
      {isDropdownParent && onToggleExpand && (
        <button onClick={onToggleExpand} className="text-gray-500 hover:text-gray-300">
          {isExpanded ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
        </button>
      )}

      {/* Label */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <span className="font-medium text-white truncate">{item.label}</span>
          {item.isCta && (
            <Badge variant="danger">CTA</Badge>
          )}
          {isDropdownParent && hasChildren && (
            <Badge variant="info">Dropdown</Badge>
          )}
          {isDropdownParent && !hasChildren && (
            <Badge variant="warning">Dropdown (leeg)</Badge>
          )}
          {item.openInNewTab && (
            <ExternalLink size={14} className="text-gray-500" />
          )}
        </div>
        {item.href && (
          <span className="text-sm text-gray-500 truncate block">{item.href}</span>
        )}
      </div>

      {/* Visibility */}
      <Badge variant={VISIBILITY_VARIANT[item.visibility] ?? 'default'}>
        {VISIBILITY_OPTIONS.find((v) => v.value === item.visibility)?.label ?? item.visibility}
      </Badge>

      {/* Actions */}
      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button size="sm" variant="ghost" onClick={onEdit}>
          <Pencil size={14} />
        </Button>
        <Button size="sm" variant="danger" onClick={onDelete} disabled={item.isProtected} title={item.isProtected ? 'Beveiligd item kan niet verwijderd worden' : undefined}>
          <Trash2 size={14} />
        </Button>
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
}

function NavLinkForm({ formData, setFormData, onSubmit, onCancel, isDropdown, isChild, submitLabel }: NavLinkFormProps) {
  return (
    <div className="bg-slate-950 rounded-lg border border-slate-700 p-4 space-y-3">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Label</label>
          <input
            type="text"
            placeholder="Bijv. Events"
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
            value={formData.label}
            onChange={(e) => setFormData((prev) => ({ ...prev, label: e.target.value }))}
            autoFocus
          />
        </div>
        {!isDropdown && (
          <div>
            <label className="text-xs font-bold text-gray-500 uppercase">URL</label>
            <input
              type="text"
              placeholder="Bijv. /events"
              className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
              value={formData.href}
              onChange={(e) => setFormData((prev) => ({ ...prev, href: e.target.value }))}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Icoon (optioneel)</label>
          <input
            type="text"
            placeholder="Bijv. Calendar"
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
            value={formData.icon}
            onChange={(e) => setFormData((prev) => ({ ...prev, icon: e.target.value }))}
          />
        </div>
        <div>
          <label className="text-xs font-bold text-gray-500 uppercase">Zichtbaarheid</label>
          <select
            className="w-full bg-slate-900 border border-slate-700 rounded p-2 text-white mt-1"
            value={formData.visibility}
            onChange={(e) => setFormData((prev) => ({ ...prev, visibility: e.target.value }))}
          >
            {VISIBILITY_OPTIONS.map((opt) => (
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
        <Button onClick={onSubmit} disabled={!formData.label.trim()}>
          {submitLabel}
        </Button>
        <Button variant="ghost" onClick={onCancel}>
          Annuleren
        </Button>
      </div>
    </div>
  );
}
