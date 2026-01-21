import express from 'express';
import {
    getZones,
    getZoneById,
    createZone,
    updateZone,
    deleteZone,
    addCentresToZone,
    removeCentresFromZone
} from '../../controllers/masterData/zoneController.js';
import { bulkImport } from '../../controllers/common/bulkController.js';
import Zone from '../../models/Zone.js';
import { requireAuth, requirePermission } from '../../middleware/permissionMiddleware.js';

const router = express.Router();

// Get all zones (requires read permission)
router.get('/', requireAuth, requirePermission('Zone Management', 'read'), getZones);

// Get zone by ID (requires read permission)
router.get('/:id', requireAuth, requirePermission('Zone Management', 'read'), getZoneById);

// Create new zone (requires create permission)
router.post('/', requireAuth, requirePermission('Zone Management', 'create'), createZone);
router.post('/import', requireAuth, requirePermission('Zone Management', 'create'), bulkImport(Zone));

// Update zone (requires edit permission)
router.put('/:id', requireAuth, requirePermission('Zone Management', 'edit'), updateZone);

// Delete zone (requires delete permission)
router.delete('/:id', requireAuth, requirePermission('Zone Management', 'delete'), deleteZone);

// Add centres to zone (requires edit permission)
router.post('/:id/centres/add', requireAuth, requirePermission('Zone Management', 'edit'), addCentresToZone);

// Remove centres from zone (requires edit permission)
router.post('/:id/centres/remove', requireAuth, requirePermission('Zone Management', 'edit'), removeCentresFromZone);

export default router;
