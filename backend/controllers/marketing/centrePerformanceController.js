import MarketingPlanner from "../../models/MarketingPlanner.js";
import User from "../../models/User.js";
import LeadManagement from "../../models/LeadManagement.js";
import AssignedTask from "../../models/AssignedTask.js";
import Centre from "../../models/Master_data/Centre.js";
import SchoolForTask from "../../models/Master_data/SchoolForTask.js";
import Admission from "../../models/Admission/Admission.js";
import BoardCourseAdmission from "../../models/Admission/BoardCourseAdmission.js";
import Student from "../../models/Students.js";

export const getCentrePerformance = async (req, res) => {
    try {
        const {
            centers = "",
            activities = "",
            purposes = "",
            activityPurpose = "",
            dateRange = "This Month",
            startDate = "",
            endDate = "",
            search = "",
            page = 1,
            limit = 10
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

        // Parse activity purpose filter
        let purposeFilterArr = [];
        const purpInput = purposes || activityPurpose;
        if (purpInput && purpInput.trim() && purpInput !== "All") {
            purposeFilterArr = purpInput.split(",").map(p => {
                let clean = p.trim().toLowerCase();
                if (clean === "[object object]") return "";
                return clean;
            }).filter(Boolean);
        }

        const isActivityPurposeMatched = (purpStr) => {
            if (purposeFilterArr.length === 0) return true;
            if (!purpStr) return false;
            const cleanPurp = String(purpStr).trim().toLowerCase();
            return purposeFilterArr.some(filterItem => {
                const cleanFilter = filterItem.trim().toLowerCase();
                return cleanPurp === cleanFilter ||
                    cleanPurp.includes(cleanFilter) ||
                    cleanFilter.includes(cleanPurp);
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

        // Fetch planner records, assigned tasks, all master centres, and all active users
        const [plannerRecords, assignedTasks, allCentreDocs, allUsers] = await Promise.all([
            MarketingPlanner.find(plannerQuery)
                .populate("user", "name email phone role designation centres profilePicture status")
                .populate("schoolRef", "schoolName centerName tier status")
                .sort({ date: -1, createdAt: -1 })
                .lean(),
            AssignedTask.find(assignedTaskQuery)
                .populate("assignedTo", "name email phone role designation centres profilePicture status")
                .sort({ planDate: -1 })
                .lean(),
            Centre.find().select("_id centreName enterCode location").lean(),
            User.find({ status: { $ne: "deactivated" } })
                .select("name email phone role designation centres profilePicture status")
                .populate("centres", "centreName location")
                .lean()
        ]);

        const availableActivityTypesSet = new Set();
        const availableActivityPurposesSet = new Set();

        plannerRecords.forEach(r => {
            if (r.type && r.type.trim()) availableActivityTypesSet.add(r.type.trim());
            if (r.activityPurpose && r.activityPurpose.trim()) availableActivityPurposesSet.add(r.activityPurpose.trim());
        });

        (assignedTasks || []).forEach(t => {
            if (t.activityType && t.activityType.trim()) availableActivityTypesSet.add(t.activityType.trim());
            if (t.activityPurpose && t.activityPurpose.trim()) availableActivityPurposesSet.add(t.activityPurpose.trim());
        });

        // -------------------------------------------------------------
        // STRICT MASTER DATA CENTRES ONLY (From ERP Centre Collection)
        // -------------------------------------------------------------
        const masterCentreStatsMap = new Map(); // Key: clean master centre name
        const masterCentreIdMap = new Map();    // Key: _id string or clean name -> Master Name

        (allCentreDocs || []).forEach(c => {
            const cId = c._id.toString();
            const cName = (c.centreName || c.location || "").trim();
            if (!cName) return;

            const cKey = cName.toLowerCase();
            masterCentreIdMap.set(cId, cName);
            masterCentreIdMap.set(cKey, cName);

            if (!masterCentreStatsMap.has(cKey)) {
                masterCentreStatsMap.set(cKey, {
                    centreId: cId,
                    centreName: cName,
                    enterCode: c.enterCode || "CNT",
                    totalActivities: 0,
                    totalVisits: 0,
                    completedVisits: 0,
                    activePersonnelMap: new Map(), // Key: userId -> staff info
                    activityBreakdown: {},
                    purposeBreakdown: {},
                    schoolsMap: new Map(),
                    totalLeads: 0,
                    totalHotLeads: 0,
                    photosCount: 0,
                    lastActivityDate: null,
                    activityLogs: []
                });
            }
        });

        // Function to strictly resolve input to a Master Data Centre Name (ALWAYS RETURNS STRING)
        const resolveToMasterCentreName = (cInput, userCentres = []) => {
            let strCandidate = "";
            if (cInput) {
                if (typeof cInput === "object") {
                    if (cInput.centreName) strCandidate = String(cInput.centreName);
                    else if (cInput.name) strCandidate = String(cInput.name);
                    else if (cInput._id) {
                        const mapped = masterCentreIdMap.get(cInput._id.toString());
                        if (mapped) return String(mapped);
                        strCandidate = cInput._id.toString();
                    }
                } else {
                    strCandidate = String(cInput);
                }
            }

            if (strCandidate && strCandidate.trim()) {
                const clean = strCandidate.trim().toLowerCase();
                if (masterCentreIdMap.has(clean)) {
                    return String(masterCentreIdMap.get(clean));
                }
                for (let [mKey, mObj] of masterCentreStatsMap.entries()) {
                    if (clean.includes(mKey) || mKey.includes(clean)) {
                        return String(mObj.centreName);
                    }
                }
            }

            // Try user's assigned centres
            if (Array.isArray(userCentres) && userCentres.length > 0) {
                for (let uC of userCentres) {
                    let uStr = "";
                    if (typeof uC === "object") {
                        uStr = uC.centreName || uC.name || (uC._id ? uC._id.toString() : "");
                    } else {
                        uStr = String(uC);
                    }
                    if (uStr) {
                        const cleanU = uStr.trim().toLowerCase();
                        if (masterCentreIdMap.has(cleanU)) {
                            return String(masterCentreIdMap.get(cleanU));
                        }
                        for (let [mKey, mObj] of masterCentreStatsMap.entries()) {
                            if (cleanU.includes(mKey) || mKey.includes(cleanU)) {
                                return String(mObj.centreName);
                            }
                        }
                    }
                }
            }

            const firstMaster = Array.from(masterCentreStatsMap.values())[0];
            return firstMaster ? String(firstMaster.centreName) : "Main Centre";
        };

        const allowedStaffRoles = [
            "marketing",
            "centerincharge",
            "centreincharge",
            "assistantcenterincharge",
            "assistantcentreincharge",
            "zonalmanager",
            "areamanager",
            "zonalhead",
            "assistantzonalmanager",
            "assistantzonalhead"
        ];

        const isStaffRoleAllowed = (roleStr) => {
            if (!roleStr) return false;
            const clean = String(roleStr).toLowerCase().replace(/[^a-z0-9]/g, "");
            return allowedStaffRoles.includes(clean);
        };

        // Populate staff members strictly under their PRIMARY Master Data Centre (u.centres[0]) from User collection
        (allUsers || []).forEach(u => {
            if (!isStaffRoleAllowed(u.role)) return;

            const uCentres = u.centres || [];
            if (uCentres.length > 0) {
                const primaryCentre = uCentres[0];
                const targetMasterName = resolveToMasterCentreName(primaryCentre);
                const cKey = String(targetMasterName).toLowerCase();
                const cStats = masterCentreStatsMap.get(cKey);
                if (cStats) {
                    const uId = u._id.toString();
                    if (!cStats.activePersonnelMap.has(uId)) {
                        cStats.activePersonnelMap.set(uId, {
                            userId: uId,
                            name: u.name || "Staff Member",
                            email: u.email || "—",
                            phone: u.phone || u.mobNum || "—",
                            role: u.role || "Executive",
                            designation: u.designation?.designationName || u.role || "Executive",
                            profilePicture: u.profilePicture || null,
                            activitiesCount: 0,
                            completedVisits: 0,
                            leadsCount: 0
                        });
                    }
                }
            }
        });

        // Helper to register/update staff in activePersonnelMap ONLY for their primary centre
        const trackStaffPerformance = (cStats, userObj, fallbackName, recLeads = 0, isCompleted = false) => {
            if (!cStats || !userObj) return;
            if (!isStaffRoleAllowed(userObj.role)) return;

            // Enforce that staff members ONLY appear in their PRIMARY Centre roster
            const uCentres = userObj.centres || [];
            if (uCentres.length > 0) {
                const userPrimaryCentreName = resolveToMasterCentreName(uCentres[0]);
                if (String(userPrimaryCentreName).toLowerCase() !== String(cStats.centreName).toLowerCase()) {
                    return; // Skip adding staff to secondary/field activity location rosters
                }
            }

            const uId = (userObj._id || userObj).toString();
            if (!cStats.activePersonnelMap.has(uId)) {
                cStats.activePersonnelMap.set(uId, {
                    userId: uId,
                    name: userObj.name || fallbackName || "Staff Member",
                    email: userObj.email || "—",
                    phone: userObj.phone || userObj.mobNum || "—",
                    role: userObj.role || "Executive",
                    designation: userObj.designation?.designationName || userObj.role || "Executive",
                    profilePicture: userObj.profilePicture || null,
                    activitiesCount: 0,
                    completedVisits: 0,
                    leadsCount: 0
                });
            }
            const sObj = cStats.activePersonnelMap.get(uId);
            sObj.activitiesCount += 1;
            if (isCompleted) sObj.completedVisits += 1;
            sObj.leadsCount += (parseFloat(recLeads) || 0);
        };

        // Parse planner records and aggregate stats strictly under Master Data Centres
        plannerRecords.forEach(rec => {
            const activityType = (rec.type || "School Visit").trim();
            if (!isActivityTypeMatched(activityType)) return;

            const activityPurpose = (rec.activityPurpose || "").trim();
            if (!isActivityPurposeMatched(activityPurpose)) return;

            const userCentres = rec.user?.centres || [];
            let cInput = rec.schoolRef?.centerName || rec.locationName;
            const targetMasterName = resolveToMasterCentreName(cInput, userCentres);

            const mKey = String(targetMasterName).toLowerCase();
            const cStats = masterCentreStatsMap.get(mKey);
            if (!cStats) return;

            const isCompleted = rec.status === "Approved" || rec.photo || (rec.photos && rec.photos.length > 0);
            cStats.totalActivities += 1;
            cStats.activityBreakdown[activityType] = (cStats.activityBreakdown[activityType] || 0) + 1;
            if (activityPurpose) {
                cStats.purposeBreakdown[activityPurpose] = (cStats.purposeBreakdown[activityPurpose] || 0) + 1;
            }

            if (rec.user) {
                trackStaffPerformance(cStats, rec.user, rec.owner || "Marketing Executive", rec.leads, isCompleted);
            }

            if (isCompleted) {
                cStats.completedVisits += 1;
            }

            const schoolName = rec.institution || rec.schoolRef?.schoolName || rec.locationName;
            const staffName = rec.owner || rec.user?.name || "Marketing Executive";

            const visitEntry = {
                id: rec._id,
                date: rec.date,
                staffName: staffName,
                institution: schoolName || "Field Activity",
                type: activityType,
                activityPurpose: activityPurpose,
                planTime: rec.plan || "",
                actualTime: rec.actual || "",
                status: rec.status || "Pending",
                leads: rec.leads || "0",
                notes: rec.notes || rec.remarks || "",
                locationName: cStats.centreName,
                latitude: rec.latitude,
                longitude: rec.longitude,
                photos: rec.photos && rec.photos.length > 0 ? rec.photos : (rec.photo ? [rec.photo] : [])
            };

            if (schoolName && schoolName.trim()) {
                const cleanSName = schoolName.trim();
                const sKey = cleanSName.toLowerCase();
                
                if (!cStats.schoolsMap.has(sKey)) {
                    cStats.schoolsMap.set(sKey, {
                        schoolName: cleanSName,
                        centerName: cStats.centreName,
                        tier: rec.schoolRef?.tier || "Tier A",
                        status: rec.schoolStatus || rec.schoolRef?.status || "Visited",
                        visitCount: 0,
                        leadsCount: 0,
                        lastVisitDate: null,
                        lastNotes: "",
                        schoolVisits: []
                    });
                }

                const sEntry = cStats.schoolsMap.get(sKey);
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

            cStats.totalVisits += 1;
            cStats.totalLeads += (parseFloat(rec.leads) || 0);
            cStats.totalHotLeads += (parseFloat(rec.expectedHotLeads) || 0);

            const hasPhoto = rec.photo || (rec.photos && rec.photos.length > 0);
            if (hasPhoto) {
                cStats.photosCount += (rec.photos ? rec.photos.length : 1);
            }

            if (!cStats.lastActivityDate || rec.date > cStats.lastActivityDate) {
                cStats.lastActivityDate = rec.date;
            }

            cStats.activityLogs.push(visitEntry);
        });

        // Parse assigned task records strictly under Master Data Centres
        assignedTasks.forEach(task => {
            if (!isActivityTypeMatched("Assigned Task") && !isActivityTypeMatched(task.taskType || "Task")) {
                return;
            }

            const taskPurpose = (task.activityPurpose || "").trim();
            if (!isActivityPurposeMatched(taskPurpose)) {
                return;
            }

            const userCentres = task.assignedTo?.centres || [];
            const targetMasterName = resolveToMasterCentreName(task.centreName, userCentres);

            const mKey = String(targetMasterName).toLowerCase();
            const cStats = masterCentreStatsMap.get(mKey);
            if (!cStats) return;

            const isCompleted = task.status === "Approved" || task.status === "Completed";
            const taskDate = task.planDate ? new Date(task.planDate).toISOString().split('T')[0] : "";
            cStats.totalActivities += 1;
            cStats.activityBreakdown["Assigned Task"] = (cStats.activityBreakdown["Assigned Task"] || 0) + 1;
            if (taskPurpose) {
                cStats.purposeBreakdown[taskPurpose] = (cStats.purposeBreakdown[taskPurpose] || 0) + 1;
            }

            if (task.assignedTo) {
                trackStaffPerformance(cStats, task.assignedTo, task.assignedToName || "Assigned Executive", 0, isCompleted);
            }

            const staffName = task.assignedToName || task.assignedTo?.name || "Assigned Executive";

            const visitEntry = {
                id: task._id,
                date: taskDate,
                staffName: staffName,
                institution: task.schoolName || "Assigned School Task",
                type: "Assigned Task",
                activityPurpose: taskPurpose,
                planTime: "",
                actualTime: "",
                status: task.status || "Pending",
                leads: "0",
                notes: `Task assigned by ${task.assignedByName || "Admin"}`,
                locationName: cStats.centreName,
                photos: []
            };

            if (task.schoolName && task.schoolName.trim()) {
                const cleanSName = task.schoolName.trim();
                const sKey = cleanSName.toLowerCase();

                if (!cStats.schoolsMap.has(sKey)) {
                    cStats.schoolsMap.set(sKey, {
                        schoolName: cleanSName,
                        centerName: cStats.centreName,
                        tier: task.schoolTier || "Tier A",
                        status: task.schoolStatus || "Assigned Task",
                        visitCount: 0,
                        leadsCount: 0,
                        lastVisitDate: null,
                        lastNotes: `Task assigned by ${task.assignedByName || "Admin"}`,
                        schoolVisits: []
                    });
                }

                const sEntry = cStats.schoolsMap.get(sKey);
                sEntry.visitCount += 1;
                sEntry.schoolVisits.push(visitEntry);
                if (taskDate && (!sEntry.lastVisitDate || taskDate > sEntry.lastVisitDate)) {
                    sEntry.lastVisitDate = taskDate;
                }
            }

            if (isCompleted) {
                cStats.completedVisits += 1;
            }

            if (taskDate && (!cStats.lastActivityDate || taskDate > cStats.lastActivityDate)) {
                cStats.lastActivityDate = taskDate;
            }

            cStats.activityLogs.push(visitEntry);
        });

        // Fetch detailed lead entries from LeadManagement
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

        const centreLeadsMap = new Map();
        leadDocs.forEach(l => {
            const targetMasterName = resolveToMasterCentreName(l.centre);
            const cKey = String(targetMasterName).toLowerCase();
            if (!centreLeadsMap.has(cKey)) {
                centreLeadsMap.set(cKey, []);
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

            centreLeadsMap.get(cKey).push({
                id: l._id,
                name: l.name || "N/A",
                phone: l.phoneNumber || l.secondPhoneNumber || "N/A",
                email: l.email || "N/A",
                schoolName: l.schoolName || "N/A",
                className: l.className?.name || "N/A",
                course: l.course?.courseName || l.courseText || "N/A",
                centre: targetMasterName,
                leadType: l.leadType || "NEUTRAL LEAD",
                source: l.source || "Field Marketing",
                createdAt: l.createdAt ? new Date(l.createdAt).toISOString().split('T')[0] : "",
                admissionStatus,
                admittedCourse,
                downPaymentPaid
            });
        });

        // Convert Map to array and compute metrics per Master Data Centre
        let centreStatsList = Array.from(masterCentreStatsMap.values()).map(c => {
            const cKey = String(c.centreName).toLowerCase();
            const detailedLeads = centreLeadsMap.get(cKey) || [];
            const finalTotalLeads = Math.max(c.totalLeads, detailedLeads.length);
            const detailedSchoolsList = Array.from(c.schoolsMap.values());
            
            const detailedActiveStaff = Array.from(c.activePersonnelMap.values()).sort(
                (a, b) => b.activitiesCount - a.activitiesCount || b.leadsCount - a.leadsCount
            );
            const activePersonnelCount = detailedActiveStaff.length;

            return {
                ...c,
                activePersonnelCount,
                detailedActiveStaff,
                totalLeads: finalTotalLeads,
                detailedLeads,
                detailedSchoolsList,
                uniqueSchoolsVisitedCount: detailedSchoolsList.length,
                performanceScore: calculateCentrePerformanceScore(c.totalActivities, c.completedVisits)
            };
        });

        // Filter by centre dropdown if specified
        if (centers && centers.trim() && centers !== "All") {
            const centerArr = centers.split(",").map(c => c.trim().toLowerCase()).filter(Boolean);
            centreStatsList = centreStatsList.filter(c => {
                const cNameLower = String(c.centreName).toLowerCase();
                return centerArr.some(sel => cNameLower.includes(sel) || sel.includes(cNameLower));
            });
        }

        // Filter by search query
        if (search && search.trim()) {
            const s = search.trim().toLowerCase();
            centreStatsList = centreStatsList.filter(c => 
                String(c.centreName).toLowerCase().includes(s) || 
                (c.enterCode && String(c.enterCode).toLowerCase().includes(s))
            );
        }

        // SORT BY TOTAL ACTIVITIES DESCENDING (Primary), then TOTAL LEADS DESCENDING
        centreStatsList.sort((a, b) => b.totalActivities - a.totalActivities || b.totalLeads - a.totalLeads || b.completedVisits - a.completedVisits);

        // Assign ranks based on total activities count
        centreStatsList.forEach((c, index) => {
            c.rank = index + 1;
        });

        // Compute overall team metrics
        const overallStats = {
            totalActivitiesDone: centreStatsList.reduce((sum, c) => sum + c.totalActivities, 0),
            totalFieldVisits: centreStatsList.reduce((sum, c) => sum + c.totalVisits, 0),
            activeCentresCount: centreStatsList.filter(c => c.totalActivities > 0).length,
            totalSchoolsVisited: new Set(centreStatsList.flatMap(c => c.detailedSchoolsList.map(s => s.schoolName.toLowerCase()))).size,
            totalLeadsCollected: centreStatsList.reduce((sum, c) => sum + c.totalLeads, 0),
            topPerformerCentre: centreStatsList.length > 0 && centreStatsList[0].totalActivities > 0 ? centreStatsList[0] : null
        };

        const totalItems = centreStatsList.length;
        const parsedLimit = limit === "all" ? (totalItems || 1) : (parseInt(limit) || 10);
        const parsedPage = parseInt(page) || 1;
        const totalPages = Math.max(1, Math.ceil(totalItems / parsedLimit));

        const paginatedList = centreStatsList.slice((parsedPage - 1) * parsedLimit, parsedPage * parsedLimit);

        const purposeSetLower = new Set(Array.from(availableActivityPurposesSet).map(p => p.toLowerCase().trim()));
        const knownPurposes = new Set([
            "pntse", "tie up", "mock", "leafletting", "seminar", "workshop",
            "pntse & mtp workshop", "mtp workshop", "school visit & tie up"
        ]);

        const filteredActivityTypes = Array.from(availableActivityTypesSet).filter(actType => {
            if (!actType) return false;
            const lower = actType.toLowerCase().trim();
            if (purposeSetLower.has(lower)) return false;
            if (knownPurposes.has(lower)) return false;
            return true;
        });

        return res.status(200).json({
            success: true,
            overallStats,
            leaderboard: centreStatsList.slice(0, 3),
            centrePerformance: paginatedList,
            totalItems,
            totalPages,
            currentPage: parsedPage,
            limit: parsedLimit,
            availableActivityTypes: filteredActivityTypes,
            availableActivityPurposes: Array.from(availableActivityPurposesSet)
        });

    } catch (error) {
        console.error("Get Centre Performance Error:", error);
        return res.status(500).json({ success: false, message: "Server error", error: error.message });
    }
};

const calculateCentrePerformanceScore = (totalActivities, completedVisits) => {
    if (totalActivities === 0) return "Inactive";
    if (totalActivities >= 30 || completedVisits >= 20) return "Highly Active";
    if (totalActivities >= 10) return "Moderately Active";
    return "Needs Improvement";
};
