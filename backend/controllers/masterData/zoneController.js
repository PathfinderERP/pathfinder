import Zone from '../../models/Zone.js';
import Centre from '../../models/Master_data/Centre.js';

/**
 * Get all zones with their associated centres
 */
export const getZones = async (req, res) => {
    try {
        const zones = await Zone.find()
            .populate({
                path: 'centres',
                select: 'centreName location enterCode',
                strictPopulate: false
            })
            .populate({
                path: 'createdBy',
                select: 'name email',
                strictPopulate: false
            })
            .populate({
                path: 'updatedBy',
                select: 'name email',
                strictPopulate: false
            })
            .sort({ name: 1 })
            .lean();

        res.status(200).json({
            success: true,
            count: zones.length,
            data: zones
        });
    } catch (error) {
        console.error('Error fetching zones:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch zones',
            error: error.message
        });
    }
};

/**
 * Get a single zone by ID
 */
export const getZoneById = async (req, res) => {
    try {
        const { id } = req.params;

        const zone = await Zone.findById(id)
            .populate({
                path: 'centres',
                select: 'centreName location enterCode',
                strictPopulate: false
            })
            .populate({
                path: 'createdBy',
                select: 'name email',
                strictPopulate: false
            })
            .populate({
                path: 'updatedBy',
                select: 'name email',
                strictPopulate: false
            })
            .lean();

        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        res.status(200).json({
            success: true,
            data: zone
        });
    } catch (error) {
        console.error('Error fetching zone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch zone',
            error: error.message
        });
    }
};

/**
 * Create a new zone
 */
export const createZone = async (req, res) => {
    try {
        const { name, description, location, centres, isActive } = req.body;
        const userId = req.user._id;

        // Check if zone with same name already exists
        const existingZone = await Zone.findOne({ name: { $regex: new RegExp(`^${name}$`, 'i') } });
        if (existingZone) {
            return res.status(400).json({
                success: false,
                message: 'Zone with this name already exists'
            });
        }

        const zone = new Zone({
            name,
            description,
            location: location || {},
            centres: centres || [],
            isActive: isActive !== undefined ? isActive : true,
            createdBy: userId,
            updatedBy: userId
        });

        await zone.save();

        const populatedZone = await Zone.findById(zone._id)
            .populate('centres', 'centreName location enterCode')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        res.status(201).json({
            success: true,
            message: 'Zone created successfully',
            data: populatedZone
        });
    } catch (error) {
        console.error('Error creating zone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to create zone',
            error: error.message
        });
    }
};

/**
 * Update a zone
 */
export const updateZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { name, description, location, centres, isActive } = req.body;
        const userId = req.user._id;

        const zone = await Zone.findById(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        // Check if new name conflicts with existing zone
        if (name && name !== zone.name) {
            const existingZone = await Zone.findOne({
                name: { $regex: new RegExp(`^${name}$`, 'i') },
                _id: { $ne: id }
            });
            if (existingZone) {
                return res.status(400).json({
                    success: false,
                    message: 'Zone with this name already exists'
                });
            }
        }

        // Update fields
        if (name) zone.name = name;
        if (description !== undefined) zone.description = description;
        if (location !== undefined) zone.location = location;
        if (centres !== undefined) zone.centres = centres;
        if (isActive !== undefined) zone.isActive = isActive;
        zone.updatedBy = userId;

        await zone.save();

        const updatedZone = await Zone.findById(id)
            .populate('centres', 'centreName location enterCode')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Zone updated successfully',
            data: updatedZone
        });
    } catch (error) {
        console.error('Error updating zone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to update zone',
            error: error.message
        });
    }
};

/**
 * Delete a zone
 */
export const deleteZone = async (req, res) => {
    try {
        const { id } = req.params;

        const zone = await Zone.findById(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        // Check if zone has centres assigned
        if (zone.centres && zone.centres.length > 0) {
            return res.status(400).json({
                success: false,
                message: 'Cannot delete zone with assigned centres. Please remove centres first.'
            });
        }

        await Zone.findByIdAndDelete(id);

        res.status(200).json({
            success: true,
            message: 'Zone deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting zone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to delete zone',
            error: error.message
        });
    }
};

/**
 * Add centres to a zone
 */
export const addCentresToZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { centreIds } = req.body;
        const userId = req.user._id;

        if (!centreIds || !Array.isArray(centreIds) || centreIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide centre IDs'
            });
        }

        const zone = await Zone.findById(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        // Add centres (avoid duplicates)
        const newCentres = centreIds.filter(centreId =>
            !zone.centres.some(existing => existing.toString() === centreId.toString())
        );

        zone.centres.push(...newCentres);
        zone.updatedBy = userId;
        await zone.save();

        const updatedZone = await Zone.findById(id)
            .populate('centres', 'centreName location enterCode')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Centres added to zone successfully',
            data: updatedZone
        });
    } catch (error) {
        console.error('Error adding centres to zone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to add centres to zone',
            error: error.message
        });
    }
};

/**
 * Remove centres from a zone
 */
export const removeCentresFromZone = async (req, res) => {
    try {
        const { id } = req.params;
        const { centreIds } = req.body;
        const userId = req.user._id;

        if (!centreIds || !Array.isArray(centreIds) || centreIds.length === 0) {
            return res.status(400).json({
                success: false,
                message: 'Please provide centre IDs'
            });
        }

        const zone = await Zone.findById(id);
        if (!zone) {
            return res.status(404).json({
                success: false,
                message: 'Zone not found'
            });
        }

        // Remove centres
        zone.centres = zone.centres.filter(centreId =>
            !centreIds.some(id => id.toString() === centreId.toString())
        );

        zone.updatedBy = userId;
        await zone.save();

        const updatedZone = await Zone.findById(id)
            .populate('centres', 'centreName location enterCode')
            .populate('createdBy', 'name email')
            .populate('updatedBy', 'name email');

        res.status(200).json({
            success: true,
            message: 'Centres removed from zone successfully',
            data: updatedZone
        });
    } catch (error) {
        console.error('Error removing centres from zone:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to remove centres from zone',
            error: error.message
        });
    }
};
