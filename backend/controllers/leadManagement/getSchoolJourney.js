import SchoolForTask from "../../models/Master_data/SchoolForTask.js";
import MarketingPlanner from "../../models/MarketingPlanner.js";
import AssignedTask from "../../models/AssignedTask.js";
import { getSignedFileUrl } from "../../utils/r2Upload.js";

export const getSchoolJourney = async (req, res) => {
    try {
        const {
            search = "",
            center = "",
            tier = "",
            status = "",
            startDate = "",
            endDate = "",
            visitedOnly = "false",
            page = 1,
            limit = 20
        } = req.query;

        // Build query for SchoolForTask
        const schoolQuery = {};

        if (search && search.trim()) {
            schoolQuery.schoolName = { $regex: search.trim(), $options: "i" };
        }

        if (center && center.trim() && center !== "All") {
            schoolQuery.centerName = center;
        }

        if (tier && tier.trim() && tier !== "All") {
            schoolQuery.tier = tier;
        }

        if (status && status.trim() && status !== "All") {
            schoolQuery.status = status;
        }

        // Fetch all matching school IDs for overall stat calculations
        const [totalSchoolsCount, allSchoolDocs] = await Promise.all([
            SchoolForTask.countDocuments(schoolQuery),
            SchoolForTask.find(schoolQuery).select("_id schoolName").lean()
        ]);

        if (allSchoolDocs.length === 0) {
            return res.status(200).json({
                success: true,
                data: [],
                totalItems: 0,
                totalPages: 1,
                currentPage: parseInt(page),
                stats: { totalSchools: 0, totalVisits: 0, visitedSchoolsCount: 0 }
            });
        }

        const allSchoolIds = allSchoolDocs.map(s => s._id);
        const allSchoolNames = allSchoolDocs.map(s => s.schoolName);
        const allSchoolMap = new Map();
        allSchoolDocs.forEach(s => {
            allSchoolMap.set(s._id.toString(), s);
            if (s.schoolName) {
                allSchoolMap.set(s.schoolName.toLowerCase().trim(), s);
            }
        });

        // Build planner date query
        const plannerQuery = {
            $or: [
                { schoolRef: { $in: allSchoolIds } },
                { institution: { $in: allSchoolNames } }
            ]
        };

        const assignedQuery = {
            school: { $in: allSchoolIds }
        };

        if (startDate && endDate) {
            plannerQuery.date = { $gte: startDate, $lte: endDate };
            assignedQuery.planDate = { $gte: startDate, $lte: endDate };
        } else if (startDate) {
            plannerQuery.date = { $gte: startDate };
            assignedQuery.planDate = { $gte: startDate };
        } else if (endDate) {
            plannerQuery.date = { $lte: endDate };
            assignedQuery.planDate = { $lte: endDate };
        }

        // Fetch planner records and assigned task records across ALL matching schools for dynamic stats
        const [allPlannerRecords, allAssignedRecords] = await Promise.all([
            MarketingPlanner.find(plannerQuery)
                .populate("user", "name role email phone centres")
                .sort({ date: -1, createdAt: -1 })
                .lean(),
            AssignedTask.find(assignedQuery)
                .populate("assignedTo", "name role email")
                .populate("assignedBy", "name role")
                .sort({ planDate: -1, createdAt: -1 })
                .lean()
        ]);

        // Calculate dynamic overall stats across ALL matching schools
        const visitedSchoolIdSet = new Set();
        let totalVisitsAcrossAll = 0;

        allPlannerRecords.forEach(p => {
            totalVisitsAcrossAll++;
            if (p.schoolRef) {
                visitedSchoolIdSet.add(p.schoolRef.toString());
            } else if (p.institution) {
                const matched = allSchoolMap.get(p.institution.toLowerCase().trim());
                if (matched) {
                    visitedSchoolIdSet.add(matched._id.toString());
                }
            }
        });

        allAssignedRecords.forEach(a => {
            totalVisitsAcrossAll++;
            if (a.school) {
                visitedSchoolIdSet.add(a.school.toString());
            }
        });

        // If visitedOnly filter is active, narrow down schoolQuery to only visited school IDs
        const isVisitedOnlyFilter = visitedOnly === "true" || visitedOnly === true;
        let finalSchoolQuery = { ...schoolQuery };
        let responseTotalItems = totalSchoolsCount;

        if (isVisitedOnlyFilter) {
            const visitedIdsArr = Array.from(visitedSchoolIdSet);
            finalSchoolQuery._id = { $in: visitedIdsArr };
            responseTotalItems = visitedIdsArr.length;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const paginatedSchools = await SchoolForTask.find(finalSchoolQuery)
            .populate("centerName", "centreName code")
            .populate("board", "boardName")
            .sort({ schoolName: 1 })
            .skip(skip)
            .limit(parseInt(limit))
            .lean();

        // Filter records for the CURRENT page of schools and sign photo URLs
        const currentPageSchoolIds = new Set(paginatedSchools.map(s => s._id.toString()));
        const currentPageSchoolNames = new Set(paginatedSchools.map(s => (s.schoolName || "").toLowerCase().trim()));

        const pagePlannerRecords = allPlannerRecords.filter(p => {
            const refStr = p.schoolRef ? p.schoolRef.toString() : null;
            const instLower = (p.institution || "").toLowerCase().trim();
            return (refStr && currentPageSchoolIds.has(refStr)) || (instLower && currentPageSchoolNames.has(instLower));
        });

        const pageAssignedRecords = allAssignedRecords.filter(a => {
            const sStr = a.school ? a.school.toString() : null;
            return sStr && currentPageSchoolIds.has(sStr);
        });

        // Sign photo URLs for page planner records
        const processedPagePlannerRecords = await Promise.all(
            pagePlannerRecords.map(async (rec) => {
                let photos = rec.photos || [];
                if ((!photos || photos.length === 0) && rec.photo) {
                    photos = [rec.photo];
                }
                const signedPhotos = await Promise.all(
                    photos.map(p => getSignedFileUrl(p))
                );
                return {
                    ...rec,
                    photos: signedPhotos,
                    photo: signedPhotos[0] || null
                };
            })
        );

        // Map journey records for each school on the current page
        const schoolsWithJourney = paginatedSchools.map(school => {
            const schoolIdStr = school._id.toString();
            const schoolNameLower = (school.schoolName || "").toLowerCase().trim();

            const matchedPlanner = processedPagePlannerRecords.filter(p => {
                const refIdStr = p.schoolRef ? p.schoolRef.toString() : null;
                const instLower = (p.institution || "").toLowerCase().trim();
                return refIdStr === schoolIdStr || (schoolNameLower && instLower === schoolNameLower);
            }).map(p => ({
                id: p._id.toString(),
                sourceType: "Field Visit",
                user: {
                    id: p.user?._id || p.user,
                    name: p.user?.name || p.owner || "Unknown User",
                    role: p.user?.role || "Staff",
                    email: p.user?.email || ""
                },
                date: p.date || "",
                planTime: p.plan || "",
                actualTime: p.actual || "",
                captureDateTime: p.captureDateTime || "",
                submittedAt: p.submittedAt || "",
                activityType: p.type || "School Visit",
                schoolStatus: p.schoolStatus || school.status || "—",
                notes: p.notes || "No notes provided",
                remarks: p.remarks || "",
                leads: p.leads || "0",
                photos: p.photos || [],
                latitude: p.latitude || null,
                longitude: p.longitude || null,
                locationName: p.locationName || "",
                approvalStatus: p.status || "Pending",
                createdAt: p.createdAt
            }));

            const matchedAssigned = pageAssignedRecords.filter(a => {
                const sIdStr = a.school ? a.school.toString() : null;
                return sIdStr === schoolIdStr;
            }).map(a => {
                const assignedUsers = Array.isArray(a.assignedTo) ? a.assignedTo : (a.assignedTo ? [a.assignedTo] : []);
                const primaryUser = assignedUsers[0];
                return {
                    id: a._id.toString(),
                    sourceType: "Assigned Task",
                    user: {
                        id: primaryUser?._id,
                        name: primaryUser?.name || a.assignedByName || "Admin Assigned",
                        role: primaryUser?.role || "Staff",
                        email: primaryUser?.email || ""
                    },
                    date: a.planDate || "",
                    planTime: a.time || "",
                    actualTime: "—",
                    captureDateTime: "",
                    submittedAt: a.createdAt ? new Date(a.createdAt).toLocaleDateString('en-IN') : "",
                    activityType: a.activityType || "Assigned Task",
                    schoolStatus: a.schoolStatus || school.status || "—",
                    notes: a.notes || "Assigned by Admin",
                    remarks: "",
                    leads: "0",
                    photos: [],
                    latitude: null,
                    longitude: null,
                    locationName: "",
                    approvalStatus: a.status || "Assigned",
                    createdAt: a.createdAt
                };
            });

            const journey = [...matchedPlanner, ...matchedAssigned].sort((a, b) => {
                const dateA = a.date || (a.createdAt ? new Date(a.createdAt).toISOString() : "");
                const dateB = b.date || (b.createdAt ? new Date(b.createdAt).toISOString() : "");
                return dateB.localeCompare(dateA);
            });

            return {
                ...school,
                journey,
                visitCount: journey.length,
                lastVisit: journey[0] || null
            };
        });

        res.status(200).json({
            success: true,
            data: schoolsWithJourney,
            totalItems: responseTotalItems,
            totalPages: Math.max(1, Math.ceil(responseTotalItems / parseInt(limit))),
            currentPage: parseInt(page),
            stats: {
                totalSchools: totalSchoolsCount,
                totalVisits: totalVisitsAcrossAll,
                visitedSchoolsCount: visitedSchoolIdSet.size
            }
        });
    } catch (error) {
        console.error("Error fetching school journey:", error);
        res.status(500).json({ success: false, message: "Server error fetching school journey", error: error.message });
    }
};
