import MarketingPlanner from "../../models/MarketingPlanner.js";
import User from "../../models/User.js";
import LeadManagement from "../../models/LeadManagement.js";
import AssignedTask from "../../models/AssignedTask.js";
import Centre from "../../models/Master_data/Centre.js";
import SchoolForTask from "../../models/Master_data/SchoolForTask.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";

export const getTeamPerformance = async (req, res) => {
    try {
        const {
            centers = "",
            activities = "",
            dateRange = "This Month",
            startDate = "",
            endDate = "",
            search = ""
        } = req.query;

        // Determine date filter boundaries
        let startStr = "";
        let endStr = "";
        const now = new Date();
        const yyyy = now.getFullYear();
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const todayStr = `${yyyy}-${mm}-${dd}`;

        if (dateRange === "Today") {
            startStr = todayStr;
            endStr = todayStr;
        } else if (dateRange === "Yesterday") {
            const yest = new Date(now);
            yest.setDate(yest.getDate() - 1);
            const yStr = yest.toISOString().split('T')[0];
            startStr = yStr;
            endStr = yStr;
        } else if (dateRange === "Last 7 Days") {
            const d7 = new Date(now);
            d7.setDate(d7.getDate() - 6);
            startStr = d7.toISOString().split('T')[0];
            endStr = todayStr;
        } else if (dateRange === "This Month") {
            startStr = `${yyyy}-${mm}-01`;
            endStr = todayStr;
        } else if (dateRange === "Last Month") {
            const lmDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            const lmLastDate = new Date(now.getFullYear(), now.getMonth(), 0);
            startStr = lmDate.toISOString().split('T')[0];
            endStr = lmLastDate.toISOString().split('T')[0];
        } else if (dateRange === "Custom Range" && startDate && endDate) {
            startStr = startDate;
            endStr = endDate;
        }

        // Parse activity type filter
        let activityFilterArr = [];
        if (activities && activities.trim() && activities !== "All") {
            activityFilterArr = activities.split(",").map(a => {
                let clean = a.trim().toLowerCase();
                if (clean === "[object object]") return "";
                return clean;
            }).filter(Boolean);
        }

        const isActivityTypeMatched = (typeStr) => {
            if (activityFilterArr.length === 0) return true;
            if (!typeStr) return false;
            const cleanType = String(typeStr).trim().toLowerCase().replace(/[^a-z0-9]/g, "");
            return activityFilterArr.some(filterItem => {
                const cleanFilter = filterItem.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
                return cleanType === cleanFilter ||
                    cleanType.includes(cleanFilter) ||
                    cleanFilter.includes(cleanType);
            });
        };

        // Build query for MarketingPlanner
        const plannerQuery = {};
        if (startStr && endStr) {
            plannerQuery.date = { $gte: startStr, $lte: endStr };
        } else if (startStr) {
            plannerQuery.date = { $gte: startStr };
        } else if (endStr) {
            plannerQuery.date = { $lte: endStr };
        }

        // Build query for AssignedTask
        const assignedTaskQuery = {};
        if (startStr && endStr) {
            const sDate = new Date(`${startStr}T00:00:00.000Z`);
            const eDate = new Date(`${endStr}T23:59:59.999Z`);
            assignedTaskQuery.planDate = { $gte: sDate, $lte: eDate };
        } else if (startStr) {
            assignedTaskQuery.planDate = { $gte: new Date(`${startStr}T00:00:00.000Z`) };
        } else if (endStr) {
            assignedTaskQuery.planDate = { $lte: new Date(`${endStr}T23:59:59.999Z`) };
        }

        // Fetch planner records, assigned tasks, and all master centres in parallel
        const [plannerRecords, assignedTasks, allCentreDocs] = await Promise.all([
            MarketingPlanner.find(plannerQuery)
                .populate("user", "name email phone role designation centres profilePicture status")
                .populate("schoolRef", "schoolName centerName tier status")
                .sort({ date: -1, createdAt: -1 })
                .lean(),
            AssignedTask.find(assignedTaskQuery)
                .populate("assignedTo", "name email phone role designation centres profilePicture status")
                .sort({ planDate: -1 })
                .lean(),
            Centre.find().select("_id centreName enterCode location").lean()
        ]);

        // Default master activity types from system
        const defaultActivityTypeList = [
            "WEBSITE", "META", "FOUNDATION", "MOCK", "REPEATER", "2 YEAR",
            "Leafletting", "Others Activity", "DIGITAL LEAD", "Tuition Visit",
            "Data Calling", "Referral Drive", "Shikkha Bondhu", "School Visit",
            "SURVEY FORM", "Walk In", "Tele Enquiry", "Market Activity",
            "Canopy", "Seminar", "Workshop", "Assigned Task"
        ];

        const availableActivityTypesSet = new Set(defaultActivityTypeList);
        plannerRecords.forEach(r => {
            if (r.type && r.type.trim()) availableActivityTypesSet.add(r.type.trim());
        });

        // Build a robust ID -> centreName map
        const centreMap = new Map();
        (allCentreDocs || []).forEach(c => {
            const cId = c._id.toString();
            const cName = c.centreName || c.location || c.enterCode || "";
            if (cName) {
                centreMap.set(cId, cName);
            }
        });

        const resolveCentreNames = (centresInput) => {
            if (!centresInput) return [];
            const arr = Array.isArray(centresInput) ? centresInput : [centresInput];
            return arr.map(c => {
                if (!c) return "";
                if (typeof c === "object" && (c.centreName || c.name)) return c.centreName || c.name;
                const cStr = typeof c === "object" ? (c._id ? c._id.toString() : String(c)) : String(c);
                return centreMap.get(cStr) || cStr;
            }).filter(c => c && !c.match(/^[0-9a-fA-F]{24}$/));
        };

        const resolveSingleCentreName = (centreInput, fallback = "N/A") => {
            const resolved = resolveCentreNames(centreInput);
            return resolved.length > 0 ? resolved[0] : fallback;
        };

        // Fetch all marketing target users
        const targetRoles = [
            "marketing", "counsellor", "centerincharge", "centreincharge",
            "zonalmanager", "zonalhead", "assistantcenterincharge", "assistantzonalmanager"
        ];

        const allUsers = await User.find({
            status: { $ne: "deactivated" }
        })
        .select("name email phone role designation centres profilePicture status")
        .populate("centres", "centreName")
        .lean();

        // Map relevant users
        const relevantUsersMap = new Map();
        allUsers.forEach(u => {
            const cleanRole = (u.role || "").toLowerCase().replace(/\s+/g, "");
            if (targetRoles.includes(cleanRole) || u.role === "marketing") {
                const resolvedCentres = resolveCentreNames(u.centres);
                relevantUsersMap.set(u._id.toString(), {
                    userId: u._id.toString(),
                    name: u.name || "Unknown Staff",
                    email: u.email || "",
                    phone: u.phone || "",
                    role: u.role || "Marketing Executive",
                    designation: u.designation?.designationName || u.role || "Executive",
                    centres: resolvedCentres.length > 0 ? resolvedCentres : ["All Centres"],
                    totalActivities: 0,
                    totalVisits: 0,
                    completedVisits: 0,
                    activityBreakdown: {},
                    schoolsMap: new Map(),
                    totalLeads: 0,
                    totalHotLeads: 0,
                    photosCount: 0,
                    lastVisitDate: null,
                    visitLogs: []
                });
            }
        });

        // Helper to ensure user entry exists in map
        const getOrCreateUserStats = (userObj, fallbackName = "Marketing Staff") => {
            const uId = (userObj._id || userObj).toString();
            if (!relevantUsersMap.has(uId)) {
                const resolvedCentres = resolveCentreNames(userObj.centres);
                relevantUsersMap.set(uId, {
                    userId: uId,
                    name: userObj.name || fallbackName,
                    email: userObj.email || "",
                    phone: userObj.phone || "",
                    role: userObj.role || "Marketing Executive",
                    designation: userObj.designation?.designationName || userObj.role || "Executive",
                    centres: resolvedCentres.length > 0 ? resolvedCentres : ["All Centres"],
                    totalActivities: 0,
                    totalVisits: 0,
                    completedVisits: 0,
                    activityBreakdown: {},
                    schoolsMap: new Map(),
                    totalLeads: 0,
                    totalHotLeads: 0,
                    photosCount: 0,
                    lastVisitDate: null,
                    visitLogs: []
                });
            }
            return relevantUsersMap.get(uId);
        };

        // Parse planner records and aggregate stats per user
        plannerRecords.forEach(rec => {
            if (!rec.user) return;
            const activityType = (rec.type || "School Visit").trim();
            
            if (!isActivityTypeMatched(activityType)) return;

            const userStats = getOrCreateUserStats(rec.user, rec.owner || "Marketing Staff");

            userStats.totalActivities += 1;
            userStats.activityBreakdown[activityType] = (userStats.activityBreakdown[activityType] || 0) + 1;

            if (rec.status === "Approved" || rec.photo || (rec.photos && rec.photos.length > 0)) {
                userStats.completedVisits += 1;
            }

            const schoolName = rec.institution || rec.schoolRef?.schoolName || rec.locationName;
            const visitEntry = {
                id: rec._id,
                date: rec.date,
                institution: schoolName || "Field Activity",
                type: activityType,
                planTime: rec.plan || "",
                actualTime: rec.actual || "",
                status: rec.status || "Pending",
                leads: rec.leads || "0",
                notes: rec.notes || rec.remarks || "",
                locationName: resolveSingleCentreName(rec.locationName, rec.locationName || ""),
                latitude: rec.latitude,
                longitude: rec.longitude,
                photos: rec.photos && rec.photos.length > 0 ? rec.photos : (rec.photo ? [rec.photo] : [])
            };

            if (schoolName && schoolName.trim()) {
                const cleanSName = schoolName.trim();
                const sKey = cleanSName.toLowerCase();
                const rawCentre = rec.schoolRef?.centerName || rec.locationName || userStats.centres[0];
                const resolvedCenter = resolveSingleCentreName(rawCentre, userStats.centres[0] || "N/A");
                
                if (!userStats.schoolsMap.has(sKey)) {
                    userStats.schoolsMap.set(sKey, {
                        schoolName: cleanSName,
                        centerName: resolvedCenter,
                        tier: rec.schoolRef?.tier || "Tier A",
                        status: rec.schoolStatus || rec.schoolRef?.status || "Visited",
                        visitCount: 0,
                        leadsCount: 0,
                        lastVisitDate: null,
                        lastNotes: "",
                        schoolVisits: []
                    });
                }

                const sEntry = userStats.schoolsMap.get(sKey);
                sEntry.visitCount += 1;
                sEntry.leadsCount += (parseFloat(rec.leads) || 0);
                sEntry.schoolVisits.push(visitEntry);
                if (!sEntry.lastVisitDate || rec.date > sEntry.lastVisitDate) {
                    sEntry.lastVisitDate = rec.date;
                }
                if (rec.notes || rec.remarks) {
                    sEntry.lastNotes = rec.notes || rec.remarks;
                }
            }

            userStats.totalVisits += 1;
            userStats.totalLeads += (parseFloat(rec.leads) || 0);
            userStats.totalHotLeads += (parseFloat(rec.expectedHotLeads) || 0);

            const hasPhoto = rec.photo || (rec.photos && rec.photos.length > 0);
            if (hasPhoto) {
                userStats.photosCount += (rec.photos ? rec.photos.length : 1);
            }

            if (!userStats.lastVisitDate || rec.date > userStats.lastVisitDate) {
                userStats.lastVisitDate = rec.date;
            }

            userStats.visitLogs.push(visitEntry);
        });

        // Parse assigned task records
        assignedTasks.forEach(task => {
            if (!task.assignedTo) return;
            
            if (!isActivityTypeMatched("Assigned Task") && !isActivityTypeMatched(task.taskType || "Task")) {
                return;
            }

            const userStats = getOrCreateUserStats(task.assignedTo, task.assignedToName || "Staff");

            const taskDate = task.planDate ? new Date(task.planDate).toISOString().split('T')[0] : "";
            userStats.totalActivities += 1;
            userStats.activityBreakdown["Assigned Task"] = (userStats.activityBreakdown["Assigned Task"] || 0) + 1;

            const visitEntry = {
                id: task._id,
                date: taskDate,
                institution: task.schoolName || "Assigned School Task",
                type: "Assigned Task",
                planTime: "",
                actualTime: "",
                status: task.status || "Pending",
                leads: "0",
                notes: `Task assigned by ${task.assignedByName || "Admin"}`,
                locationName: resolveSingleCentreName(task.centreName, task.centreName || ""),
                photos: []
            };

            if (task.schoolName && task.schoolName.trim()) {
                const cleanSName = task.schoolName.trim();
                const sKey = cleanSName.toLowerCase();
                const resolvedCenter = resolveSingleCentreName(task.centreName, userStats.centres[0] || "N/A");

                if (!userStats.schoolsMap.has(sKey)) {
                    userStats.schoolsMap.set(sKey, {
                        schoolName: cleanSName,
                        centerName: resolvedCenter,
                        tier: task.schoolTier || "Tier A",
                        status: task.schoolStatus || "Assigned Task",
                        visitCount: 0,
                        leadsCount: 0,
                        lastVisitDate: null,
                        lastNotes: `Task assigned by ${task.assignedByName || "Admin"}`,
                        schoolVisits: []
                    });
                }

                const sEntry = userStats.schoolsMap.get(sKey);
                sEntry.visitCount += 1;
                sEntry.schoolVisits.push(visitEntry);
                if (taskDate && (!sEntry.lastVisitDate || taskDate > sEntry.lastVisitDate)) {
                    sEntry.lastVisitDate = taskDate;
                }
            }

            if (task.status === "Approved" || task.status === "Completed") {
                userStats.completedVisits += 1;
            }

            if (taskDate && (!userStats.lastVisitDate || taskDate > userStats.lastVisitDate)) {
                userStats.lastVisitDate = taskDate;
            }

            userStats.visitLogs.push(visitEntry);
        });

        // Fetch detailed lead entries from LeadManagement for all relevant users
        const leadQuery = {};
        if (startStr && endStr) {
            const sDate = new Date(`${startStr}T00:00:00.000Z`);
            const eDate = new Date(`${endStr}T23:59:59.999Z`);
            leadQuery.createdAt = { $gte: sDate, $lte: eDate };
        } else if (startStr) {
            leadQuery.createdAt = { $gte: new Date(`${startStr}T00:00:00.000Z`) };
        } else if (endStr) {
            leadQuery.createdAt = { $lte: new Date(`${endStr}T23:59:59.999Z`) };
        }

        const relevantUserIds = Array.from(relevantUsersMap.keys());
        leadQuery.createdBy = { $in: relevantUserIds };

        const leadDocs = await LeadManagement.find(leadQuery)
            .populate("centre", "centreName")
            .populate("className", "name")
            .populate("course", "courseName")
            .sort({ createdAt: -1 })
            .lean();

        // -------------------------------------------------------------
        // FETCH ADMISSION STATUS & DOWN PAYMENT DETAILS FOR LEADS
        // -------------------------------------------------------------
        const leadPhones = new Set();
        const leadEmails = new Set();
        leadDocs.forEach(l => {
            if (l.phoneNumber) leadPhones.add(l.phoneNumber.trim());
            if (l.secondPhoneNumber) leadPhones.add(l.secondPhoneNumber.trim());
            if (l.email && l.email.includes("@")) leadEmails.add(l.email.trim().toLowerCase());
        });

        const phoneArr = Array.from(leadPhones).filter(Boolean);
        const emailArr = Array.from(leadEmails).filter(Boolean);

        const matchingStudents = await Student.find({
            $or: [
                { phoneNumber: { $in: phoneArr } },
                { mobileNum: { $in: phoneArr } },
                { email: { $in: emailArr } }
            ]
        }).select("_id phoneNumber mobileNum email").lean();

        const studentIdSet = new Set(matchingStudents.map(s => s._id.toString()));
        const phoneToStudentIdMap = new Map();
        matchingStudents.forEach(s => {
            if (s.phoneNumber) phoneToStudentIdMap.set(s.phoneNumber.trim(), s._id.toString());
            if (s.mobileNum) phoneToStudentIdMap.set(s.mobileNum.trim(), s._id.toString());
        });

        const [normalAdmissions, boardAdmissions] = await Promise.all([
            Admission.find({ student: { $in: Array.from(studentIdSet) } })
                .populate("course", "courseName")
                .select("student course admissionType downPayment totalPaidAmount totalFees downPaymentStatus createdAt")
                .lean(),
            BoardCourseAdmission.find({ studentId: { $in: Array.from(studentIdSet) } })
                .populate("boardId", "boardCourse boardName")
                .select("studentId boardId programme boardCourseName admissionFee totalPaidAmount examFeePaid additionalThingsPaid installments createdAt")
                .lean()
        ]);

        const studentNormalAdmMap = new Map();
        normalAdmissions.forEach(adm => {
            const sId = adm.student ? adm.student.toString() : "";
            if (!sId) return;
            const dpPaid = (adm.downPaymentStatus === "PAID" || adm.downPaymentStatus === "APPROVED" || adm.downPayment > 0)
                ? (adm.downPayment || 0)
                : (adm.totalPaidAmount || 0);
            
            studentNormalAdmMap.set(sId, {
                type: "NORMAL",
                courseName: adm.course?.courseName || "Regular Course",
                downPayment: dpPaid
            });
        });

        const studentBoardAdmMap = new Map();
        boardAdmissions.forEach(adm => {
            const sId = adm.studentId ? adm.studentId.toString() : "";
            if (!sId) return;
            
            let dpPaid = 0;
            if (adm.programme === 'CRP') {
                const firstInst = (adm.installments || [])[0];
                dpPaid = firstInst?.paidAmount || adm.totalPaidAmount || adm.admissionFee || 0;
            } else {
                dpPaid = (adm.examFeePaid || 0) + (adm.additionalThingsPaid || 0);
                if (dpPaid === 0) dpPaid = adm.totalPaidAmount || adm.admissionFee || 0;
            }

            studentBoardAdmMap.set(sId, {
                type: "BOARD",
                courseName: adm.boardCourseName || adm.boardId?.boardCourse || adm.boardId?.boardName || "Board Course",
                downPayment: dpPaid
            });
        });

        const userLeadsMap = new Map();
        leadDocs.forEach(l => {
            const uId = l.createdBy?.toString();
            if (!uId) return;
            if (!userLeadsMap.has(uId)) {
                userLeadsMap.set(uId, []);
            }

            const phone = (l.phoneNumber || l.secondPhoneNumber || "").trim();
            const studentId = phoneToStudentIdMap.get(phone) || (l.studentRef ? l.studentRef.toString() : null);

            let admissionStatus = "In Lead Page";
            let admittedCourse = "—";
            let downPaymentPaid = 0;

            if (studentId && studentNormalAdmMap.has(studentId)) {
                const adm = studentNormalAdmMap.get(studentId);
                admissionStatus = "Admitted (Regular)";
                admittedCourse = adm.courseName;
                downPaymentPaid = adm.downPayment;
            } else if (studentId && studentBoardAdmMap.has(studentId)) {
                const adm = studentBoardAdmMap.get(studentId);
                admissionStatus = "Admitted (Board)";
                admittedCourse = adm.courseName;
                downPaymentPaid = adm.downPayment;
            } else if (l.isAdmitted || l.status === "Admitted" || l.admitted) {
                admissionStatus = "Admitted";
                admittedCourse = l.courseText || l.course?.courseName || "Admitted Course";
                downPaymentPaid = l.downPayment || 0;
            } else if (l.isCounselled || l.counselled || l.status === "Counselled" || l.leadType === "Counselled" || l.stage === "Counselled") {
                admissionStatus = "Counselled";
                admittedCourse = "—";
                downPaymentPaid = 0;
            }

            userLeadsMap.get(uId).push({
                id: l._id,
                name: l.name || "N/A",
                phone: l.phoneNumber || l.secondPhoneNumber || "N/A",
                email: l.email || "N/A",
                schoolName: l.schoolName || "N/A",
                className: l.className?.name || "N/A",
                course: l.course?.courseName || l.courseText || "N/A",
                centre: resolveSingleCentreName(l.centre, "N/A"),
                leadType: l.leadType || "NEUTRAL LEAD",
                source: l.source || "Field Marketing",
                createdAt: l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : "",
                admissionStatus,
                admittedCourse,
                downPaymentPaid
            });
        });

        // Convert Map to array and attach detailedLeads & detailedSchoolsList
        let userStatsList = Array.from(relevantUsersMap.values()).map(u => {
            const detailedLeads = userLeadsMap.get(u.userId) || [];
            const finalTotalLeads = Math.max(u.totalLeads, detailedLeads.length);
            const detailedSchoolsList = Array.from(u.schoolsMap.values());

            return {
                ...u,
                totalLeads: finalTotalLeads,
                detailedLeads,
                detailedSchoolsList,
                uniqueSchoolsVisitedCount: detailedSchoolsList.length,
                activityScore: calculateActivityScore(u)
            };
        });

        // Filter by centre dropdown if specified
        if (centers && centers.trim() && centers !== "All") {
            const centerArr = centers.split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
            userStatsList = userStatsList.filter(u => {
                const userCentres = u.centres.map(c => (c || "").toLowerCase());
                return centerArr.some(c => userCentres.includes(c));
            });
        }

        // Filter by search query
        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            userStatsList = userStatsList.filter(u => 
                u.name.toLowerCase().includes(s) || 
                u.email.toLowerCase().includes(s) ||
                u.phone.includes(s)
            );
        }

        // SORT BY TOTAL ACTIVITIES DESCENDING (Primary), then TOTAL LEADS DESCENDING
        userStatsList.sort((a, b) => b.totalActivities - a.totalActivities || b.totalLeads - a.totalLeads || b.completedVisits - a.completedVisits);

        // Assign ranks based on total activities count
        userStatsList.forEach((u, index) => {
            u.rank = index + 1;
        });

        // Compute overall team metrics
        const overallStats = {
            totalActivitiesDone: userStatsList.reduce((sum, u) => sum + u.totalActivities, 0),
            totalFieldVisits: userStatsList.reduce((sum, u) => sum + u.totalVisits, 0),
            activePersonnelCount: userStatsList.filter(u => u.totalActivities > 0).length,
            totalSchoolsVisited: new Set(userStatsList.flatMap(u => u.detailedSchoolsList.map(s => s.schoolName.toLowerCase()))).size,
            totalLeadsCollected: userStatsList.reduce((sum, u) => sum + u.totalLeads, 0),
            topPerformer: userStatsList.length > 0 && userStatsList[0].totalActivities > 0 ? userStatsList[0] : null
        };

        return res.status(200).json({
            success: true,
            overallStats,
            leaderboard: userStatsList.slice(0, 3),
            teamPerformance: userStatsList,
            availableActivityTypes: Array.from(availableActivityTypesSet)
        });

    } catch (error) {
        console.error("Get Team Performance Error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

const calculateActivityScore = (user) => {
    if (user.totalActivities === 0) return "Inactive";
    if (user.totalActivities >= 20 || user.completedVisits >= 12) return "Highly Active";
    if (user.totalActivities >= 7) return "Moderately Active";
    return "Needs Improvement";
};
