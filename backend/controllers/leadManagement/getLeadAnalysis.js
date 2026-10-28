import LeadManagement from "../../models/LeadManagement.js";
import User from "../../models/User.js";
import { buildLeadQuery } from "../../utils/leadQueryHelper.js";
import { getMatchingLeadIds } from "../../utils/leadStudentMatcher.js";

/**
 * Helper to parse various duration formats into total seconds.
 * Supports "MM:SS", "HH:MM:SS", numeric seconds, or numbers.
 */
const parseDurationToSeconds = (duration) => {
    if (duration == null || duration === "") return 0;
    if (typeof duration === "number") return Math.max(0, Math.round(duration));
    const str = String(duration).trim();
    if (!str) return 0;
    if (/^\d+$/.test(str)) return Math.max(0, parseInt(str, 10));

    const parts = str.split(":").map(Number);
    if (parts.some(isNaN)) return 0;
    if (parts.length === 2) {
        return Math.max(0, parts[0] * 60 + parts[1]);
    } else if (parts.length === 3) {
        return Math.max(0, parts[0] * 3600 + parts[1] * 60 + parts[2]);
    }
    return 0;
};

/**
 * Format seconds into a friendly human-readable format "MM:SS" or "Xm Ys" / "Xh Ym"
 */
const formatSecondsToDuration = (totalSeconds) => {
    if (!totalSeconds || totalSeconds <= 0) return "00:00";
    const sec = Math.round(totalSeconds);
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const remainingSecs = sec % 60;

    if (hrs > 0) {
        return `${hrs}h ${mins}m ${remainingSecs}s`;
    }
    return `${String(mins).padStart(2, "0")}:${String(remainingSecs).padStart(2, "0")}`;
};

/**
 * GET /api/lead-management/stats/lead-analysis
 * 
 * Provides detailed multidimensional analysis for filtered leads:
 * 1. Average Call Duration & Duration Ranges Distribution
 * 2. Lead Source Distribution
 * 3. Remarks & Follow-up Feedback Distribution
 * 4. Follow-up Status & Frequency Distribution
 * 5. Conversion Pipeline & Admission Analysis
 */
export const getLeadAnalysis = async (req, res) => {
    try {
        // 1. Build query from request filters using centralized helper
        const baseQuery = await buildLeadQuery(req.query, req.user);
        let effectiveQuery = { ...baseQuery };

        // 2. Handle optional admissionSource filter
        const admissionSource = req.query.admissionSource;
        if (admissionSource) {
            const { matchingAdmittedIds, matchingPreEnrolledIds } = await getMatchingLeadIds(effectiveQuery);
            if (admissionSource === "already_enrolled") {
                effectiveQuery.$and = effectiveQuery.$and || [];
                effectiveQuery.$and.push({ _id: { $in: matchingPreEnrolledIds || [] } });
            } else if (admissionSource === "uploaded_admissions" || admissionSource === "uploaded") {
                effectiveQuery.$and = effectiveQuery.$and || [];
                effectiveQuery.$and.push({ _id: { $in: matchingAdmittedIds || [] } });
                effectiveQuery.$and.push({
                    $or: [
                        { isBulkUpload: true },
                        { campaign: { $exists: true, $ne: null } },
                        { campaignFrom: { $exists: true, $ne: null, $ne: "" } },
                        { source: { $regex: /bulk|import|excel|campaign|facebook|meta|google|ad|online|landing|upload/i } }
                    ]
                });
            } else if (admissionSource === "manual_admissions" || admissionSource === "manual") {
                effectiveQuery.$and = effectiveQuery.$and || [];
                effectiveQuery.$and.push({ _id: { $in: matchingAdmittedIds || [] } });
                effectiveQuery.$and.push({
                    $and: [
                        { $or: [{ isBulkUpload: false }, { isBulkUpload: { $exists: false } }] },
                        { $or: [{ campaign: { $exists: false } }, { campaign: null }] },
                        { $or: [{ campaignFrom: { $exists: false } }, { campaignFrom: null }, { campaignFrom: "" }] },
                        { $or: [{ source: { $exists: false } }, { source: null }, { source: { $not: { $regex: /bulk|import|excel|campaign|facebook|meta|google|ad|online|landing|upload/i } } }] }
                    ]
                });
            }
        }

        // Total count of matching leads
        const totalLeads = await LeadManagement.countDocuments(effectiveQuery);

        if (totalLeads === 0) {
            return res.status(200).json({
                success: true,
                totalLeads: 0,
                summary: {
                    totalLeads: 0,
                    admittedCount: 0,
                    counselledCount: 0,
                    walkInCount: 0,
                    conversionRate: 0,
                    totalFollowUps: 0,
                    contactedCount: 0,
                    contactRate: 0,
                    avgCallDurationSeconds: 0,
                    avgCallDurationFormatted: "00:00",
                    topSource: "N/A"
                },
                callDurationAnalysis: {
                    totalCallsLogged: 0,
                    callsWithDuration: 0,
                    totalDurationSeconds: 0,
                    avgCallDurationSeconds: 0,
                    formattedAvgDuration: "00:00",
                    formattedTotalDuration: "00:00",
                    durationRanges: [],
                    agentBreakdown: [],
                    leadTypeBreakdown: []
                },
                leadSourceAnalysis: {
                    totalSources: 0,
                    sources: []
                },
                remarksAnalysis: {
                    totalFeedbacks: 0,
                    feedbacks: [],
                    categories: []
                },
                followUpAnalysis: {
                    totalFollowUps: 0,
                    leadsWithFollowUp: 0,
                    leadsWithoutFollowUp: 0,
                    contactedRate: 0,
                    avgFollowUpsPerLead: 0,
                    statusBreakdown: [],
                    frequencyBreakdown: []
                },
                conversionAnalysis: {
                    totalLeads: 0,
                    admittedCount: 0,
                    counselledCount: 0,
                    walkInCount: 0,
                    conversionRate: 0,
                    counsellingConversionRate: 0,
                    statusBreakdown: [],
                    leadTypeConversion: []
                }
            });
        }

        // ─────────────────────────────────────────────────────────────
        // 3. DIMENSION 1: CALL DURATION ANALYSIS
        // ─────────────────────────────────────────────────────────────
        const callDurationRaw = await LeadManagement.aggregate([
            { $match: effectiveQuery },
            { $unwind: "$followUps" },
            {
                $project: {
                    callDuration: "$followUps.callDuration",
                    callStartTime: "$followUps.callStartTime",
                    callEndTime: "$followUps.callEndTime",
                    agent: "$followUps.updatedBy",
                    leadResponsibility: "$leadResponsibility",
                    leadType: "$leadType"
                }
            }
        ]);

        let totalDurationSeconds = 0;
        let callsWithDurationCount = 0;
        const totalCallsLogged = callDurationRaw.length;

        // Duration Range Buckets
        const durationRangesMap = {
            "under_30s": { name: "< 30s (Quick / Dropped)", count: 0, totalSec: 0, color: "#94a3b8" },
            "30s_to_1m": { name: "30s - 1 min (Brief Discussion)", count: 0, totalSec: 0, color: "#38bdf8" },
            "1m_to_3m": { name: "1 - 3 mins (Standard Follow-up)", count: 0, totalSec: 0, color: "#06b6d4" },
            "3m_to_5m": { name: "3 - 5 mins (Detailed Counselling)", count: 0, totalSec: 0, color: "#10b981" },
            "over_5m": { name: "> 5 mins (Comprehensive Call)", count: 0, totalSec: 0, color: "#8b5cf6" },
            "unlogged": { name: "Duration Not Logged", count: 0, totalSec: 0, color: "#64748b" }
        };

        const agentDurationMap = {};
        const leadTypeDurationMap = {
            "HOT LEAD": { count: 0, totalSec: 0 },
            "WARM LEAD": { count: 0, totalSec: 0 },
            "COLD LEAD": { count: 0, totalSec: 0 },
            "NEUTRAL LEAD": { count: 0, totalSec: 0 },
            "INVALID LEAD": { count: 0, totalSec: 0 }
        };

        for (const item of callDurationRaw) {
            let sec = parseDurationToSeconds(item.callDuration);
            // Fallback to start and end times if callDuration string was missing
            if (sec === 0 && item.callStartTime && item.callEndTime) {
                const diffMs = new Date(item.callEndTime).getTime() - new Date(item.callStartTime).getTime();
                if (diffMs > 0) sec = Math.round(diffMs / 1000);
            }

            const agentName = item.agent || item.leadResponsibility || "Unknown Agent";
            if (!agentDurationMap[agentName]) {
                agentDurationMap[agentName] = { agent: agentName, totalCalls: 0, durationCalls: 0, totalSec: 0 };
            }
            agentDurationMap[agentName].totalCalls++;

            const lType = item.leadType || "NEUTRAL LEAD";
            if (!leadTypeDurationMap[lType]) {
                leadTypeDurationMap[lType] = { count: 0, totalSec: 0 };
            }

            if (sec > 0) {
                totalDurationSeconds += sec;
                callsWithDurationCount++;
                agentDurationMap[agentName].durationCalls++;
                agentDurationMap[agentName].totalSec += sec;
                leadTypeDurationMap[lType].count++;
                leadTypeDurationMap[lType].totalSec += sec;

                if (sec < 30) {
                    durationRangesMap["under_30s"].count++;
                    durationRangesMap["under_30s"].totalSec += sec;
                } else if (sec < 60) {
                    durationRangesMap["30s_to_1m"].count++;
                    durationRangesMap["30s_to_1m"].totalSec += sec;
                } else if (sec < 180) {
                    durationRangesMap["1m_to_3m"].count++;
                    durationRangesMap["1m_to_3m"].totalSec += sec;
                } else if (sec < 300) {
                    durationRangesMap["3m_to_5m"].count++;
                    durationRangesMap["3m_to_5m"].totalSec += sec;
                } else {
                    durationRangesMap["over_5m"].count++;
                    durationRangesMap["over_5m"].totalSec += sec;
                }
            } else {
                durationRangesMap["unlogged"].count++;
            }
        }

        const avgCallDurationSeconds = callsWithDurationCount > 0
            ? Math.round(totalDurationSeconds / callsWithDurationCount)
            : 0;

        const durationRanges = Object.values(durationRangesMap)
            .filter(r => r.count > 0)
            .map(r => ({
                name: r.name,
                value: r.count,
                totalSec: r.totalSec,
                share: totalCallsLogged > 0 ? Number(((r.count / totalCallsLogged) * 100).toFixed(1)) : 0,
                color: r.color,
                formattedAvg: r.count > 0 ? formatSecondsToDuration(r.totalSec / r.count) : "00:00"
            }));

        const agentBreakdown = Object.values(agentDurationMap)
            .map(a => ({
                agent: a.agent,
                totalCalls: a.totalCalls,
                durationCalls: a.durationCalls,
                totalDurationFormatted: formatSecondsToDuration(a.totalSec),
                avgDurationSeconds: a.durationCalls > 0 ? Math.round(a.totalSec / a.durationCalls) : 0,
                avgDurationFormatted: a.durationCalls > 0 ? formatSecondsToDuration(a.totalSec / a.durationCalls) : "00:00"
            }))
            .sort((a, b) => b.totalCalls - a.totalCalls)
            .slice(0, 15);

        const leadTypeBreakdown = Object.entries(leadTypeDurationMap)
            .filter(([, v]) => v.count > 0)
            .map(([type, v]) => ({
                leadType: type,
                callsCount: v.count,
                avgDurationSeconds: Math.round(v.totalSec / v.count),
                avgDurationFormatted: formatSecondsToDuration(v.totalSec / v.count)
            }));

        // ─────────────────────────────────────────────────────────────
        // 4. DIMENSION 2: LEAD SOURCE DISTRIBUTION
        // ─────────────────────────────────────────────────────────────
        const sourceAgg = await LeadManagement.aggregate([
            { $match: effectiveQuery },
            {
                $group: {
                    _id: { $ifNull: ["$source", "Direct / Not Specified"] },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const SOURCE_COLORS = [
            "#06b6d4", "#10b981", "#3b82f6", "#f59e0b",
            "#ec4899", "#8b5cf6", "#f97316", "#14b8a6",
            "#6366f1", "#84cc16", "#e11d48", "#0ea5e9",
            "#d946ef", "#eab308", "#22c55e", "#a855f7"
        ];

        const sources = sourceAgg.map((item, idx) => {
            const rawName = String(item._id).trim() || "Direct / Not Specified";
            const share = totalLeads > 0 ? Number(((item.count / totalLeads) * 100).toFixed(1)) : 0;
            return {
                name: rawName,
                value: item.count,
                share,
                color: SOURCE_COLORS[idx % SOURCE_COLORS.length]
            };
        });

        const topSource = sources.length > 0 ? sources[0].name : "N/A";

        // ─────────────────────────────────────────────────────────────
        // 5. DIMENSION 3: REMARKS & FOLLOW-UP FEEDBACK ANALYSIS
        // ─────────────────────────────────────────────────────────────
        const feedbackAgg = await LeadManagement.aggregate([
            { $match: effectiveQuery },
            { $unwind: "$followUps" },
            {
                $group: {
                    _id: { $ifNull: ["$followUps.feedback", "No Feedback"] },
                    count: { $sum: 1 }
                }
            },
            { $sort: { count: -1 } }
        ]);

        const FEEDBACK_COLORS = {
            "Interested": "#10b981",
            "Call back later": "#06b6d4",
            "Will visit centre": "#3b82f6",
            "Asked for details": "#8b5cf6",
            "Busy": "#f59e0b",
            "Price Issue": "#f97316",
            "Not Interested": "#e11d48",
            "Wrong Number": "#ef4444",
            "Enrolled elsewhere": "#ec4899",
            "Others": "#64748b"
        };

        const totalFeedbacks = feedbackAgg.reduce((sum, item) => sum + item.count, 0);

        const feedbacks = feedbackAgg.map((item, idx) => {
            const name = String(item._id).trim() || "No Feedback";
            const color = FEEDBACK_COLORS[name] || SOURCE_COLORS[idx % SOURCE_COLORS.length];
            const share = totalFeedbacks > 0 ? Number(((item.count / totalFeedbacks) * 100).toFixed(1)) : 0;
            return {
                name,
                value: item.count,
                share,
                color
            };
        });

        // Feedback Sentiment Clusters
        const sentimentMap = {
            "High Intent (Positive)": { count: 0, color: "#10b981" },
            "Follow-up / In Progress": { count: 0, color: "#06b6d4" },
            "Fee / Centre Objections": { count: 0, color: "#f97316" },
            "Lost / Inactive": { count: 0, color: "#ef4444" }
        };

        feedbacks.forEach(f => {
            const n = f.name.toLowerCase();
            if (n.includes("interested") || n.includes("visit") || n.includes("details")) {
                sentimentMap["High Intent (Positive)"].count += f.value;
            } else if (n.includes("callback") || n.includes("busy") || n.includes("call back")) {
                sentimentMap["Follow-up / In Progress"].count += f.value;
            } else if (n.includes("price") || n.includes("fee") || n.includes("distance") || n.includes("location")) {
                sentimentMap["Fee / Centre Objections"].count += f.value;
            } else {
                sentimentMap["Lost / Inactive"].count += f.value;
            }
        });

        const feedbackCategories = Object.entries(sentimentMap)
            .filter(([, v]) => v.count > 0)
            .map(([category, v]) => ({
                name: category,
                value: v.count,
                share: totalFeedbacks > 0 ? Number(((v.count / totalFeedbacks) * 100).toFixed(1)) : 0,
                color: v.color
            }));

        // ─────────────────────────────────────────────────────────────
        // 6. DIMENSION 4: FOLLOW-UP ANALYSIS
        // ─────────────────────────────────────────────────────────────
        const followUpDetails = await LeadManagement.aggregate([
            { $match: effectiveQuery },
            {
                $project: {
                    followUpsCount: { $size: { $ifNull: ["$followUps", []] } },
                    isWalkIn: { $ifNull: ["$isWalkIn", false] },
                    source: "$source"
                }
            }
        ]);

        let leadsWithFollowUp = 0;
        let leadsWithoutFollowUp = 0;
        let walkInCount = 0;
        let totalFollowUpsCount = 0;

        const frequencyMap = {
            "0 Follow-ups (Pending)": { count: 0, color: "#ef4444" },
            "1 Follow-up": { count: 0, color: "#f59e0b" },
            "2 Follow-ups": { count: 0, color: "#38bdf8" },
            "3 - 5 Follow-ups": { count: 0, color: "#06b6d4" },
            "5+ Follow-ups": { count: 0, color: "#10b981" }
        };

        for (const lead of followUpDetails) {
            const count = lead.followUpsCount || 0;
            totalFollowUpsCount += count;

            if (count > 0) {
                leadsWithFollowUp++;
            } else {
                leadsWithoutFollowUp++;
            }

            const isWalkInSource = typeof lead.source === "string" && /^walk[- ]?in$/i.test(lead.source);
            if (lead.isWalkIn || isWalkInSource) {
                walkInCount++;
            }

            if (count === 0) {
                frequencyMap["0 Follow-ups (Pending)"].count++;
            } else if (count === 1) {
                frequencyMap["1 Follow-up"].count++;
            } else if (count === 2) {
                frequencyMap["2 Follow-ups"].count++;
            } else if (count <= 5) {
                frequencyMap["3 - 5 Follow-ups"].count++;
            } else {
                frequencyMap["5+ Follow-ups"].count++;
            }
        }

        const contactedRate = totalLeads > 0 ? Number(((leadsWithFollowUp / totalLeads) * 100).toFixed(1)) : 0;
        const avgFollowUpsPerLead = totalLeads > 0 ? Number((totalFollowUpsCount / totalLeads).toFixed(1)) : 0;

        const followUpStatusBreakdown = [
            {
                name: "Contacted Leads",
                value: leadsWithFollowUp,
                share: totalLeads > 0 ? Number(((leadsWithFollowUp / totalLeads) * 100).toFixed(1)) : 0,
                color: "#10b981"
            },
            {
                name: "Pending / Untouched",
                value: leadsWithoutFollowUp,
                share: totalLeads > 0 ? Number(((leadsWithoutFollowUp / totalLeads) * 100).toFixed(1)) : 0,
                color: "#f43f5e"
            },
            {
                name: "Walk-in Leads",
                value: walkInCount,
                share: totalLeads > 0 ? Number(((walkInCount / totalLeads) * 100).toFixed(1)) : 0,
                color: "#8b5cf6"
            }
        ].filter(item => item.value > 0);

        const followUpFrequencyBreakdown = Object.entries(frequencyMap)
            .filter(([, v]) => v.count > 0)
            .map(([name, v]) => ({
                name,
                value: v.count,
                share: totalLeads > 0 ? Number(((v.count / totalLeads) * 100).toFixed(1)) : 0,
                color: v.color
            }));

        // ─────────────────────────────────────────────────────────────
        // 7. DIMENSION 5: CONVERSION ANALYSIS
        // ─────────────────────────────────────────────────────────────
        const { matchingAdmittedIds, matchingPreEnrolledIds, matchingCounsellingIds } = await getMatchingLeadIds(effectiveQuery);

        const admittedCount = matchingAdmittedIds.length;
        const counselledCount = matchingCounsellingIds.length;
        const preEnrolledCount = matchingPreEnrolledIds.length;
        const conversionRate = totalLeads > 0 ? Number(((admittedCount / totalLeads) * 100).toFixed(1)) : 0;
        const counsellingConversionRate = counselledCount > 0 ? Number(((admittedCount / counselledCount) * 100).toFixed(1)) : 0;

        // Pipeline Distribution
        const inPipelineCount = Math.max(0, counselledCount - admittedCount);
        const activeFollowUpOnly = Math.max(0, leadsWithFollowUp - admittedCount - inPipelineCount);
        const unreachedCount = Math.max(0, totalLeads - admittedCount - inPipelineCount - activeFollowUpOnly);

        const conversionStatusBreakdown = [
            {
                name: "Admitted (Converted)",
                value: admittedCount,
                share: totalLeads > 0 ? Number(((admittedCount / totalLeads) * 100).toFixed(1)) : 0,
                color: "#10b981"
            },
            {
                name: "Counselled (In Pipeline)",
                value: inPipelineCount,
                share: totalLeads > 0 ? Number(((inPipelineCount / totalLeads) * 100).toFixed(1)) : 0,
                color: "#3b82f6"
            },
            {
                name: "Walk-in Only",
                value: walkInCount,
                share: totalLeads > 0 ? Number(((walkInCount / totalLeads) * 100).toFixed(1)) : 0,
                color: "#f59e0b"
            },
            {
                name: "Follow-up In Progress",
                value: activeFollowUpOnly,
                share: totalLeads > 0 ? Number(((activeFollowUpOnly / totalLeads) * 100).toFixed(1)) : 0,
                color: "#06b6d4"
            },
            {
                name: "Pending / Untouched",
                value: unreachedCount,
                share: totalLeads > 0 ? Number(((unreachedCount / totalLeads) * 100).toFixed(1)) : 0,
                color: "#64748b"
            }
        ].filter(item => item.value > 0);

        // Lead Type Conversion Breakdown
        const leadTypeConversionAgg = await LeadManagement.aggregate([
            { $match: { ...effectiveQuery, _id: { $in: matchingAdmittedIds } } },
            { $group: { _id: "$leadType", admittedCount: { $sum: 1 } } }
        ]);

        const leadTypeTotalAgg = await LeadManagement.aggregate([
            { $match: effectiveQuery },
            { $group: { _id: "$leadType", totalCount: { $sum: 1 } } }
        ]);

        const leadTypeConversion = leadTypeTotalAgg.map(item => {
            const type = item._id || "NEUTRAL LEAD";
            const admittedItem = leadTypeConversionAgg.find(a => a._id === item._id);
            const adm = admittedItem ? admittedItem.admittedCount : 0;
            const rate = item.totalCount > 0 ? Number(((adm / item.totalCount) * 100).toFixed(1)) : 0;
            return {
                leadType: type,
                total: item.totalCount,
                admitted: adm,
                conversionRate: rate
            };
        }).sort((a, b) => b.total - a.total);

        // ─────────────────────────────────────────────────────────────
        // 8. FINAL PAYLOAD RETURN
        // ─────────────────────────────────────────────────────────────
        res.status(200).json({
            success: true,
            totalLeads,
            summary: {
                totalLeads,
                admittedCount,
                counselledCount,
                preEnrolledCount,
                walkInCount,
                conversionRate,
                counsellingConversionRate,
                totalFollowUps: totalFollowUpsCount,
                contactedCount: leadsWithFollowUp,
                contactRate: contactedRate,
                avgCallDurationSeconds,
                avgCallDurationFormatted: formatSecondsToDuration(avgCallDurationSeconds),
                topSource
            },
            callDurationAnalysis: {
                totalCallsLogged,
                callsWithDuration: callsWithDurationCount,
                totalDurationSeconds,
                avgCallDurationSeconds,
                formattedAvgDuration: formatSecondsToDuration(avgCallDurationSeconds),
                formattedTotalDuration: formatSecondsToDuration(totalDurationSeconds),
                durationRanges,
                agentBreakdown,
                leadTypeBreakdown
            },
            leadSourceAnalysis: {
                totalSources: sources.length,
                sources
            },
            remarksAnalysis: {
                totalFeedbacks,
                feedbacks,
                categories: feedbackCategories
            },
            followUpAnalysis: {
                totalFollowUps: totalFollowUpsCount,
                leadsWithFollowUp,
                leadsWithoutFollowUp,
                contactedRate,
                avgFollowUpsPerLead,
                statusBreakdown: followUpStatusBreakdown,
                frequencyBreakdown: followUpFrequencyBreakdown
            },
            conversionAnalysis: {
                totalLeads,
                admittedCount,
                counselledCount,
                walkInCount,
                conversionRate,
                counsellingConversionRate,
                statusBreakdown: conversionStatusBreakdown,
                leadTypeConversion
            }
        });

    } catch (err) {
        console.error("Lead analysis API error:", err);
        res.status(500).json({
            success: false,
            message: "Failed to generate lead analysis",
            error: err.message
        });
    }
};
