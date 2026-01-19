"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { useLanguage } from '../LanguageProvider';

interface Item {
  id: string;
  name_en: string;
  name_gu: string;
  rate: number;
  has_gst: boolean;
  gst_percentage?: number;
  category: 'Fryums' | 'Namkeen' | 'Others';
}

const CATEGORIES: Array<'Fryums' | 'Namkeen' | 'Others'> = ['Fryums', 'Namkeen', 'Others'];

export default function ItemsClientPage({ initialItems }: { initialItems: Item[] }) {
  const [items, setItems] = useState<Item[]>(initialItems);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { language } = useLanguage();

  // Add Item State
  const [newNameEn, setNewNameEn] = useState("");
  const [newNameGu, setNewNameGu] = useState("");
  const [newRate, setNewRate] = useState("");
  const [newHasGst, setNewHasGst] = useState(false);
  const [newGstPercentage, setNewGstPercentage] = useState("");
  const [newCategory, setNewCategory] = useState<'Fryums' | 'Namkeen' | 'Others'>("Fryums");

  // Inline Editing State
  const [editingRowId, setEditingRowId] = useState<string | null>(null);
  const [tempEditItem, setTempEditItem] = useState<Item | null>(null);

  // Bulk Edit State
  const [bulkEditCategory, setBulkEditCategory] = useState<string | null>(null);
  const [bulkEditRate, setBulkEditRate] = useState("");

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"name-asc" | "name-desc" | "rate-asc" | "rate-desc">("name-asc");

  // Derived state: Processed items (Search & Sort)
  const processedItems = useMemo(() => {
    let result = [...items];

    if (searchTerm) {
      const lowerTerm = searchTerm.toLowerCase();
      result = result.filter(
        (item) =>
          item.name_en.toLowerCase().includes(lowerTerm) ||
          item.name_gu.toLowerCase().includes(lowerTerm)
      );
    }

    result.sort((a, b) => {
      switch (sortOrder) {
        case "name-asc": return a.name_en.localeCompare(b.name_en);
        case "name-desc": return b.name_en.localeCompare(a.name_en);
        case "rate-asc": return a.rate - b.rate;
        case "rate-desc": return b.rate - a.rate;
        default: return 0;
      }
    });

    return result;
  }, [items, searchTerm, sortOrder]);

  // Derived state: Grouped items
  const groupedItems = useMemo(() => {
    return processedItems.reduce((acc, item) => {
      const cat = item.category || 'Others';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, Item[]>);
  }, [processedItems]);

  const fetchItems = async () => {
    // Background fetch to sync
    try {
      const res = await fetch("/api/items");
      if (res.ok) {
        const data = await res.json();
        setItems(Array.isArray(data) ? data : []);
      }
    } catch (err) {
      console.error("Sync error:", err);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNameEn || !newNameGu || !newRate) return;
    setError(null);

    // Optimistic Add
    const tempId = "temp_" + Date.now();
    const optimisticItem: Item = {
      id: tempId,
      name_en: newNameEn,
      name_gu: newNameGu,
      rate: parseFloat(newRate),
      has_gst: newHasGst,
      gst_percentage: newGstPercentage ? parseFloat(newGstPercentage) : undefined,
      category: newCategory,
    };

    setItems(prev => [...prev, optimisticItem]);

    // Clear form immediately
    setNewNameEn("");
    setNewNameGu("");
    setNewRate("");
    setNewHasGst(false);
    setNewGstPercentage("");

    try {
      const res = await fetch("/api/items", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name_en: optimisticItem.name_en,
          name_gu: optimisticItem.name_gu,
          rate: optimisticItem.rate,
          has_gst: optimisticItem.has_gst,
          gst_percentage: optimisticItem.gst_percentage,
          category: optimisticItem.category
        }),
      });

      if (!res.ok) throw new Error("Failed to add item");

      const savedItem = await res.json();
      // Replace temp item with real item
      setItems(prev => prev.map(i => i.id === tempId ? savedItem[0] || savedItem : i));
    } catch (err) {
      setError("Failed to add item to database. Reverting.");
      setItems(prev => prev.filter(i => i.id !== tempId)); // Revert
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    if (!window.confirm("Are you sure you want to delete this item?")) return;

    // Optimistic Delete
    const previousItems = [...items];
    setItems(prev => prev.filter(i => i.id !== itemId));

    try {
      const res = await fetch(`/api/items?id=${itemId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete item');
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      setItems(previousItems); // Revert
    }
  };

  const handleCategoryChange = async (item: Item, newCat: string) => {
    // Optimistic update
    setItems(items.map(i => i.id === item.id ? { ...i, category: newCat as any } : i));

    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...item, category: newCat }),
      });
      if (!res.ok) throw new Error("Failed to update category");
    } catch (err) {
      setError("Failed to update category. Reverting.");
      fetchItems();
    }
  };

  const startEditingRow = (item: Item) => {
    setEditingRowId(item.id);
    setTempEditItem({ ...item });
  };

  const cancelEditingRow = () => {
    setEditingRowId(null);
    setTempEditItem(null);
  };

  const saveRowEdit = async () => {
    if (!tempEditItem) return;

    // Optimistic Update
    setItems(prev => prev.map(i => i.id === tempEditItem.id ? tempEditItem : i));
    setEditingRowId(null);
    setTempEditItem(null);

    try {
      const res = await fetch("/api/items", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(tempEditItem),
      });
      if (!res.ok) throw new Error("Failed to save changes");
    } catch (err) {
      setError("Failed to save changes. Reloading.");
      fetchItems();
    }
  };


  const handleBulkUpdateRate = async (category: string) => {
    if (!bulkEditRate) return;
    if (!window.confirm(`Are you sure you want to set the rate for ALL items in ${category} to ${bulkEditRate}?`)) return;

    setLoading(true);
    // Optimistic Bulk Update
    const newRate = parseFloat(bulkEditRate);
    setItems(prev => prev.map(i => i.category === category ? { ...i, rate: newRate } : i));
    setBulkEditCategory(null);
    setBulkEditRate("");

    try {
      const res = await fetch("/api/items/bulk-update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, rate: newRate }),
      });
      if (!res.ok) throw new Error("Failed to bulk update rates");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unknown error occurred");
      fetchItems(); // Revert
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: 1200, margin: "2rem auto", padding: 16 }}>
      <h1>{language === 'gu' ? 'વસ્તુઓ' : 'Items'}</h1>

      {/* Search and Sort Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          placeholder={language === 'gu' ? 'શોધો...' : 'Search items...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', flex: 1, minWidth: '200px', borderRadius: '6px', border: '1px solid #ddd' }}
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
          <option value="rate-asc">Rate (Low to High)</option>
          <option value="rate-desc">Rate (High to Low)</option>
        </select>
      </div>

      {/* Add Item Form */}
      <form onSubmit={handleAddItem} style={{ marginBottom: 24, padding: '15px', border: '1px solid #e0e0e0', borderRadius: '12px', background: '#ffffff', boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
        <h3 style={{ margin: '0 0 16px 0', color: '#333' }}>{language === 'gu' ? 'નવી વસ્તુ ઉમેરો' : 'Add New Item'}</h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '16px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em', color: '#666' }}>{language === 'gu' ? 'શ્રેણી' : 'Category'}</label>
            <select
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value as any)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            >
              {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em', color: '#666' }}>{language === 'gu' ? 'નામ (અંગ્રેજી)' : 'Name (English)'}</label>
            <input
              value={newNameEn}
              onChange={e => setNewNameEn(e.target.value)}
              placeholder="e.g. Masala Cup"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em', color: '#666' }}>{language === 'gu' ? 'નામ (ગુજરાતી)' : 'Name (Gujarati)'}</label>
            <input
              value={newNameGu}
              onChange={e => setNewNameGu(e.target.value)}
              placeholder="દા.ત. મસાલા કપ"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '4px', fontSize: '0.9em', color: '#666' }}>{language === 'gu' ? 'ભાવ' : 'Rate'}</label>
            <input
              value={newRate}
              onChange={e => setNewRate(e.target.value)}
              placeholder="0.00"
              type="number"
              required
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #ddd' }}
            />
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer', marginRight: '16px' }}>
            <input
              type="checkbox"
              checked={newHasGst}
              onChange={e => setNewHasGst(e.target.checked)}
              style={{ width: '18px', height: '18px', marginRight: '8px' }}
            />
            {language === 'gu' ? ' જી.એસ.ટી છે' : ' Has GST'}
          </label>
          {newHasGst && (
            <input
              value={newGstPercentage}
              onChange={e => setNewGstPercentage(e.target.value)}
              placeholder="%"
              type="number"
              style={{ width: '60px', padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
            />
          )}
        </div>

        <button type="submit" disabled={loading} style={{ padding: '10px 24px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
          {loading ? (language === 'gu' ? 'ઉમેરી રહ્યું છે...' : 'Adding...') : (language === 'gu' ? 'ઉમેરો' : 'Add Item')}
        </button>
      </form>

      {error && <div style={{ padding: '12px', background: '#fee2e2', color: '#dc2626', borderRadius: '8px', marginBottom: '24px' }}>{error}</div>}

      {/* Grouped Tables */}
      {items.length === 0 && loading ? (
        <p>{language === 'gu' ? 'લોડ થઈ રહ્યું છે...' : 'Loading...'}</p>
      ) : (
        <div>
          {CATEGORIES.map(cat => (
            <div key={cat} style={{ marginBottom: '40px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '2px solid #f0f0f0', paddingBottom: '12px', marginBottom: '16px' }}>
                <h2 style={{ margin: 0, color: '#444' }}>{cat}</h2>

                {/* Bulk Update Controls */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {bulkEditCategory === cat ? (
                    <>
                      <input
                        type="number"
                        placeholder="New Rate"
                        value={bulkEditRate}
                        onChange={e => setBulkEditRate(e.target.value)}
                        style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', width: '80px' }}
                      />
                      <button
                        onClick={() => handleBulkUpdateRate(cat)}
                        style={{ padding: '6px 12px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Save
                      </button>
                      <button
                        onClick={() => { setBulkEditCategory(null); setBulkEditRate(""); }}
                        style={{ padding: '6px 12px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => { setBulkEditCategory(cat); setBulkEditRate(""); }}
                      style={{ padding: '6px 12px', background: '#e5e7eb', color: '#374151', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}
                    >
                      {language === 'gu' ? 'ભાવ બદલો (બધા)' : 'Bulk Edit Rate'}
                    </button>
                  )}
                </div>
              </div>

              {groupedItems[cat] && groupedItems[cat].length > 0 ? (
                <div style={{ overflowX: 'auto', border: '1px solid #eee', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '600px' }}>
                    <thead>
                      <tr style={{ background: '#f8f9fa', color: '#666', fontSize: '0.9em', textAlign: 'left' }}>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', width: '50px' }}>#</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Name</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Rate</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>GST</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee' }}>Category</th>
                        <th style={{ padding: '12px 16px', borderBottom: '1px solid #eee', width: '100px' }}>Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {groupedItems[cat].map((item, index) => {
                        const isEditing = editingRowId === item.id;
                        return (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f0f0f0', fontSize: '0.95em', background: isEditing ? '#fffbeb' : 'transparent' }}>
                            <td style={{ padding: '12px 16px', color: '#888' }}>{index + 1}</td>

                            {/* Name Column */}
                            <td style={{ padding: '12px 16px' }}>
                              {isEditing && tempEditItem ? (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                                  <input
                                    value={tempEditItem.name_en}
                                    onChange={(e) => setTempEditItem({ ...tempEditItem, name_en: e.target.value })}
                                    style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                                  />
                                  <input
                                    value={tempEditItem.name_gu}
                                    onChange={(e) => setTempEditItem({ ...tempEditItem, name_gu: e.target.value })}
                                    style={{ padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                                  />
                                </div>
                              ) : (
                                <>
                                  <div style={{ fontWeight: 500 }}>{item.name_en}</div>
                                  <div style={{ color: '#888', fontSize: '0.9em' }}>{item.name_gu}</div>
                                </>
                              )}
                            </td>

                            {/* Rate Column */}
                            <td style={{ padding: '12px 16px' }}>
                              {isEditing && tempEditItem ? (
                                <input
                                  type="number"
                                  value={tempEditItem.rate}
                                  onChange={(e) => setTempEditItem({ ...tempEditItem, rate: parseFloat(e.target.value) })}
                                  style={{ width: '80px', padding: '4px', border: '1px solid #ccc', borderRadius: '4px' }}
                                />
                              ) : (
                                <span style={{ fontWeight: 600 }}>₹{item.rate}</span>
                              )}
                            </td>

                            {/* GST Column */}
                            <td style={{ padding: '12px 16px' }}>
                              {isEditing && tempEditItem ? (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <input
                                    type="checkbox"
                                    checked={tempEditItem.has_gst}
                                    onChange={e => setTempEditItem({ ...tempEditItem, has_gst: e.target.checked })}
                                  />
                                  {tempEditItem.has_gst && (
                                    <input
                                      type="number"
                                      value={tempEditItem.gst_percentage || ''}
                                      onChange={e => setTempEditItem({ ...tempEditItem, gst_percentage: parseFloat(e.target.value) })}
                                      style={{ width: '50px', padding: '2px', border: '1px solid #ccc' }}
                                    />
                                  )}
                                </div>
                              ) : (
                                item.has_gst ? `${item.gst_percentage}%` : '-'
                              )}
                            </td>

                            {/* Category Column */}
                            <td style={{ padding: '12px 16px' }}>
                              <select
                                value={isEditing && tempEditItem ? tempEditItem.category : (item.category || 'Others')}
                                onChange={(e) => {
                                  const val = e.target.value as any;
                                  if (isEditing && tempEditItem) {
                                    setTempEditItem({ ...tempEditItem, category: val });
                                  } else {
                                    handleCategoryChange(item, val);
                                  }
                                }}
                                style={{ padding: '6px', borderRadius: '4px', border: '1px solid #ddd', background: '#fff', fontSize: '0.9em' }}
                              >
                                {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                              </select>
                            </td>

                            {/* Actions Column */}
                            <td style={{ padding: '12px 16px' }}>
                              {isEditing ? (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={saveRowEdit}
                                    style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Save"
                                  >
                                    ✓
                                  </button>
                                  <button
                                    onClick={cancelEditingRow}
                                    style={{ background: '#ef4444', color: 'white', border: 'none', padding: '6px 10px', borderRadius: '4px', cursor: 'pointer' }}
                                    title="Cancel"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => startEditingRow(item)}
                                    style={{ color: '#0070f3', background: 'transparent', border: '1px solid #0070f3', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={() => handleDeleteItem(item.id)}
                                    style={{ color: '#ef4444', background: 'transparent', border: '1px solid #ef4444', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '0.9em' }}
                                  >
                                    Del
                                  </button>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p style={{ color: '#999', fontStyle: 'italic', padding: '16px', background: '#f9f9f9', borderRadius: '8px' }}>No items in this category.</p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}