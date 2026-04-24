import SystemLog from "../models/SystemLog.js";

const loggingMiddleware = async (req, res, next) => {
    // We only want to log mutations (POST, PUT, DELETE)
    // and skip GET requests to avoid bloating the database
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
        // Exclude common non-mutation POST requests that bloat the logs
        const exclusions = ['/view', '/visit', '/analytics', '/log', '/heartbeat', '/status'];
        if (exclusions.some(path => req.originalUrl.includes(path))) {
            return next();
        }

        // Intercept the response to log it after it's finished
        const originalSend = res.send;
        res.send = function (body) {
            res.send = originalSend;
            const response = originalSend.call(this, body);

            // Log after response is sent successfully (status < 400)
            if (res.statusCode < 400 && req.user) {
                try {
                    // Determine module from URL
                    const urlParts = req.originalUrl.split('/');
                    const moduleName = urlParts[2] || 'General';

                    // Determine action
                    let action = `${req.method} ${req.originalUrl}`;
                    
                    // Specific action mapping for better readability
                    const url = req.originalUrl.toLowerCase();
                    if (url.includes('admission')) {
                        action = req.method === 'POST' ? 'Created Admission' : 'Updated Admission';
                    } else if (url.includes('payment')) {
                        action = 'Recorded Payment';
                    } else if (url.includes('student')) {
                        action = 'Student Management Action';
                    } else if (url.includes('lead')) {
                        action = 'Lead Management Action';
                    } else if (url.includes('login')) {
                        action = 'User Login';
                    } else if (url.includes('logout')) {
                        action = 'User Logout';
                    } else if (url.includes('post')) {
                        if (url.includes('comment')) action = 'Added Comment';
                        else if (url.includes('like')) action = 'Liked Post';
                        else if (url.includes('vote')) action = 'Voted on Poll';
                        else action = req.method === 'POST' ? 'Created Post' : 'Updated Post';
                    }

                    const logEntry = new SystemLog({
                        user: req.user._id,
                        userName: req.user.name,
                        userRole: req.user.role,
                        action: action,
                        module: moduleName,
                        details: {
                            body: req.method !== 'GET' ? req.body : undefined,
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

                    logEntry.save().catch(err => console.error("Error saving system log:", err));
                } catch (logErr) {
                    console.error("Logging middleware error:", logErr);
                }
            }
            return response;
        };
    }
    next();
};

export default loggingMiddleware;
