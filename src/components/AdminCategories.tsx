import React, { useState } from 'react';
import { Plus, Edit2, Trash2, Check, AlertCircle, RefreshCw, Bookmark, Sliders } from 'lucide-react';
import { Category } from '../types.ts';

interface AdminCategoriesProps {
  categories: Category[];
  onCategoriesUpdated: (updatedCategories: Category[]) => void;
}

export default function AdminCategories({ categories, onCategoriesUpdated }: AdminCategoriesProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("Sparkles");
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [catToDelete, setCatToDelete] = useState<{ id: string; name: string } | null>(null);

  const resetForm = () => {
    setName("");
    setIcon("Sparkles");
    setEditId(null);
    setIsEditing(false);
  };

  const handleEdit = (cat: Category) => {
    setEditId(cat.id);
    setName(cat.name);
    setIcon(cat.icon || "Sparkles");
    setIsEditing(true);
  };

  const saveCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    try {
      setLoading(true);
      setErrorMsg("");
      setSuccessMsg("");

      const payload = {
        name,
        icon,
        slug: name.toLowerCase().replace(/\s+/g, "-")
      };

      let url = "/api/categories";
      let method = "POST";

      if (editId) {
        url = `/api/categories/${editId}`;
        method = "PUT";
      }

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        // Fetch fresh categories
        const refetchedRes = await fetch("/api/categories");
        if (refetchedRes.ok) {
          const freshData = await refetchedRes.json();
          onCategoriesUpdated(freshData);
        }
        setSuccessMsg(editId ? `Category "${name}" successfully updated.` : `Category "${name}" successfully added to stream indices.`);
        resetForm();
      } else {
        const errorData = await res.json();
        setErrorMsg(errorData.error || "Failed to save category coordinates.");
      }
    } catch (e) {
      setErrorMsg("Failed communicating with system category database API.");
    } finally {
      setLoading(false);
    }
  };

  const deleteCategory = (id: string, catName: string) => {
    setCatToDelete({ id, name: catName });
  };

  const confirmDeleteCategory = async () => {
    if (!catToDelete) return;
    const { id, name: catName } = catToDelete;

    try {
      setLoading(true);
      const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
      if (res.ok) {
        const refetchedRes = await fetch("/api/categories");
        if (refetchedRes.ok) {
          const freshData = await refetchedRes.json();
          onCategoriesUpdated(freshData);
        }
        setSuccessMsg(`Category "${catName}" discarded successfully.`);
        setCatToDelete(null);
      } else {
        setErrorMsg("Failed to delete category mapping.");
      }
    } catch (e) {
      setErrorMsg("Failed database call to discard records.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-6" id="admin-category-panel">
      
      {/* Category header */}
      <div className="flex items-center justify-between border-b border-slate-800 pb-4">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-100">Live Channels Category Manager</h2>
          <p className="text-xs text-slate-400">Classify live feeds by content types and genre clusters</p>
        </div>
        {!isEditing && (
          <button
            onClick={() => { resetForm(); setIsEditing(true); }}
            className="flex items-center gap-1.5 px-4 py-2.5 bg-red-600 hover:bg-red-500 rounded-xl font-bold text-xs text-white transition active:scale-95 shadow-md cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Add Genre Class
          </button>
        )}
      </div>

      {successMsg && (
        <div className="flex items-center gap-2 p-3 bg-green-950/40 border border-green-800/60 rounded-xl text-green-400 text-xs">
          <Check className="w-4 h-4" />
          <span>{successMsg}</span>
        </div>
      )}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3 bg-red-950/40 border border-red-800/60 rounded-xl text-red-400 text-xs">
          <AlertCircle className="w-4 h-4" />
          <span>{errorMsg}</span>
        </div>
      )}

      {isEditing && (
        <form onSubmit={saveCategory} className="glassmorphism p-5 rounded-2xl border border-red-500/15 flex flex-col gap-4 max-w-xl">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2 mb-1">
            <h3 className="font-display font-semibold text-sm text-red-400 flex items-center gap-2">
              <Bookmark className="w-4 h-4" />
              {editId ? "Update Category Classification" : "Create New Content Category"}
            </h3>
            <button 
              type="button" 
              onClick={resetForm} 
              className="text-xs text-slate-400 hover:text-white px-2 py-0.5 rounded cursor-pointer"
            >
              Cancel
            </button>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Category Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Sports, Cinema, news, UHD Events"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label className="text-xs font-semibold text-slate-300">Layout Icon Identifier</label>
              <select
                value={icon}
                onChange={(e) => setIcon(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-100 focus:outline-none focus:border-red-500 transition cursor-pointer"
              >
                <option value="Trophy">Trophy (Sports)</option>
                <option value="Film">Film Reel (Cinema)</option>
                <option value="Globe">Globe Icon (News & Info)</option>
                <option value="Sparkles">Sparkles badge (Promoted/Entertainment)</option>
                <option value="Tv">TV Icon (General/Default)</option>
              </select>
            </div>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-800/80 pt-3 mt-1">
            <button
              type="button"
              disabled={loading}
              onClick={resetForm}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-850 rounded-lg text-xs font-semibold transition"
            >
              Discard
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-1.5 bg-red-600 hover:bg-red-500 text-xs font-bold rounded-lg text-white transition shadow active:scale-95"
            >
              {loading ? <RefreshCw className="w-3 animate-spin" /> : "Save Class"}
            </button>
          </div>
        </form>
      )}

      {/* Categories Grid Table */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {categories.map(cat => {
          return (
            <div 
              key={cat.id} 
              className="glassmorphism p-4 rounded-xl border border-white/5 hover:border-slate-700/60 transition group flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className="bg-slate-950 p-2.5 border border-slate-800 rounded-lg text-red-400 group-hover:scale-105 transition-transform">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-sm text-slate-100 group-hover:text-red-400 transition">{cat.name}</h4>
                  <p className="text-[10px] font-mono text-slate-500">Slug: {cat.slug}</p>
                </div>
              </div>

              {/* Action operations on category */}
              <div className="flex items-center gap-1.5 opacity-80 hover:opacity-100 transition">
                <button
                  type="button"
                  onClick={() => handleEdit(cat)}
                  className="bg-slate-950 hover:bg-slate-850 p-1.5 rounded text-slate-300 border border-slate-800 transition cursor-pointer"
                  title="Edit Category"
                >
                  <Edit2 className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  onClick={() => deleteCategory(cat.id, cat.name)}
                  className="bg-slate-950 hover:bg-red-950/30 p-1.5 rounded text-red-400 border border-slate-800 hover:border-red-800/20 transition cursor-pointer"
                  title="Discard Category"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* State-driven confirm delete category modal overlay */}
      {catToDelete && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in" id="confirm-delete-cat-modal">
          <div className="max-w-md w-full bg-slate-900 border border-red-500/30 p-6 rounded-2xl flex flex-col items-center text-center shadow-2xl relative">
            <div className="w-14 h-14 bg-red-650/10 border border-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-4 animate-pulse">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="font-display font-bold text-lg text-white mb-2">Delete Genre Category?</h3>
            <p className="text-sm text-slate-350 leading-relaxed mb-6">
              Are you absolutely sure you want to discard the Category <span className="text-red-400 font-semibold">"{catToDelete.name}"</span>? Channels assigned to this category may default to Entertainment.
            </p>
            <div className="flex gap-3 w-full justify-center">
              <button
                type="button"
                onClick={() => setCatToDelete(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold rounded-xl text-xs transition duration-200 cursor-pointer w-28"
              >
                No, Keep
              </button>
              <button
                type="button"
                onClick={confirmDeleteCategory}
                disabled={loading}
                className="px-4 py-2 bg-red-600 hover:bg-red-500 text-white font-bold rounded-xl text-xs transition duration-200 shadow active:scale-95 cursor-pointer w-28"
              >
                {loading ? <RefreshCw className="w-3 animate-spin mx-auto" /> : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
