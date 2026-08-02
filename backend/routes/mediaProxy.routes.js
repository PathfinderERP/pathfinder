import express from "express";
import { getSignedFileUrl } from "../utils/r2Upload.js";

const router = express.Router();

/**
 * GET /api/media/proxy
 * Redirects or serves a fresh valid signed R2 URL for any given file URL or key
 */
router.get("/proxy", async (req, res) => {
    try {
        const { url, key } = req.query;
        const target = url || key;

        if (!target) {
            return res.status(400).send("Missing url or key parameter");
        }

        const freshSignedUrl = await getSignedFileUrl(target);
        if (freshSignedUrl) {
            return res.redirect(302, freshSignedUrl);
        }

        return res.status(404).send("File not found or invalid URL");
    } catch (error) {
        console.error("Media proxy error:", error);
        return res.status(500).send("Failed to proxy media URL");
    }
});

export default router;
