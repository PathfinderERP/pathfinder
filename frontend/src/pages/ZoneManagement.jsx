import React, { useState, useEffect } from 'react';
import Layout from '../components/Layout';
import { FaPlus, FaEdit, FaTrash, FaMapMarkerAlt, FaBuilding, FaSearch, FaMap, FaGlobe } from 'react-icons/fa';
import { toast } from 'react-toastify';
import { hasPermission } from '../config/permissions';
import InteractiveMap from '../components/MasterData/Centre/InteractiveMap';
import ExcelImportExport from "../components/common/ExcelImportExport";

const ZoneManagement = () => {
    const [zones, setZones] = useState([]);
    const [centres, setCentres] = useState([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingZone, setEditingZone] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [currentUser, setCurrentUser] = useState(null);

    const [formData, setFormData] = useState({
        name: '',
        description: '',
        location: {
            address: '',
            city: '',
            state: '',
            country: 'India',
            pincode: '',
            coordinates: {
                latitude: '',
                longitude: ''
            }
        },
        centres: [],
        isActive: true
    });

    // Get current user from localStorage
    useEffect(() => {
        const user = JSON.parse(localStorage.getItem('user'));
        setCurrentUser(user);
    }, []);

    // Check permissions
    const canCreate = currentUser?.role === 'superAdmin' || hasPermission(currentUser, 'masterData', 'zone', 'create');
    const canEdit = currentUser?.role === 'superAdmin' || hasPermission(currentUser, 'masterData', 'zone', 'edit');
    const canDelete = currentUser?.role === 'superAdmin' || hasPermission(currentUser, 'masterData', 'zone', 'delete');

    // Fetch zones and centres
    useEffect(() => {
        fetchZones();
        fetchCentres();
    }, []);

    const fetchZones = async () => {
        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/zone`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) throw new Error('Failed to fetch zones');

            const data = await response.json();
            console.log('Zones fetched:', data.data);
            setZones(data.data || []);
        } catch (error) {
            console.error('Error fetching zones:', error);
            toast.error('Failed to load zones');
        } finally {
            setLoading(false);
        }
    };

    const fetchCentres = async () => {
        try {
            const token = localStorage.getItem('token');
            console.log('Fetching centres from:', `${import.meta.env.VITE_API_URL}/centre`);

            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            console.log('Centre API response status:', response.status);

            if (!response.ok) {
                const errorText = await response.text();
                console.error('Centre API error:', errorText);
                throw new Error('Failed to fetch centres');
            }

            const data = await response.json();
            console.log('Centres API full response:', data);

            // Handle different response formats
            let centresArray = [];
            if (Array.isArray(data)) {
                centresArray = data;
            } else if (data.data && Array.isArray(data.data)) {
                centresArray = data.data;
            } else if (data.centres && Array.isArray(data.centres)) {
                centresArray = data.centres;
            } else if (data.center && Array.isArray(data.center)) {
                centresArray = data.center;
            }

            console.log('Processed centres array:', centresArray);
            console.log('Number of centres:', centresArray.length);

            setCentres(centresArray);

            if (centresArray.length === 0) {
                console.warn('No centres found in the response');
                toast.info('No centres available. Please add centres first.');
            }
        } catch (error) {
            console.error('Error fetching centres:', error);
            toast.error('Failed to load centres: ' + error.message);
            setCentres([]); // Set empty array on error
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!canCreate && !editingZone) {
            toast.error('You do not have permission to create zones');
            return;
        }

        if (!canEdit && editingZone) {
            toast.error('You do not have permission to edit zones');
            return;
        }

        try {
            const token = localStorage.getItem('token');
            const url = editingZone
                ? `${import.meta.env.VITE_API_URL}/zone/${editingZone._id}`
                : `${import.meta.env.VITE_API_URL}/zone`;

            console.log('Submitting zone data:', formData);

            const response = await fetch(url, {
                method: editingZone ? 'PUT' : 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify(formData)
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to save zone');
            }

            toast.success(data.message || `Zone ${editingZone ? 'updated' : 'created'} successfully`);
            fetchZones();
            handleCloseModal();
        } catch (error) {
            console.error('Error saving zone:', error);
            toast.error(error.message || 'Failed to save zone');
        }
    };

    const handleDelete = async (zoneId) => {
        if (!canDelete) {
            toast.error('You do not have permission to delete zones');
            return;
        }

        if (!window.confirm('Are you sure you want to delete this zone?')) return;

        try {
            const token = localStorage.getItem('token');
            const response = await fetch(`${import.meta.env.VITE_API_URL}/zone/${zoneId}`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.message || 'Failed to delete zone');
            }

            toast.success('Zone deleted successfully');
            fetchZones();
        } catch (error) {
            console.error('Error deleting zone:', error);
            toast.error(error.message || 'Failed to delete zone');
        }
    };

    const handleBulkImport = async (importData) => {
        const token = localStorage.getItem('token');

        // Restructure location fields for backend
        const restructuredData = importData.map(item => ({
            name: item.name,
            description: item.description,
            isActive: item.isActive !== undefined ? item.isActive : true,
            location: {
                address: item.address,
                city: item.city,
                state: item.state,
                country: item.country || 'India',
                pincode: item.pincode,
                coordinates: {
                    latitude: item.latitude,
                    longitude: item.longitude
                }
            }
        }));

        const response = await fetch(`${import.meta.env.VITE_API_URL}/zone/import`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify(restructuredData),
        });

        if (!response.ok) {
            const error = await response.json();
            throw new Error(error.message || "Bulk import failed");
        }

        fetchZones();
    };

    const zoneColumns = [
        { header: "Zone Name", key: "name" },
        { header: "Description", key: "description" },
        { header: "Address", key: "address" },
        { header: "City", key: "city" },
        { header: "State", key: "state" },
        { header: "Pincode", key: "pincode" },
        { header: "Latitude", key: "latitude" },
        { header: "Longitude", key: "longitude" }
    ];

    const zoneMapping = {
        "Zone Name": "name",
        "Description": "description",
        "Address": "address",
        "City": "city",
        "State": "state",
        "Pincode": "pincode",
        "Latitude": "latitude",
        "Longitude": "longitude"
    };

    const prepareExportData = () => {
        return zones.map(z => ({
            name: z.name,
            description: z.description,
            address: z.location?.address,
            city: z.location?.city,
            state: z.location?.state,
            pincode: z.location?.pincode,
            latitude: z.location?.coordinates?.latitude,
            longitude: z.location?.coordinates?.longitude
        }));
    };

    const handleEdit = (zone) => {
        if (!canEdit) {
            toast.error('You do not have permission to edit zones');
            return;
        }

        console.log('Editing zone:', zone);
        setEditingZone(zone);
        setFormData({
            name: zone.name,
            description: zone.description || '',
            location: {
                address: zone.location?.address || '',
                city: zone.location?.city || '',
                state: zone.location?.state || '',
                country: zone.location?.country || 'India',
                pincode: zone.location?.pincode || '',
                coordinates: {
                    latitude: zone.location?.coordinates?.latitude || '',
                    longitude: zone.location?.coordinates?.longitude || ''
                }
            },
            centres: zone.centres?.map(c => c._id || c) || [],
            isActive: zone.isActive
        });
        setShowModal(true);
    };

    const handleCloseModal = () => {
        setShowModal(false);
        setEditingZone(null);
        setFormData({
            name: '',
            description: '',
            location: {
                address: '',
                city: '',
                state: '',
                country: 'India',
                pincode: '',
                coordinates: {
                    latitude: '',
                    longitude: ''
                }
            },
            centres: [],
            isActive: true
        });
    };

    const handleCentreToggle = (centreId) => {
        console.log('Toggling centre:', centreId);
        console.log('Current centres:', formData.centres);

        setFormData(prev => ({
            ...prev,
            centres: prev.centres.includes(centreId)
                ? prev.centres.filter(id => id !== centreId)
                : [...prev.centres, centreId]
        }));
    };

    const handleGetCurrentLocation = () => {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setFormData(prev => ({
                        ...prev,
                        location: {
                            ...prev.location,
                            coordinates: {
                                latitude: position.coords.latitude,
                                longitude: position.coords.longitude
                            }
                        }
                    }));
                    toast.success('Location captured successfully!');
                },
                (error) => {
                    toast.error('Failed to get current location');
                    console.error('Geolocation error:', error);
                }
            );
        } else {
            toast.error('Geolocation is not supported by your browser');
        }
    };

    const filteredZones = zones.filter(zone =>
        zone.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        zone.location?.city?.toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) {
        return (
            <Layout>
                <div className="flex items-center justify-center h-screen">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-500"></div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            <div className="p-6 bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 min-h-screen">
                {/* Header */}
                <div className="mb-8">
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h1 className="text-3xl font-black text-white flex items-center gap-3">
                                <FaMapMarkerAlt className="text-cyan-500" />
                                Zone Management
                            </h1>
                            <p className="text-gray-400 mt-2">Manage zones with location and assign centres</p>
                        </div>
                        <div className="flex flex-wrap items-center gap-3">
                            {canCreate && (
                                <ExcelImportExport
                                    data={prepareExportData()}
                                    columns={zoneColumns}
                                    mapping={zoneMapping}
                                    onImport={handleBulkImport}
                                    fileName="zones"
                                />
                            )}
                            {canCreate && (
                                <button
                                    onClick={() => setShowModal(true)}
                                    className="px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold flex items-center gap-2 hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-cyan-500/50"
                                >
                                    <FaPlus /> Add Zone
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Search */}
                    <div className="relative">
                        <FaSearch className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search zones by name, description, or city..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-12 pr-4 py-3 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                        />
                    </div>
                </div>

                {/* Zones Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {filteredZones.map((zone) => (
                        <div
                            key={zone._id}
                            className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-xl p-6 hover:border-cyan-500 transition-all shadow-lg hover:shadow-cyan-500/20"
                        >
                            <div className="flex items-start justify-between mb-4">
                                <div className="flex-1">
                                    <h3 className="text-xl font-bold text-white mb-2">{zone.name}</h3>
                                    {zone.description && (
                                        <p className="text-gray-400 text-sm mb-3">{zone.description}</p>
                                    )}

                                    {/* Location Info */}
                                    {zone.location && (zone.location.city || zone.location.address) && (
                                        <div className="mb-3 space-y-1">
                                            {zone.location.address && (
                                                <p className="text-xs text-gray-500 flex items-start gap-2">
                                                    <FaMapMarkerAlt className="text-cyan-400 mt-0.5 flex-shrink-0" />
                                                    <span>{zone.location.address}</span>
                                                </p>
                                            )}
                                            {zone.location.city && (
                                                <p className="text-xs text-gray-500 flex items-center gap-2">
                                                    <FaGlobe className="text-cyan-400" />
                                                    {zone.location.city}{zone.location.state && `, ${zone.location.state}`}
                                                    {zone.location.pincode && ` - ${zone.location.pincode}`}
                                                </p>
                                            )}
                                            {zone.location.coordinates?.latitude && zone.location.coordinates?.longitude && (
                                                <p className="text-xs text-gray-600 flex items-center gap-2">
                                                    <FaMap className="text-cyan-400" />
                                                    {zone.location.coordinates.latitude.toFixed(4)}, {zone.location.coordinates.longitude.toFixed(4)}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    <div className="flex items-center gap-2">
                                        <span className={`px-3 py-1 rounded-full text-xs font-bold ${zone.isActive ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                                            {zone.isActive ? 'Active' : 'Inactive'}
                                        </span>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    {canEdit && (
                                        <button
                                            onClick={() => handleEdit(zone)}
                                            className="p-2 bg-blue-500/20 text-blue-400 rounded-lg hover:bg-blue-500/30 transition-all"
                                        >
                                            <FaEdit />
                                        </button>
                                    )}
                                    {canDelete && (
                                        <button
                                            onClick={() => handleDelete(zone._id)}
                                            className="p-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition-all"
                                        >
                                            <FaTrash />
                                        </button>
                                    )}
                                </div>
                            </div>

                            {/* Centres */}
                            <div className="border-t border-gray-700 pt-4">
                                <div className="flex items-center gap-2 mb-3">
                                    <FaBuilding className="text-cyan-500" />
                                    <span className="text-sm font-bold text-gray-300">
                                        Centres ({zone.centres?.length || 0})
                                    </span>
                                </div>
                                {zone.centres && zone.centres.length > 0 ? (
                                    <div className="space-y-2">
                                        {zone.centres.slice(0, 3).map((centre) => (
                                            <div
                                                key={centre._id}
                                                className="text-sm text-gray-400 bg-gray-700/50 px-3 py-2 rounded-lg"
                                            >
                                                {centre.centreName || centre.name}
                                            </div>
                                        ))}
                                        {zone.centres.length > 3 && (
                                            <div className="text-xs text-cyan-400 font-bold">
                                                +{zone.centres.length - 3} more
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 italic">No centres assigned</p>
                                )}
                            </div>
                        </div>
                    ))}
                </div>

                {filteredZones.length === 0 && (
                    <div className="text-center py-12">
                        <FaMapMarkerAlt className="text-6xl text-gray-600 mx-auto mb-4" />
                        <p className="text-gray-400 text-lg">No zones found</p>
                    </div>
                )}

                {/* Modal */}
                {showModal && (
                    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
                        <div className="bg-gradient-to-br from-gray-800 to-gray-900 border border-gray-700 rounded-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl">
                            <div className="sticky top-0 bg-gradient-to-r from-cyan-500 to-blue-500 p-6 rounded-t-2xl z-10">
                                <h2 className="text-2xl font-black text-white">
                                    {editingZone ? 'Edit Zone' : 'Add New Zone'}
                                </h2>
                            </div>

                            <form onSubmit={handleSubmit} className="p-6 space-y-6">
                                {/* Basic Info */}
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Zone Name */}
                                    <div>
                                        <label className="block text-sm font-bold text-gray-300 mb-2">
                                            Zone Name *
                                        </label>
                                        <input
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                            className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                            placeholder="Enter zone name"
                                        />
                                    </div>

                                    {/* Active Status */}
                                    <div className="flex items-center gap-3 pt-8">
                                        <input
                                            type="checkbox"
                                            id="isActive"
                                            checked={formData.isActive}
                                            onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                                            className="w-5 h-5 text-cyan-500 bg-gray-700 border-gray-600 rounded focus:ring-cyan-500"
                                        />
                                        <label htmlFor="isActive" className="text-sm font-bold text-gray-300">
                                            Active Zone
                                        </label>
                                    </div>
                                </div>

                                {/* Description */}
                                <div>
                                    <label className="block text-sm font-bold text-gray-300 mb-2">
                                        Description
                                    </label>
                                    <textarea
                                        value={formData.description}
                                        onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                                        rows={3}
                                        className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all resize-none"
                                        placeholder="Enter zone description"
                                    />
                                </div>

                                {/* Location Section */}
                                <div className="border-t border-gray-700 pt-6">
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                                        <FaMapMarkerAlt className="text-cyan-500" />
                                        Location Details
                                    </h3>

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {/* Address */}
                                        <div className="md:col-span-2">
                                            <label className="block text-sm font-bold text-gray-300 mb-2">
                                                Address
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.location.address}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, address: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                                placeholder="Enter full address"
                                            />
                                        </div>

                                        {/* City */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">
                                                City
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.location.city}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, city: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                                placeholder="Enter city"
                                            />
                                        </div>

                                        {/* State */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">
                                                State
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.location.state}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, state: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                                placeholder="Enter state"
                                            />
                                        </div>

                                        {/* Pincode */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">
                                                Pincode
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.location.pincode}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, pincode: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                                placeholder="Enter pincode"
                                            />
                                        </div>

                                        {/* Country */}
                                        <div>
                                            <label className="block text-sm font-bold text-gray-300 mb-2">
                                                Country
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.location.country}
                                                onChange={(e) => setFormData({
                                                    ...formData,
                                                    location: { ...formData.location, country: e.target.value }
                                                })}
                                                className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                                placeholder="Enter country"
                                            />
                                        </div>
                                    </div>

                                    {/* Coordinates */}
                                    <div className="mt-4">
                                        <div className="flex items-center justify-between mb-2">
                                            <label className="block text-sm font-bold text-gray-300">
                                                GPS Coordinates
                                            </label>
                                            <button
                                                type="button"
                                                onClick={handleGetCurrentLocation}
                                                className="px-4 py-2 bg-cyan-500/20 text-cyan-400 rounded-lg text-sm font-bold hover:bg-cyan-500/30 transition-all flex items-center gap-2"
                                            >
                                                <FaMapMarkerAlt /> Get Current Location
                                            </button>
                                        </div>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.location.coordinates.latitude}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        location: {
                                                            ...formData.location,
                                                            coordinates: {
                                                                ...formData.location.coordinates,
                                                                latitude: e.target.value
                                                            }
                                                        }
                                                    })}
                                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                                    placeholder="Latitude"
                                                />
                                            </div>
                                            <div>
                                                <input
                                                    type="number"
                                                    step="any"
                                                    value={formData.location.coordinates.longitude}
                                                    onChange={(e) => setFormData({
                                                        ...formData,
                                                        location: {
                                                            ...formData.location,
                                                            coordinates: {
                                                                ...formData.location.coordinates,
                                                                longitude: e.target.value
                                                            }
                                                        }
                                                    })}
                                                    className="w-full px-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-all"
                                                    placeholder="Longitude"
                                                />
                                            </div>
                                        </div>
                                        {formData.location.coordinates.latitude && formData.location.coordinates.longitude && (
                                            <a
                                                href={`https://www.google.com/maps?q=${formData.location.coordinates.latitude},${formData.location.coordinates.longitude}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="mt-2 inline-flex items-center gap-2 text-xs text-cyan-400 hover:text-cyan-300"
                                            >
                                                <FaMap /> View on Google Maps
                                            </a>
                                        )}

                                        {/* Leaflet Interactive Map Selection */}
                                        <div className="mt-4">
                                            <label className="block text-sm font-bold text-gray-300 mb-2">
                                                📍 Interactive Location Selection
                                            </label>
                                            <div className="rounded-xl overflow-hidden border-2 border-cyan-500/30 shadow-2xl">
                                                <InteractiveMap
                                                    latitude={formData.location.coordinates.latitude || 22.5726}
                                                    longitude={formData.location.coordinates.longitude || 88.3639}
                                                    onLocationSelect={(lat, lng) => {
                                                        setFormData(prev => ({
                                                            ...prev,
                                                            location: {
                                                                ...prev.location,
                                                                coordinates: {
                                                                    latitude: lat,
                                                                    longitude: lng
                                                                }
                                                            }
                                                        }));
                                                        toast.success(`Coordinates captured: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
                                                    }}
                                                />
                                            </div>
                                            <div className="mt-3 flex items-center justify-between">
                                                <p className="text-xs text-gray-400 flex items-center gap-1">
                                                    <FaMapMarkerAlt className="text-cyan-400" />
                                                    Selected: {formData.location.coordinates.latitude ? `${parseFloat(formData.location.coordinates.latitude).toFixed(6)}, ${parseFloat(formData.location.coordinates.longitude).toFixed(6)}` : 'No location selected'}
                                                </p>
                                                {formData.location.coordinates.latitude && (
                                                    <a
                                                        href={`https://www.google.com/maps?q=${formData.location.coordinates.latitude},${formData.location.coordinates.longitude}`}
                                                        target="_blank"
                                                        rel="noopener noreferrer"
                                                        className="text-xs text-cyan-400 hover:underline font-bold"
                                                    >
                                                        View on Google Maps
                                                    </a>
                                                )}
                                            </div>
                                            <p className="text-[10px] text-cyan-500/50 mt-2 font-bold uppercase tracking-widest bg-cyan-500/5 p-2 rounded border border-cyan-500/10">
                                                ✨ Click anywhere on the map above to precisely set the zone center point
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                {/* Centres Selection */}
                                <div className="border-t border-gray-700 pt-6">
                                    <label className="block text-sm font-bold text-gray-300 mb-3">
                                        Assign Centres ({formData.centres.length} selected)
                                    </label>

                                    {/* Debug Info */}
                                    <div className="mb-2 text-xs text-gray-500">
                                        Total centres available: {centres.length}
                                    </div>

                                    {centres.length > 0 ? (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-60 overflow-y-auto bg-gray-700/30 p-4 rounded-lg border border-gray-600">
                                            {centres.map((centre) => (
                                                <div
                                                    key={centre._id}
                                                    className="flex items-center gap-3 bg-gray-700 p-3 rounded-lg hover:bg-gray-600 transition-all cursor-pointer"
                                                    onClick={() => handleCentreToggle(centre._id)}
                                                >
                                                    <input
                                                        type="checkbox"
                                                        checked={formData.centres.includes(centre._id)}
                                                        onChange={() => handleCentreToggle(centre._id)}
                                                        onClick={(e) => e.stopPropagation()}
                                                        className="w-4 h-4 text-cyan-500 bg-gray-600 border-gray-500 rounded focus:ring-cyan-500"
                                                    />
                                                    <span className="text-sm text-gray-200">{centre.centreName || centre.name}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-4">
                                            <p className="text-sm text-yellow-400 font-bold mb-2">⚠️ No centres available</p>
                                            <p className="text-xs text-gray-400">
                                                Please add centres from Master Data → Centre before creating zones.
                                            </p>
                                        </div>
                                    )}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-4 pt-4 border-t border-gray-700">
                                    <button
                                        type="button"
                                        onClick={handleCloseModal}
                                        className="flex-1 px-6 py-3 bg-gray-700 text-white rounded-lg font-bold hover:bg-gray-600 transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 text-white rounded-lg font-bold hover:from-cyan-600 hover:to-blue-600 transition-all shadow-lg hover:shadow-cyan-500/50"
                                    >
                                        {editingZone ? 'Update Zone' : 'Create Zone'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )}
            </div>
        </Layout>
    );
};

export default ZoneManagement;
