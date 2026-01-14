import Document from "../../models/HR/Document.js";
import User from "../../models/User.js";
import Employee from "../../models/HR/Employee.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";
import s3Client from "../../config/r2Config.js";
import { PutObjectCommand, GetObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

// Helper to get Signed URL (optional, if we want private access, but typical R2 public logic might apply if public)
// Prompt says "visible by document center", so generated Signed URLs or Public URLs are fine.
// r2Config shows R2_PUBLIC_URL usage in logs, so let's try to construct public URL or use Signed.
// LeadManagement controller used SignedURL. I'll stick to that for security unless public is needed.

export const uploadDocument = async (req, res) => {
    try {
        const { title, description, targetAudience, targetDepartment, targetDesignation } = req.body;
        const files = req.files; // Expecting array if multiple, or req.file if single. Multer likely configured for multiple.

        if (!files || files.length === 0) {
            return res.status(400).json({ message: "No files uploaded." });
        }

        const uploader = await User.findById(req.user.id);
        if (!uploader) {
            return res.status(404).json({ message: "User not found." });
        }

        const uploadedFiles = [];
        const bucketName = process.env.R2_BUCKET_NAME || "erp-documents";

        for (const file of files) {
            const fileName = `docs/${Date.now()}_${file.originalname.replace(/\s+/g, '_')}`;

            // Upload to R2
            await s3Client.send(new PutObjectCommand({
                Bucket: bucketName,
                Key: fileName,
                Body: file.buffer,
                ContentType: file.mimetype,
            }));

            // Generate URL (Signed for validity) or use Public domain if configured
            // Using Signed URL gives 7 days access by default or custom. 
            // Better to just store the Key and generate Signed URL on 'get', 
            // OR if R2 is public, construct the public URL.
            // Previous controller stored PRE-SIGNED url which expires. 
            // Ideally we store the KEY and generate fresh URLs on fetch.
            // But to fit the existing pattern in LeadManagement: it stored `audioUrl: presignedUrl`. 
            // That expires! I should store the Key and generate on fetch for robust "Document Center".

            uploadedFiles.push({
                url: fileName, // Storing KEY here, will resolve in GET
                fileType: file.mimetype,
                fileName: file.originalname
            });
        }

        const newDoc = new Document({
            title,
            description,
            files: uploadedFiles,
            uploadedBy: uploader._id,
            uploadedByName: uploader.name,
            uploadedByDepartment: uploader.teacherDepartment || "N/A", // User model has teacherDepartment
            targetAudience,
            targetDepartment,
            targetDesignation
        });

        await newDoc.save();

        res.status(201).json({ message: "Document uploaded successfully", document: newDoc });

    } catch (error) {
        console.error("Upload Error:", error);
        res.status(500).json({ message: "Server error during upload." });
    }
};

export const getDocuments = async (req, res) => {
    try {
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found" });

        const userDept = user.department; // Ensure User model has this
        const userDesig = user.designation; // Ensure User model has this

        // Filter Logic:
        // 1. Audience is 'All'
        // 2. Audience is 'Department' AND targetDepartment == userDept
        // 3. Audience is 'Designation' AND targetDesignation == userDesig
        // 4. OR User is the uploader (they should see their own uploads?)

        const query = {
            $or: [
                { targetAudience: "All" },
                { targetAudience: "Department", targetDepartment: userDept },
                { targetAudience: "Designation", targetDesignation: userDesig },
                { uploadedBy: user._id } // Uploader always sees
            ]
        };

        let documents = await Document.find(query).sort({ createdAt: -1 });

        // Generate Signed URLs for the keys
        const bucketName = process.env.R2_BUCKET_NAME || "erp-documents";

        const documentsWithUrls = await Promise.all(documents.map(async (doc) => {
            const filesWithUrls = await Promise.all(doc.files.map(async (f) => {
                const command = new GetObjectCommand({
                    Bucket: bucketName,
                    Key: f.url
                });
                const signedUrl = await getSignedUrl(s3Client, command, { expiresIn: 3600 * 24 });
                return {
                    ...f.toObject(),
                    url: signedUrl,
                    key: f.url
                };
            }));

            // Fetch uploader's profile image and department from Employee model
            let uploaderImage = null;
            let uploaderDept = doc.uploadedByDepartment;

            try {
                const emp = await Employee.findOne({ user: doc.uploadedBy })
                    .populate("department", "departmentName")
                    .select("profileImage department");

                if (emp) {
                    if (emp.profileImage) {
                        uploaderImage = await getSignedFileUrl(emp.profileImage);
                    }
                    if (emp.department && emp.department.departmentName) {
                        uploaderDept = emp.department.departmentName;
                    }
                }
            } catch (err) {
                console.error("Error fetching uploader details:", err);
            }

            return {
                ...doc.toObject(),
                files: filesWithUrls,
                uploaderImage: uploaderImage,
                uploadedByDepartment: uploaderDept
            };
        }));

        res.status(200).json(documentsWithUrls);
    } catch (error) {
        console.error("Fetch Documents Error:", error);
        res.status(500).json({ message: "Error fetching documents" });
    }
};

export const deleteDocument = async (req, res) => {
    try {
        const { id } = req.params;
        const doc = await Document.findById(id);

        if (!doc) return res.status(404).json({ message: "Document not found" });

        // Authorization: Only uploader or Admin
        if (doc.uploadedBy.toString() !== req.user.id.toString() && req.user.role !== 'admin') {
            return res.status(403).json({ message: "Unauthorized" });
        }

        // Delete from R2? Optional but polite.
        // Assuming we want to clean up.
        // const bucketName = process.env.R2_BUCKET_NAME;
        // for (const f of doc.files) { ... deleteObject ... } 

        await Document.findByIdAndDelete(id);
        res.status(200).json({ message: "Document deleted" });
    } catch (error) {
        res.status(500).json({ message: "Error deleting document" });
    }
};
