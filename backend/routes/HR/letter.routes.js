import express from "express";
import {
    generateOfferLetter,
    sendOfferLetter,
    generateAppointmentLetter,
    sendAppointmentLetter,
    generateContractLetter,
    sendContractLetter,
    generateExperienceLetter,
    sendExperienceLetter,
    generateReleaseLetter,
    sendReleaseLetter,
    generateVirtualId,
    sendVirtualId,
    downloadLetter,
    deleteLetter
} from "../../controllers/HR/letterController.js";
import authMiddleware from "../../middleware/authMiddleware.js";

const router = express.Router();

// Download - Public (to support window.open)
router.get("/download/:fileName", downloadLetter);

router.use(authMiddleware);

// Offer Letter
router.post("/offer/:id", generateOfferLetter);
router.post("/offer/:id/send", sendOfferLetter);

// Appointment Letter
router.post("/appointment/:id", generateAppointmentLetter);
router.post("/appointment/:id/send", sendAppointmentLetter);

// Contract Letter
router.post("/contract/:id", generateContractLetter);
router.post("/contract/:id/send", sendContractLetter);

// Experience Letter
router.post("/experience/:id", generateExperienceLetter);
router.post("/experience/:id/send", sendExperienceLetter);

// Release Letter
router.post("/release/:id", generateReleaseLetter);
router.post("/release/:id/send", sendReleaseLetter);

// Virtual ID
router.post("/virtual-id/:id", generateVirtualId);
router.post("/virtual-id/:id/send", sendVirtualId);

router.delete("/:employeeId/:letterId", deleteLetter);

export default router;
