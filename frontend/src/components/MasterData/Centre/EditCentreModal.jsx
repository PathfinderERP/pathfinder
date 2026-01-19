import React, { useState, useEffect } from "react";
import { FaTimes, FaMapMarkerAlt, FaLocationArrow } from "react-icons/fa";
import { toast } from "react-toastify";
import { INDIAN_STATES } from "../../../constants/states";
import InteractiveMap from "./InteractiveMap";

const EditCentreModal = ({ centre, onClose, onSuccess }) => {
    const [formData, setFormData] = useState({
        centreName: "",
        enterCode: "",
        state: "",
        email: "",
        phoneNumber: "",
        salesPassword: "",
        location: "",
        address: "",
        locationPreview: "",
        enterGstNo: "",
        enterCorporateOfficeAddress: "",
        enterCorporateOfficePhoneNumber: "",
        latitude: null,
        longitude: null,
        accountNumber: "",
        corporateOfficeAddr: "",
        corporateOfficePhoneNo: "",
        gstNo: "",

        locationAddress: "",
        locations: []
    });
    const [loading, setLoading] = useState(false);
    const [gettingLocation, setGettingLocation] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState([]);
    const [searching, setSearching] = useState(false);

    useEffect(() => {
        if (centre) {
            setFormData({
                centreName: centre.centreName || "",
                enterCode: centre.enterCode || "",
                state: centre.state || "",
                email: centre.email || "",
                phoneNumber: centre.phoneNumber || "",
                salesPassword: centre.salesPassword || "",
                location: centre.location || "",
                address: centre.address || "",
                locationPreview: centre.locationPreview || "",
                enterGstNo: centre.enterGstNo || "",
                enterCorporateOfficeAddress: centre.enterCorporateOfficeAddress || "",
                enterCorporateOfficePhoneNumber: centre.enterCorporateOfficePhoneNumber || "",
                latitude: centre.latitude || null,
                longitude: centre.longitude || null,
                accountNumber: centre.accountNumber || "",
                corporateOfficeAddr: centre.corporateOfficeAddr || "",
                corporateOfficePhoneNo: centre.corporateOfficePhoneNo || "",
                gstNo: centre.gstNo || "",

                locationAddress: centre.locationAddress || "",
                locations: centre.locations || []
            });
        }
    }, [centre]);

    const handleChange = (e) => {
        setFormData({ ...formData, [e.target.name]: e.target.value });
    };

    const handleGetCurrentLocation = () => {
        if (!navigator.geolocation) {
            toast.error("Geolocation is not supported by your browser");
            return;
        }

        setGettingLocation(true);
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const { latitude, longitude } = position.coords;
                setFormData({
                    ...formData,
                    latitude: latitude,
                    longitude: longitude
                });
                toast.success("Location captured successfully!");
                setGettingLocation(false);
            },
            (error) => {
                toast.error("Unable to retrieve your location");
                console.error(error);
                setGettingLocation(false);
            }
        );
    };

    const handleSearchLocation = async () => {
        if (!searchQuery.trim()) {
            toast.error("Please enter a location to search");
            return;
        }

        setSearching(true);
        setSearchResults([]);

        try {
            // Using Nominatim (OpenStreetMap) API for geocoding - free and no API key required
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
                {
                    headers: {
                        'User-Agent': 'PathfinderERP/1.0' // Required by Nominatim
                    }
                }
            );
            const data = await response.json();

            if (data && data.length > 0) {
                setSearchResults(data);
                toast.success(`Found ${data.length} location(s)`);
            } else {
                toast.info("No locations found. Try a different search term.");
            }
        } catch (error) {
            console.error("Error searching location:", error);
            toast.error("Error searching for location");
        } finally {
            setSearching(false);
        }
    };

    const handleSelectSearchResult = (result) => {
        setFormData({
            ...formData,
            latitude: parseFloat(result.lat),
            longitude: parseFloat(result.lon)
        });
        setSearchResults([]);
        setSearchQuery("");
        toast.success("Location selected successfully!");
    };

    const handleMapClick = (lat, lng) => {
        setFormData({
            ...formData,
            latitude: lat,
            longitude: lng
        });
        toast.success(`Location updated: ${lat.toFixed(6)}, ${lng.toFixed(6)}`);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const token = localStorage.getItem("token");
            const response = await fetch(`${import.meta.env.VITE_API_URL}/centre/${centre._id}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
                body: JSON.stringify(formData),
            });

            const data = await response.json();

            if (response.ok) {
                toast.success("Centre updated successfully");
                onSuccess();
            } else {
                toast.error(data.message || "Failed to update centre");
            }
        } catch (error) {
            console.error("Error updating centre:", error);
            toast.error("Error updating centre");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4 overflow-y-auto">
            <div className="bg-[#1a1f24] rounded-xl w-full max-w-2xl border border-gray-700 max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-700 sticky top-0 bg-[#1a1f24] z-10">
                    <h3 className="text-xl font-bold text-white">Edit Centre</h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-white">
                        <FaTimes size={20} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Centre Name</label>
                            <input type="text" name="centreName" value={formData.centreName} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Centre Code</label>
                            <input type="text" name="enterCode" value={formData.enterCode} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Account Number</label>
                            <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">State</label>
                            <select
                                name="state"
                                value={formData.state}
                                onChange={handleChange}
                                className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                            >
                                <option value="">Select State</option>
                                {INDIAN_STATES.map((state) => (
                                    <option key={state} value={state}>{state}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Location</label>
                            <input type="text" name="location" value={formData.location} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Email</label>
                            <input type="email" name="email" value={formData.email} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                            <input type="text" name="phoneNumber" value={formData.phoneNumber} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Sales Password</label>
                            <input type="text" name="salesPassword" value={formData.salesPassword} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">GST No</label>
                            <input type="text" name="enterGstNo" value={formData.enterGstNo} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Corporate Office Addr (CSV)</label>
                            <input type="text" name="corporateOfficeAddr" value={formData.corporateOfficeAddr} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Corporate Office Phone (CSV)</label>
                            <input type="text" name="corporateOfficePhoneNo" value={formData.corporateOfficePhoneNo} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">GST No (CSV)</label>
                            <input type="text" name="gstNo" value={formData.gstNo} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Location Address (CSV)</label>
                            <input type="text" name="locationAddress" value={formData.locationAddress} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Address</label>
                            <textarea name="address" value={formData.address} onChange={handleChange} rows="2" className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"></textarea>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Location Map URL</label>
                            <input type="text" name="locationPreview" value={formData.locationPreview} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>

                        {/* Geolocation Section */}
                        <div className="md:col-span-2">
                            <h4 className="text-cyan-400 font-semibold mt-2 mb-3 flex items-center gap-2">
                                <FaMapMarkerAlt /> Geolocation
                            </h4>

                            {/* Location Search */}
                            <div className="mb-4">
                                <label className="block text-gray-400 text-sm mb-2">Search Location by Name</label>
                                <div className="flex gap-2">
                                    <input
                                        type="text"
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSearchLocation()}
                                        placeholder="e.g., Kolkata, Park Street, Mumbai..."
                                        className="flex-1 bg-[#131619] border border-gray-700 rounded-lg p-2 text-white placeholder:text-gray-600"
                                    />
                                    <button
                                        type="button"
                                        onClick={handleSearchLocation}
                                        disabled={searching}
                                        className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all font-semibold"
                                    >
                                        {searching ? "Searching..." : "Search"}
                                    </button>
                                </div>

                                {/* Search Results Dropdown */}
                                {searchResults.length > 0 && (
                                    <div className="mt-2 bg-[#131619] border border-gray-700 rounded-lg max-h-48 overflow-y-auto">
                                        {searchResults.map((result, index) => (
                                            <div
                                                key={index}
                                                onClick={() => handleSelectSearchResult(result)}
                                                className="p-3 hover:bg-gray-800 cursor-pointer border-b border-gray-800 last:border-b-0 transition-colors"
                                            >
                                                <div className="text-white text-sm font-medium">{result.display_name}</div>
                                                <div className="text-gray-500 text-xs mt-1">
                                                    Lat: {parseFloat(result.lat).toFixed(6)}, Lon: {parseFloat(result.lon).toFixed(6)}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Auto Capture Button */}
                            <button
                                type="button"
                                onClick={handleGetCurrentLocation}
                                disabled={gettingLocation}
                                className="mb-4 flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                            >
                                <FaLocationArrow className={gettingLocation ? "animate-spin" : ""} />
                                {gettingLocation ? "Getting Location..." : "Capture Current Location"}
                            </button>

                            {/* Manual Input Fields */}
                            <div className="grid grid-cols-2 gap-4 mb-4">
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Latitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="latitude"
                                        value={formData.latitude || ""}
                                        onChange={handleChange}
                                        placeholder="e.g., 22.5726"
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                                    />
                                </div>
                                <div>
                                    <label className="block text-gray-400 text-sm mb-1">Longitude</label>
                                    <input
                                        type="number"
                                        step="any"
                                        name="longitude"
                                        value={formData.longitude || ""}
                                        onChange={handleChange}
                                        placeholder="e.g., 88.3639"
                                        className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"
                                    />
                                </div>
                            </div>

                            {/* Interactive Map Display */}
                            {formData.latitude && formData.longitude ? (
                                <div className="mt-4">
                                    <label className="block text-gray-400 text-sm mb-2">📍 Click anywhere on the map to update location</label>
                                    <InteractiveMap
                                        latitude={formData.latitude}
                                        longitude={formData.longitude}
                                        onLocationSelect={handleMapClick}
                                        markers={formData.locations}
                                    />
                                    <div className="mt-2 flex items-center justify-between">
                                        <p className="text-xs text-gray-500 flex items-center gap-2">
                                            <FaMapMarkerAlt className="text-cyan-400" />
                                            Coordinates: {parseFloat(formData.latitude).toFixed(6)}, {parseFloat(formData.longitude).toFixed(6)}
                                        </p>
                                        <a
                                            href={`https://www.google.com/maps?q=${formData.latitude},${formData.longitude}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                                        >
                                            Open in Google Maps
                                        </a>
                                    </div>
                                    <p className="text-xs text-green-400 mt-2 bg-green-900/20 p-2 rounded border border-green-800/30">
                                        ✨ Click anywhere on the map to set a new location instantly!
                                    </p>
                                </div>
                            ) : (
                                <div className="mt-4 p-6 bg-gray-800/50 rounded-lg border border-gray-700 text-center">
                                    <p className="text-gray-400 text-sm">
                                        Enter coordinates or search for a location to see the interactive map
                                    </p>
                                </div>
                            )}
                        </div>

                        {/* Multiple Locations Management */}
                        <div className="md:col-span-2 mt-4 border-t border-gray-700 pt-4">
                            <div className="flex justify-between items-center mb-2">
                                <h4 className="text-cyan-400 font-semibold flex items-center gap-2">
                                    <FaMapMarkerAlt /> Added Locations List
                                </h4>
                                <button
                                    type="button"
                                    onClick={() => {
                                        if (!formData.latitude || !formData.longitude) {
                                            toast.error("Please select a location on the map first");
                                            return;
                                        }
                                        const newLoc = {
                                            latitude: formData.latitude,
                                            longitude: formData.longitude,
                                            label: `Location ${formData.locations.length + 1}`,
                                            address: searchQuery || "Pinned Location"
                                        };
                                        setFormData({
                                            ...formData,
                                            locations: [...formData.locations, newLoc]
                                        });
                                        toast.success("Location added to list!");
                                    }}
                                    className="px-3 py-1 bg-green-600 text-white text-sm rounded hover:bg-green-500"
                                >
                                    + Add Current Pin to List
                                </button>
                            </div>

                            {formData.locations.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
                                    {formData.locations.map((loc, idx) => (
                                        <div key={idx} className="bg-gray-800 p-3 rounded border border-gray-700 flex justify-between items-start">
                                            <div>
                                                <p className="text-white font-medium text-sm">{loc.label}</p>
                                                <p className="text-gray-400 text-xs">{loc.latitude.toFixed(5)}, {loc.longitude.toFixed(5)}</p>
                                                <p className="text-gray-500 text-xs truncate max-w-[150px]">{loc.address}</p>
                                            </div>
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    const newLocs = formData.locations.filter((_, i) => i !== idx);
                                                    setFormData({ ...formData, locations: newLocs });
                                                }}
                                                className="text-red-400 hover:text-red-300 text-xs"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <p className="text-gray-500 text-sm italic mb-4">No extra locations added yet.</p>
                            )}

                        </div>
                        <div className="md:col-span-2">
                            <h4 className="text-cyan-400 font-semibold mt-2 mb-2">Corporate Office Details</h4>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-gray-400 text-sm mb-1">Address</label>
                            <textarea name="enterCorporateOfficeAddress" value={formData.enterCorporateOfficeAddress} onChange={handleChange} rows="2" className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white"></textarea>
                        </div>
                        <div>
                            <label className="block text-gray-400 text-sm mb-1">Phone Number</label>
                            <input type="text" name="enterCorporateOfficePhoneNumber" value={formData.enterCorporateOfficePhoneNumber} onChange={handleChange} className="w-full bg-[#131619] border border-gray-700 rounded-lg p-2 text-white" />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-700">
                        <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-700 text-white rounded-lg hover:bg-gray-600">Cancel</button>
                        <button type="submit" disabled={loading} className="px-4 py-2 bg-cyan-500 text-black font-bold rounded-lg hover:bg-cyan-400">
                            {loading ? "Updating..." : "Update Centre"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EditCentreModal;
