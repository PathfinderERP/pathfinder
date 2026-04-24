import SystemLog from "../models/SystemLog.js";

const loggingMiddleware = async (req, res, next) => {
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        const exclusions = ['/view', '/visit', '/analytics', '/log', '/heartbeat', '/status'];
        if (exclusions.some(path => req.originalUrl.includes(path))) {
            return next();
        }

        const originalSend = res.send;
        res.send = function (body) {
            res.send = originalSend;
            const response = originalSend.call(this, body);

            if (res.statusCode < 400 && req.user) {
                createLog(req, res).catch(err => console.error("Logging background error:", err));
            }
            
            return response;
        };
    }
    next();
};

const createLog = async (req, res) => {
    try {
        const url = req.originalUrl.toLowerCase();
        const urlParts = req.originalUrl.split('/');
        const moduleName = urlParts[2] || 'General';

        // 1. Resolve User Professional Context (Centre & Designation)
        let centreDisplay = 'N/A';
        if (req.user.centres && req.user.centres.length > 0) {
            try {
                // Use a direct mongoose query to get names
                const Centre = (await import("../models/Master_data/Centre.js")).default;
                const centreDocs = await Centre.find({ _id: { $in: req.user.centres } }).select('centreName');
                if (centreDocs && centreDocs.length > 0) {
                    centreDisplay = centreDocs.map(c => c.centreName).join(', ');
                } else {
                    // Fallback if lookup fails but IDs exist
                    centreDisplay = "Assigned Center";
                }
            } catch (e) {
                centreDisplay = "Center Details";
            }
        }

        let designation = req.user.designation;
        if (!designation || designation === 'N/A' || designation.trim() === '') {
            designation = req.user.role === 'superAdmin' ? 'Super Administrator' : (req.user.role || 'Staff');
        }

        // 2. Resolve Target Name & Action
        let targetName = 'System';
        const body = { ...req.body };
        
        const potentialNameFields = ['name', 'studentName', 'leadName', 'firstName', 'userName', 'employeeName', 'title'];
        for (const field of potentialNameFields) {
            if (body[field]) {
                targetName = body[field];
                break;
            }
        }
        
        if (targetName === 'System' && req.params.id) {
            targetName = `ID: ${req.params.id}`;
        }

        let action = `${req.method} ${req.originalUrl}`;
        let riskLevel = 'low';

        if (url.includes('admission')) {
            action = req.method === 'POST' ? `Created Admission for ${targetName}` : `Updated Admission for ${targetName}`;
            riskLevel = 'medium';
        } else if (url.includes('payment')) {
            action = `Recorded Payment for ${targetName}`;
            riskLevel = 'high';
        } else if (url.includes('student')) {
            action = `${req.method === 'POST' ? 'Added' : 'Updated'} Student: ${targetName}`;
            riskLevel = 'medium';
        } else if (url.includes('lead')) {
            action = `${req.method === 'POST' ? 'Captured' : 'Updated'} Lead: ${targetName}`;
            riskLevel = 'medium';
        } else if (url.includes('user') && !url.includes('system-log')) {
            action = `Modified User Account: ${targetName}`;
            riskLevel = 'high';
        } else if (req.method === 'DELETE') {
            action = `DELETED ${moduleName} record: ${targetName}`;
            riskLevel = 'high';
        } else if (url.includes('post')) {
            if (url.includes('comment')) action = 'Added Comment';
            else if (url.includes('like')) action = 'Liked Post';
            else if (url.includes('vote')) action = 'Voted on Poll';
            else action = req.method === 'POST' ? 'Created Post' : 'Updated Post';
        }

        // 3. Resolve IDs in the Body (to show names instead of IDs in the modal)
        // This is a partial resolution for common fields
        const idFieldsToResolve = [
            { field: 'department', modelPath: '../models/Master_data/Department.js', nameField: 'departmentName' },
            { field: 'course', modelPath: '../models/Master_data/Course.js', nameField: 'courseName' },
            { field: 'examTag', modelPath: '../models/Master_data/ExamTag.js', nameField: 'examTagName' },
            { field: 'class', modelPath: '../models/Master_data/Class.js', nameField: 'className' }
        ];

        for (const resolver of idFieldsToResolve) {
            if (body[resolver.field] && typeof body[resolver.field] === 'string' && body[resolver.field].match(/^[0-9a-fA-F]{24}$/)) {
                try {
                    const Model = (await import(resolver.modelPath)).default;
                    const doc = await Model.findById(body[resolver.field]).select(resolver.nameField);
                    if (doc) body[`_${resolver.field}Name`] = doc[resolver.nameField];
                } catch (e) {}
            }
        }

        const logEntry = new SystemLog({
            user: req.user._id,
            userName: req.user.name,
            userRole: req.user.role,
            userDesignation: designation,
            userCentre: centreDisplay,
            action: action,
            module: moduleName,
            pageUrl: req.headers.referer || 'Direct API',
            targetName: targetName !== 'System' ? targetName : undefined,
            riskLevel: riskLevel,
            sessionId: req.headers.authorization?.slice(-20),
            details: {
                body: req.method !== 'GET' ? { ...body, password: body.password ? '******' : undefined } : undefined,
                params: req.params,
                query: req.query,
                statusCode: res.statusCode
            },
            method: req.method,
            url: req.originalUrl,
            ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress,
            statusCode: res.statusCode,
            device: req.headers['user-agent']
        });

        await logEntry.save();
    } catch (error) {
        console.error("Error creating system log:", error);
    }
};

export default loggingMiddleware;
