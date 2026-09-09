import Student from "../models/Students.js";
import Admission from "../models/Admission/Admission.js";
import BoardCourseAdmission from "../models/Admission/BoardCourseAdmission.js";

/**
 * Calculates the active carry forward balance for a student.
 * If a previous course is deactivated (admissionStatus: 'INACTIVE', or status: 'DEACTIVATED'/'INACTIVE'),
 * that course's remaining/carried-forward balance is NOT added during the next course admission.
 * If all previous courses that contributed carry-forward balance are deactivated, returns 0 and updates student.
 */
export const getActiveCarryForwardBalance = async (studentId) => {
    if (!studentId) return 0;

    const student = await Student.findById(studentId).lean();
    if (!student || !student.carryForwardBalance || student.carryForwardBalance <= 0) {
        return 0;
    }

    const [admissions, boardAdmissions] = await Promise.all([
        Admission.find({ student: studentId }).lean(),
        BoardCourseAdmission.find({ studentId: studentId }).lean()
    ]);

    const isNormalDeactivated = (adm) => {
        return adm.admissionStatus === 'INACTIVE' || 
               adm.status === 'DEACTIVATED' || 
               adm.status === 'INACTIVE';
    };

    const isBoardDeactivated = (badm) => {
        return badm.enrolledStudentsStatus === 'INACTIVE' || 
               badm.status === 'INACTIVE' || 
               badm.status === 'DEACTIVATED';
    };

    const activeNormalAdmissions = (admissions || []).filter(a => !isNormalDeactivated(a));
    const inactiveNormalAdmissions = (admissions || []).filter(a => isNormalDeactivated(a));

    const activeBoardAdmissions = (boardAdmissions || []).filter(b => !isBoardDeactivated(b));
    const inactiveBoardAdmissions = (boardAdmissions || []).filter(b => isBoardDeactivated(b));

    // If ALL admissions (normal & board) are deactivated, no balance can be carried forward
    if (activeNormalAdmissions.length === 0 && activeBoardAdmissions.length === 0) {
        await Student.findByIdAndUpdate(studentId, {
            $set: { carryForwardBalance: 0, markedForCarryForward: false }
        });
        return 0;
    }

    // Check how much carry forward came from inactive normal admissions
    let inactiveCfTotal = 0;
    inactiveNormalAdmissions.forEach(adm => {
        (adm.paymentBreakdown || []).forEach(inst => {
            if (inst.remarks) {
                const match = inst.remarks.match(/Carried Forward Arrears:\s*₹?\s*([0-9.]+)/i);
                if (match && match[1]) {
                    inactiveCfTotal += parseFloat(match[1]);
                }
            }
        });
    });

    // If inactive normal admissions had carry forward arrears
    if (inactiveCfTotal > 0) {
        const activeBalance = Math.max(0, parseFloat((student.carryForwardBalance - inactiveCfTotal).toFixed(3)));
        await Student.findByIdAndUpdate(studentId, {
            $set: { 
                carryForwardBalance: activeBalance, 
                markedForCarryForward: activeBalance > 0 
            }
        });
        return activeBalance;
    }

    // If all normal admissions are inactive, but student has active board course(s)
    // Note: Carry forward arrears only originate from normal admissions.
    // If all normal admissions are deactivated, the CF balance from them should be 0.
    if (activeNormalAdmissions.length === 0 && inactiveNormalAdmissions.length > 0) {
        await Student.findByIdAndUpdate(studentId, {
            $set: { carryForwardBalance: 0, markedForCarryForward: false }
        });
        return 0;
    }

    // Check if active admissions specifically have CF remarks
    let activeCfTotal = 0;
    activeNormalAdmissions.forEach(adm => {
        (adm.paymentBreakdown || []).forEach(inst => {
            if (inst.remarks) {
                const match = inst.remarks.match(/Carried Forward Arrears:\s*₹?\s*([0-9.]+)/i);
                if (match && match[1]) {
                    activeCfTotal += parseFloat(match[1]);
                }
            }
        });
    });

    if (activeCfTotal > 0) {
        const activeBalance = Math.min(student.carryForwardBalance, parseFloat(activeCfTotal.toFixed(3)));
        if (activeBalance !== student.carryForwardBalance) {
            await Student.findByIdAndUpdate(studentId, {
                $set: { 
                    carryForwardBalance: activeBalance, 
                    markedForCarryForward: activeBalance > 0 
                }
            });
        }
        return activeBalance;
    }

    return student.carryForwardBalance;
};
