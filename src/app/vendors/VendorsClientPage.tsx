"use client";
import { useState, useMemo } from "react";
import { useLanguage } from '../LanguageProvider';

interface Vendor {
  id: string;
  name: string;
  route_id: string;
  contact?: string;
  address?: string;
}
interface Route {
  id: string;
  name: string;
}

export default function VendorsClientPage({ initialVendors, initialRoutes }: { initialVendors: Vendor[], initialRoutes: Route[] }) {
  const { language } = useLanguage();
  const [vendors, setVendors] = useState<Vendor[]>(initialVendors);
  const [routes, setRoutes] = useState<Route[]>(initialRoutes);
  const [name, setName] = useState("");
  const [routeId, setRouteId] = useState("");
  const [contact, setContact] = useState("");
  const [address, setAddress] = useState("");
  const [loading, setLoading] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editContact, setEditContact] = useState("");
  const [editAddress, setEditAddress] = useState("");


  const [searchTerm, setSearchTerm] = useState("");
  const [sortOrder, setSortOrder] = useState<"name-asc" | "name-desc">("name-asc");
  const [selectedRouteFilter, setSelectedRouteFilter] = useState("");

  const routeMap = useMemo(() => Object.fromEntries(routes.map(r => [r.id, r.name])), [routes]);

  const processedVendors = useMemo(() => {
    let result = [...vendors];

    if (selectedRouteFilter) {
      result = result.filter(v => v.route_id === selectedRouteFilter);
    }

    if (searchTerm) {
      const lower = searchTerm.toLowerCase();
      result = result.filter(v =>
        v.name.toLowerCase().includes(lower) ||
        (v.contact && v.contact.toLowerCase().includes(lower)) ||
        (v.address && v.address.toLowerCase().includes(lower))
      );
    }
    result.sort((a, b) => {
      if (sortOrder === "name-asc") return a.name.localeCompare(b.name);
      if (sortOrder === "name-desc") return b.name.localeCompare(a.name);
      return 0;
    });
    return result;
  }, [vendors, searchTerm, sortOrder, selectedRouteFilter]);

  const fetchVendors = async () => {
    setLoading(true);
    const res = await fetch("/api/vendors");
    const data = await res.json();
    setVendors(Array.isArray(data) ? data : []);
    setLoading(false);
  };

  const handleAddVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !routeId) return;
    await fetch("/api/vendors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, route_id: routeId, contact, address }),
    });
    setName("");
    setRouteId("");
    setContact("");
    setAddress("");
    fetchVendors();
  };

  const startEdit = (vendor: Vendor) => {
    setEditingId(vendor.id);
    setEditName(vendor.name);
    setEditContact(vendor.contact || "");
    setEditAddress(vendor.address || "");
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditName("");
    setEditContact("");
    setEditAddress("");
  };

  const handleEditVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingId || !editName) return;
    await fetch("/api/vendors", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: editingId, name: editName, contact: editContact, address: editAddress }),
    });
    cancelEdit();
    fetchVendors();
  };

  const handleDeleteVendor = async (vendorId: string) => {
    if (window.confirm("Are you sure you want to delete this vendor?")) {
      const response = await fetch(`/api/vendors?id=${vendorId}`, {
        method: "DELETE",
      });
      if (response.ok) {
        fetchVendors();
      } else {
        const err = await response.json();
        alert(`Failed to delete vendor: ${err.error}`);
      }
    }
  };

  return (
    <div style={{ maxWidth: 800, margin: "2rem auto", padding: 16 }}>
      <h1>{language === 'gu' ? 'વિક્રેતાઓ' : 'Vendors'}</h1>

      {/* Search and Sort Controls */}
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
        <input
          placeholder={language === 'gu' ? 'શોધો...' : 'Search vendors...'}
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: '8px', flex: 1, minWidth: '200px', borderRadius: '6px', border: '1px solid #ddd' }}
        />
        <select
          value={selectedRouteFilter}
          onChange={(e) => setSelectedRouteFilter(e.target.value)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
        >
          <option value="">{language === 'gu' ? 'બધા રૂટ' : 'All Routes'}</option>
          {routes.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
        </select>
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value as any)}
          style={{ padding: '8px', borderRadius: '6px', border: '1px solid #ddd', background: '#fff' }}
        >
          <option value="name-asc">Name (A-Z)</option>
          <option value="name-desc">Name (Z-A)</option>
        </select>
      </div>

      <form onSubmit={handleAddVendor} style={{ marginBottom: 24, padding: '15px', border: '1px solid #e0e0e0', borderRadius: '8px' }}>
        <h3 style={{ margin: '0 0 12px 0', fontSize: '1.1em' }}>{language === 'gu' ? 'નવો વિક્રેતા ઉમેરો' : 'Add New Vendor'}</h3>
        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <input
            value={name}
            onChange={e => setName(e.target.value)}
            placeholder={language === 'gu' ? 'વિક્રેતાનું નામ' : 'Vendor name'}
            required
            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <select
            value={routeId}
            onChange={e => setRouteId(e.target.value)}
            required
            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
            title={language === 'gu' ? 'રૂટ પસંદ કરો' : 'Select Route'}
          >
            <option value="">{language === 'gu' ? 'રૂટ પસંદ કરો' : 'Select Route'}</option>
            {routes.map(route => (
              <option key={route.id} value={route.id}>{route.name}</option>
            ))}
          </select>
          <input
            value={contact}
            onChange={e => setContact(e.target.value)}
            placeholder={language === 'gu' ? 'સંપર્ક' : 'Contact'}
            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input
            value={address}
            onChange={e => setAddress(e.target.value)}
            placeholder={language === 'gu' ? 'સરનામું' : 'Address'}
            style={{ flex: 1, padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button type="submit" style={{ padding: '8px 16px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>
            {language === 'gu' ? 'ઉમેરો' : 'Add'}
          </button>
        </div>
      </form>

      {loading ? (
        <p>{language === 'gu' ? 'લોડ થઈ રહ્યું છે...' : 'Loading...'}</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {processedVendors.map((vendor, index) => (
            <li key={vendor.id} style={{ marginBottom: 12 }}>
              {editingId === vendor.id ? (
                <form onSubmit={handleEditVendor} style={{ display: 'inline' }}>
                  <input
                    value={editName}
                    onChange={e => setEditName(e.target.value)}
                    placeholder={language === 'gu' ? 'વિક્રેતાનું નામ' : 'Vendor name'}
                    required
                    style={{ marginRight: 8 }}
                  />
                  <input
                    value={editContact}
                    onChange={e => setEditContact(e.target.value)}
                    placeholder={language === 'gu' ? 'સંપર્ક' : 'Contact'}
                    style={{ marginRight: 8 }}
                  />
                  <input
                    value={editAddress}
                    onChange={e => setEditAddress(e.target.value)}
                    placeholder={language === 'gu' ? 'સરનામું' : 'Address'}
                    style={{ marginRight: 8 }}
                  />
                  <button type="submit">{language === 'gu' ? 'સાચવો' : 'Save'}</button>
                  <button type="button" onClick={cancelEdit} style={{ marginLeft: 8 }}>{language === 'gu' ? 'રદ કરો' : 'Cancel'}</button>
                </form>
              ) : (
                <>
                  <span style={{ marginRight: '8px', color: '#888', fontWeight: 'bold' }}>{index + 1}.</span>
                  <strong>{vendor.name}</strong> ({language === 'gu' ? 'રૂટ' : 'Route'}: {routeMap[vendor.route_id] || 'N/A'})
                  {vendor.contact && <> - {vendor.contact}</>}
                  {vendor.address && <> - {vendor.address}</>}
                  <button style={{ marginLeft: 8 }} onClick={() => startEdit(vendor)}>{language === 'gu' ? 'ફેરફાર કરો' : 'Edit'}</button>
                  <button style={{ marginLeft: 8 }} onClick={() => handleDeleteVendor(vendor.id)}>{language === 'gu' ? 'કાઢી નાખો' : 'Delete'}</button>
                </>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
} 