"use client";
import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useLanguage } from '../LanguageProvider';

// Types
interface Item {
  id: string;
  name_en: string;
  name_gu: string;
  rate: number;
  gst_percentage?: number;
  category: string;
}
interface Vendor {
  id: string;
  name: string;
  route_id: string;
}
interface BillItem {
  item_id: string;
  quantity: number;
}
interface BillItemDetails extends BillItem {
  name: string;
  rate: number;
  gst_percentage?: number;
  category: string;
}
interface Route {
  id: string;
  name: string;
}

const CATEGORIES = ['Fryums', 'Namkeen', 'Others'];

export default function BillingPage() {
  const router = useRouter();
  const { language } = useLanguage();
  // Data from API
  const [items, setItems] = useState<Item[]>([]);
  const [vendors, setVendors] = useState<Vendor[]>([]);
  const [routes, setRoutes] = useState<Route[]>([]);

  // Form state
  const [selectedRouteId, setSelectedRouteId] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [currentBillItems, setCurrentBillItems] = useState<BillItemDetails[]>([]);

  // Search & Sort State
  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"name-asc" | "name-desc" | "rate-asc" | "rate-desc">("name-asc");
  const [qtyMap, setQtyMap] = useState<Record<string, number>>({});

  // Temp state for adding a new item to the bill (legacy, kept if needed but mostly replaced)
  const [selectedItemId, setSelectedItemId] = useState("");
  const [quantity, setQuantity] = useState(1);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [triedSubmit, setTriedSubmit] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  const processedItems = useMemo(() => {
    let result = [...items];
    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(i =>
        i.name_en.toLowerCase().includes(lower) ||
        i.name_gu.toLowerCase().includes(lower)
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

  const groupedItems = useMemo(() => {
    return processedItems.reduce((acc, item) => {
      const cat = item.category || 'Others';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(item);
      return acc;
    }, {} as Record<string, Item[]>);
  }, [processedItems]);

  const handleAddItemDirectly = (item: Item) => {
    const qty = qtyMap[item.id] || 1;
    if (qty <= 0) return;

    setCurrentBillItems(prev => {
      // Check if item already exists, if so update qty
      const existingIndex = prev.findIndex(i => i.item_id === item.id);
      if (existingIndex >= 0) {
        const newItems = [...prev];
        newItems[existingIndex].quantity += qty;
        return newItems;
      }
      return [
        ...prev,
        {
          item_id: item.id,
          name: item.name_en,
          rate: item.rate,
          quantity: qty,
          gst_percentage: item.gst_percentage,
          category: item.category || 'Others'
        }
      ];
    });
    // Reset qty for that item
    setQtyMap(prev => ({ ...prev, [item.id]: 1 }));
  };

  useEffect(() => {
    async function fetchData() {
      setInitialLoading(true);
      setError(null);
      try {
        const [vendorsRes, itemsRes, routesRes] = await Promise.all([
          fetch("/api/vendors"),
          fetch("/api/items"),
          fetch("/api/routes"),
        ]);

        if (!vendorsRes.ok || !itemsRes.ok || !routesRes.ok) {
          throw new Error("Failed to fetch initial data");
        }

        const vendorsData = await vendorsRes.json();
        const itemsData = await itemsRes.json();
        const routesData = await routesRes.json();

        setVendors(Array.isArray(vendorsData) ? vendorsData : []);
        setItems(Array.isArray(itemsData) ? itemsData : []);
        setRoutes(Array.isArray(routesData) ? routesData : []);
      } catch (err) {
        setError(err instanceof Error ? err.message : "An unknown error occurred");
      } finally {
        setInitialLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleAddItemToBill = () => {
    if (!selectedItemId || quantity <= 0) {
      setError("Please select an item and enter a valid quantity.");
      return;
    }
    const item = items.find(i => i.id === selectedItemId);
    if (!item) return;

    setCurrentBillItems(prev => [
      ...prev,
      {
        item_id: item.id,
        name: item.name_en,
        rate: item.rate,
        quantity,
        gst_percentage: item.gst_percentage,
        category: item.category || 'Others'
      },
    ]);
    setSelectedItemId("");
    setQuantity(1);
    setError(null);
  };

  const handleRemoveItemFromBill = (index: number) => {
    setCurrentBillItems(prev => prev.filter((_, i) => i !== index));
  };

  const filteredVendors = selectedRouteId ? vendors.filter(v => v.route_id === selectedRouteId) : [];

  const handleSubmitBill = async (e: React.FormEvent) => {
    e.preventDefault();
    setTriedSubmit(true);
    if (!vendorId || !date || currentBillItems.length === 0) {
      setError("Please select a vendor, date, and add at least one item.");
      return;
    }
    setLoading(true);
    setError(null);
    setSuccess(null);

    const billItemsForApi = currentBillItems.map(({ item_id, quantity }) => ({
      item_id,
      quantity,
    }));

    try {
      const res = await fetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ vendor_id: vendorId, date, items: billItemsForApi }),
      });

      if (res.ok) {
        setSuccess("Bill created successfully! Added to summary.");
        // Reset form
        setVendorId("");
        setDate(new Date().toISOString().split('T')[0]);
        setCurrentBillItems([]);
        setRedirecting(true);
        setTimeout(() => {
          router.push("/summary");
        }, 2000);
      } else {
        const errData = await res.json();
        setError(errData.error || "Failed to create bill.");
      }
    } catch (err) {
      setError("Network error: Failed to create bill. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = currentBillItems.reduce((acc, item) => acc + (item.rate * item.quantity), 0);

  if (initialLoading) {
    return <p>{language === 'gu' ? 'લોડ થઈ રહ્યું છે...' : 'Loading...'}</p>;
  }

  if (error && items.length === 0 && vendors.length === 0) {
    return <p style={{ color: 'red' }}>Error: {error}</p>;
  }

  return (
    <div className="billing-container">
      <h1>{language === 'gu' ? 'બિલ બનાવો' : 'Create Bill'}</h1>

      <form onSubmit={handleSubmitBill}>
        {/* Bill Header */}
        <div className="billing-header">
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>{language === 'gu' ? 'રૂટ' : 'Route'}</label>
            <select
              value={selectedRouteId}
              onChange={e => { setSelectedRouteId(e.target.value); setVendorId(''); }}
              required
              className="form-select"
            >
              <option value="">{language === 'gu' ? 'રૂટ પસંદ કરો' : 'Select Route'}</option>
              {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>{language === 'gu' ? 'વિક્રેતા' : 'Vendor'}</label>
            <select
              value={vendorId}
              onChange={e => setVendorId(e.target.value)}
              required
              disabled={!selectedRouteId}
              className="form-select"
            >
              <option value="">{language === 'gu' ? 'વિક્રેતા પસંદ કરો' : 'Select Vendor'}</option>
              {filteredVendors.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
          </div>
          <div style={{ flex: 1 }}>
            <label style={{ display: 'block', marginBottom: '5px', fontSize: '0.9em' }}>{language === 'gu' ? 'તારીખ' : 'Date'}</label>
            <input
              type="date"
              value={date}
              onChange={e => setDate(e.target.value)}
              required
              className="form-input"
            />
          </div>
        </div>

        <div className="billing-grid">
          {/* Left Column: Item Catalog */}
          <div>
            <h2>{language === 'gu' ? 'વસ્તુઓ પસંદ કરો' : 'Select Items'}</h2>

            {/* Search and Sort */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <input
                placeholder={language === 'gu' ? 'વસ્તુ શોધો...' : 'Search items...'}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{ padding: '8px', flex: 1, borderRadius: '4px', border: '1px solid #ddd' }}
              />
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
                style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ddd' }}
              >
                <option value="name-asc">Name (A-Z)</option>
                <option value="name-desc">Name (Z-A)</option>
                <option value="rate-asc">Rate (Low-High)</option>
                <option value="rate-desc">Rate (High-Low)</option>
              </select>
            </div>

            {/* Catalog List */}
            <div className="catalog-container">
              {CATEGORIES.map(cat => {
                const catItems = groupedItems[cat] || [];
                if (catItems.length === 0) return null;
                return (
                  <div key={cat} style={{ marginBottom: '20px' }}>
                    <h3 style={{ borderBottom: '1px solid #eee', paddingBottom: '5px', color: '#555' }}>{cat}</h3>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <tbody>
                        {catItems.map((item, index) => (
                          <tr key={item.id} style={{ borderBottom: '1px solid #f9f9f9' }}>
                            <td style={{ padding: '8px', width: '30px', color: '#888', verticalAlign: 'top' }}>{index + 1}</td>
                            <td style={{ padding: '8px' }}>
                              <div style={{ fontWeight: 500 }}>{item.name_en}</div>
                              <div style={{ fontSize: '0.8em', color: '#888' }}>{item.name_gu}</div>
                            </td>
                            <td style={{ padding: '8px', textAlign: 'right' }}>₹{item.rate}</td>
                            <td style={{ padding: '8px', width: '120px', textAlign: 'right' }}>
                              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '5px' }}>
                                <input
                                  type="number"
                                  min="1"
                                  value={qtyMap[item.id] || 1}
                                  onChange={(e) => setQtyMap(prev => ({ ...prev, [item.id]: parseInt(e.target.value) || 1 }))}
                                  className="qty-input"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleAddItemDirectly(item)}
                                  className="add-btn"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })}
              {Object.keys(groupedItems).length === 0 && <p>No items found.</p>}
            </div>
          </div>

          {/* Right Column: Cart (Bill Summary) */}
          <div>
            <div className="summary-sidebar">
              <h2 style={{ marginTop: 0 }}>{language === 'gu' ? 'બિલ સારાંશ' : 'Bill Summary'}</h2>
              {currentBillItems.length === 0 ? (
                <p style={{ color: '#888', fontStyle: 'italic' }}>{language === 'gu' ? 'કોઈ વસ્તુ ઉમેરાઈ નથી.' : 'No items added.'}</p>
              ) : (
                <>
                  <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '15px' }}>
                    {CATEGORIES.map(cat => {
                      const itemsInCat = currentBillItems.filter(i => (i.category || 'Others') === cat);
                      if (itemsInCat.length === 0) return null;

                      return (
                        <div key={cat} style={{ marginBottom: '15px' }}>
                          <h4 style={{ margin: '0 0 5px 0', borderBottom: '1px solid #eee', paddingBottom: '2px', fontSize: '0.9em', color: '#555' }}>{cat}</h4>
                          <table style={{ width: '100%', fontSize: '0.9em' }}>
                            <thead>
                              <tr style={{ textAlign: 'left', color: '#666', fontSize: '0.85em' }}>
                                <th style={{ paddingBottom: '4px', width: '25px' }}>#</th>
                                <th style={{ paddingBottom: '4px' }}>Item</th>
                                <th style={{ paddingBottom: '4px' }}>Qty</th>
                                <th style={{ paddingBottom: '4px', textAlign: 'right' }}>Amt</th>
                                <th style={{ width: '20px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {itemsInCat.map((item, index) => (
                                <tr key={item.item_id} style={{ borderTop: '1px solid #f9f9f9' }}>
                                  <td style={{ padding: '4px 0', color: '#888' }}>{index + 1}</td>
                                  <td style={{ padding: '4px 0' }}>{item.name}</td>
                                  <td style={{ padding: '4px 0' }}>{item.quantity}</td>
                                  <td style={{ padding: '4px 0', textAlign: 'right' }}>{(item.rate * item.quantity).toFixed(2)}</td>
                                  <td style={{ padding: '4px 0', textAlign: 'right' }}>
                                    <button
                                      type="button"
                                      onClick={() => setCurrentBillItems(prev => prev.filter(i => i.item_id !== item.item_id))}
                                      style={{ border: 'none', background: 'transparent', color: 'red', cursor: 'pointer', fontSize: '1.2em', padding: '0 5px' }}
                                    >
                                      &times;
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      );
                    })}
                  </div>

                  <div style={{ borderTop: '2px solid #333', paddingTop: '10px', marginTop: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '5px' }}>
                      <span>Subtotal:</span>
                      <span>{currentBillItems.reduce((sum, item) => sum + (item.rate * item.quantity), 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                      <span>GST:</span>
                      <span>{currentBillItems.reduce((sum, item) => sum + (item.rate * item.quantity) * ((item.gst_percentage || 0) / 100), 0).toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', fontSize: '1.2em' }}>
                      <span>Total:</span>
                      <span>{currentBillItems.reduce((sum, item) => sum + (item.rate * item.quantity) * (1 + (item.gst_percentage || 0) / 100), 0).toFixed(2)}</span>
                    </div>
                  </div>
                </>
              )}

              <button
                type="submit"
                disabled={loading || !vendorId || !date || currentBillItems.length === 0}
                style={{ width: '100%', padding: '12px', marginTop: '20px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1em', cursor: 'pointer' }}
              >
                {loading ? (language === 'gu' ? 'સબમિટ થઈ રહ્યું છે...' : 'Processing...') : (language === 'gu' ? 'બિલ બનાવો' : 'Create Bill')}
              </button>

              {error && <p style={{ color: 'red', marginTop: '10px', fontSize: '0.9em' }}>{error}</p>}
              {success && <p style={{ color: 'green', marginTop: '10px', fontSize: '0.9em' }}>{success}</p>}

            </div>
          </div>
        </div>
      </form>
    </div>
  );
}