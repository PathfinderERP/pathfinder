// Granular Permissions Configuration
// Defines all modules, sections, and available operations

export const PERMISSION_MODULES = {
    sales: {
        label: "Sales Portal",
        sections: {
            admissionReport: {
                label: "Admission Report",
                operations: ["create", "edit", "delete"]
            },
            centreRank: {
                label: "Centre Rank",
                operations: ["create", "edit", "delete"]
            },
            centreTarget: {
                label: "Centre Target",
                operations: ["create", "edit", "delete"]
            },
            courseReport: {
                label: "Course Report",
                operations: ["create", "edit", "delete"]
            },
            discountReport: {
                label: "Discount Report",
                operations: ["create", "edit", "delete"]
            },
            targetAchievementReport: {
                label: "Target Achievement Report",
                operations: ["create", "edit", "delete"]
            },
            transactionReport: {
                label: "Transaction Report",
                operations: ["create", "edit", "delete"]
            },
            weeklyTarget: {
                label: "Weekly & Weekend Target",
                operations: ["create", "edit", "delete"]
            },
            boardReport: {
                label: "Board Analysis Report",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    ceoControlTower: {
        label: "CEO Control Tower",
        sections: {
            dashboard: {
                label: "Dashboard",
                operations: ["create", "edit", "delete"]
            },
            analytics: {
                label: "Analytics",
                operations: ["create", "edit", "delete"]
            },
            reports: {
                label: "Reports",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    admissions: {
        label: "Admissions",
        sections: {
            allLeads: {
                label: "All Leads",
                operations: ["create", "edit", "delete"]
            },
            enrolledStudents: {
                label: "Admissions",
                operations: ["create", "edit", "delete", "deactivate"]
            },
            // sectionAllotment: {
            //     label: "Section Allotment",
            //     operations: ["view", "edit"]
            // },
            // salesDashboard: {
            //     label: "Sales Dashboard",
            //     operations: ["create", "edit", "delete"]
            // },
            telecallingConsole: {
                label: "Telecalling Console",
                operations: ["view", "create", "edit", "delete"]
            },
            boardCourseAdmission: {
                label: "Board Course Admission",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    academics: {
        label: "Academics",
        sections: {
            courses: { label: "Courses", operations: ["create", "edit", "delete"] },
            classes: { label: "Classes", operations: ["create", "edit", "delete"] },
            students: { label: "Students", operations: ["create", "edit", "delete"] },
            teachers: { label: "Teachers", operations: ["create", "edit", "delete"] },

            // New Sections
            studentTeacherReview: { label: "Student Teacher Review", operations: ["create", "edit", "delete"] },
            // liveClassReview: { label: "Live Class Review", operations: ["create", "edit", "delete"] },
            // ccTeacherReview: { label: "CC Teacher Review", operations: ["create", "edit", "delete"] },
            hodList: { label: "HoD List", operations: ["create", "edit", "delete"] },
            // centreManagement: { label: "Centre Management", operations: ["create", "edit", "delete"] },
            // rmList: { label: "RM List", operations: ["create", "edit", "delete"] },
            // classCoordinator: { label: "Class Coordinator", operations: ["create", "edit", "delete"] },
            // mentalSessionTable: { label: "Mental Session Table", operations: ["create", "edit", "delete"] },
            classManagement: { label: "Class Management", operations: ["create", "edit", "delete"] },
            subjects: { label: "Subjects", operations: ["create", "edit", "delete"] },
            chapters: { label: "Chapters", operations: ["create", "edit", "delete"] },
            topics: { label: "Topics", operations: ["create", "edit", "delete"] },
            // sectionLeaderBoard: { label: "Section Leader Board", operations: ["create", "edit", "delete"] },
            // examLeaderBoard: { label: "Exam Leader Board", operations: ["create", "edit", "delete"] },
            upcomingClass: { label: "Upcoming Class", operations: ["create", "edit", "delete"] },
            ongoingClass: { label: "Ongoing Class", operations: ["create", "edit", "delete"] },
            previousClass: { label: "Previous Class", operations: ["create", "edit", "delete"] },
            teacherRoutine: { label: "Teacher Routine Schedule", operations: ["create", "edit", "delete"] }
        }
    },

    financeFees: {
        label: "Finance & Fees",
        sections: {
            feeManagement: {
                label: "Fee Management",
                operations: ["create", "edit", "delete"]
            },
            installmentPayment: {
                label: "Installment Payment",
                operations: ["create"]
            },
            feeDueList: {
                label: "Fee Due List",
                operations: ["create", "edit", "delete"]
            },
            chequeManagement: {
                label: "Cheque Management",
                operations: ["create", "edit", "delete"]
            },
            chequeDepositEntry: {
                label: "Cheque Deposit Entry",
                operations: ["create", "edit", "delete"]
            },
            cancelCheque: {
                label: "Cancel Cheque Payment",
                operations: ["create", "edit", "delete"]
            },
            // billGeneration: {
            //     label: "Bill Generation",
            //     operations: ["create", "edit", "delete"]
            // },
            // payments: {
            //     label: "Payments",
            //     operations: ["create", "edit", "delete"]
            // },
            // paymentReminders: {
            //     label: "Payment Reminders",
            //     operations: ["create", "edit", "delete"]
            // },
            cashReport: {
                label: "Cash Report",
                operations: ["create", "edit", "delete"]
            },
            cashTransfer: {
                label: "Cash Transfer",
                operations: ["create", "edit", "delete"]
            },
            cashReceive: {
                label: "Cash Received",
                operations: ["create", "edit", "delete"]
            },
            financialAnalysis: {
                label: "Financial Analysis",
                operations: ["create", "edit", "delete"]
            },
            // centerTagging: {
            //     label: "Center Tagging",
            //     operations: ["create", "edit", "delete"]
            // },
            // budget: {
            //     label: "Budget",
            //     operations: ["create", "edit", "delete"]
            // },
            // cashCentre: {
            //     label: "Cash Centre",
            //     operations: ["create", "edit", "delete"]
            // },
            partTimeTeachers: {
                label: "Part Time Teachers",
                operations: ["create", "edit", "delete"]
            },
            // financePerson: {
            //     label: "Finance Person",
            //     operations: ["create", "edit", "delete"]
            // },
            // vendorManagement: {
            //     label: "Vendor Management",
            //     operations: ["create", "edit", "delete"]
            // },
            payEmployee: {
                label: "Pay Employee",
                operations: ["create", "edit", "delete"]
            },
            paymentAnalysis: {
                label: "Payment Analysis",
                operations: ["create", "edit", "delete"]
            },
            // budgetAnalysis: {
            //     label: "Budget Analysis",
            //     operations: ["create", "edit", "delete"]
            // },
            expense: {
                label: "Expense",
                operations: ["create", "edit", "delete"]
            },
            addExpense: {
                label: "Add Expense",
                operations: ["create", "edit", "delete"]
            },
            transactionReport: {
                label: "Transaction List",
                operations: ["view", "create", "edit", "delete"]
            },
            financeExpenseCategory: {
                label: "Expense Category",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    hrManpower: {
        label: "HR & Manpower",
        sections: {
            employees: { label: "Employees", operations: ["create", "edit", "delete"] },
            attendance: { label: "Attendance", operations: ["create", "edit", "delete"] },
            holidayManagement: { label: "Holiday Management", operations: ["create", "edit", "delete"] },
            holidayList: { label: "Holiday List", operations: ["create", "edit", "delete"] },
            leaveType: { label: "Leaves Type", operations: ["create", "edit", "delete"] },
            leaveManagement: { label: "Leave Management", operations: ["create", "edit", "delete"] },
            leaveRequest: { label: "Leave Request", operations: ["create", "edit", "delete"] },
            regularizeTable: { label: "Regularize Table", operations: ["create", "edit", "delete"] },
            department: { label: "Department", operations: ["create", "edit", "delete"] },
            designation: { label: "Designation", operations: ["create", "edit", "delete"] },
            // center: { label: "Center Management", operations: ["create", "edit", "delete"] },
            // centerDetails: { label: "Center On/Off Details", operations: ["create", "edit", "delete"] },
            training: { label: "Training List", operations: ["create", "edit", "delete"] },
            posh: { label: "POSH Table", operations: ["create", "edit", "delete"] },
            upload: { label: "Upload File", operations: ["create", "edit", "delete"] },
            feedback: { label: "All Feedback", operations: ["create", "edit", "delete"] },
            reimbursement: { label: "Reimbursement List", operations: ["create", "edit", "delete"] },
            resign: { label: "Resign Request", operations: ["create", "edit", "delete"] },
            birthday: { label: "Birthday Lists", operations: ["create", "edit", "delete"] },
            // overview: { label: "Overview", operations: ["create", "edit", "delete"] },
            payroll: { label: "Payroll", operations: ["create", "edit", "delete"] },
            salaryExpense: { label: "Salary Expense", operations: ["create", "edit", "delete"] }
        }
    },
    employeeCenter: {
        label: "Employee Center",
        sections: {
            holidayList: {
                label: "Holiday List",
                operations: ["create", "edit", "delete"]
            },
            holidayCalendar: {
                label: "Holiday Calendar",
                operations: ["create", "edit", "delete"]
            },
            markAttendance: {
                label: "Mark Attendance",
                operations: ["create", "edit", "delete"]
            },
            leaveManagement: {
                label: "Leave Management",
                operations: ["create", "edit", "delete"]
            },
            regularization: {
                label: "Regularize Table",
                operations: ["create", "edit", "delete"]
            },
            profile: {
                label: "My Profile",
                operations: ["create", "edit", "delete"]
            },
            documents: {
                label: "Document Center",
                operations: ["create", "edit", "delete"]
            },
            training: {
                label: "Training Center",
                operations: ["create", "edit", "delete"]
            },
            feedback: {
                label: "Feedback & Self Evaluation",
                operations: ["create", "edit", "delete"]
            },
            posh: {
                label: "POSH Complaint",
                operations: ["create", "edit", "delete"]
            },
            reimbursement: {
                label: "Reimbursement Management",
                operations: ["create", "edit", "delete"]
            },
            resign: {
                label: "Resign",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    operations: {
        label: "Operations",
        sections: {
            store: { label: "Store", operations: ["view", "create", "edit", "delete"] },
            marketing: { label: "Marketing", operations: ["view", "create", "edit", "delete"] },
            academics: { label: "Academics", operations: ["view", "create", "edit", "delete"] },
            centres: {
                label: "Centres",
                operations: ["create", "edit", "delete"]
            },
            inventory: {
                label: "Inventory",
                operations: ["create", "edit", "delete"]
            },
            facilities: {
                label: "Facilities",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    // digitalPortal: {
    //     label: "Digital Portal",
    //     sections: {
    //         studentPortal: {
    //             label: "Student Portal",
    //             operations: ["create", "edit", "delete"]
    //         },
    //         teacherPortal: {
    //             label: "Teacher Portal",
    //             operations: ["create", "edit", "delete"]
    //         },
    //         parentPortal: {
    //             label: "Parent Portal",
    //             operations: ["create", "edit", "delete"]
    //         }
    //     }
    // },
    marketingCRM: {
        label: "Marketing & CRM",
        sections: {
            // campaigns: {
            //     label: "Campaigns",
            //     operations: ["create", "edit", "delete"]
            // },
            leads: {
                label: "Leads",
                operations: ["create", "edit", "delete"]
            },
            // communications: {
            //     label: "Communications",
            //     operations: ["create", "edit", "delete"]
            // }
        }
    },
    // franchiseMgmt: {
    //     label: "Franchise Mgmt",
    //     sections: {
    //         franchises: {
    //             label: "Franchises",
    //             operations: ["create", "edit", "delete"]
    //         },
    //         agreements: {
    //             label: "Agreements",
    //             operations: ["create", "edit", "delete"]
    //         },
    //         royalties: {
    //             label: "Royalties",
    //             operations: ["create", "edit", "delete"]
    //         }
    //     }
    // },
    masterData: {
        label: "Master Data",
        sections: {
            class: {
                label: "Class",
                operations: ["create", "edit", "delete"]
            },
            examTag: {
                label: "Exam Tag",
                operations: ["create", "edit", "delete"]
            },
            department: {
                label: "Department",
                operations: ["create", "edit", "delete"]
            },
            designation: {
                label: "Designation",
                operations: ["create", "edit", "delete"]
            },
            board: {
                label: "Board",
                operations: ["create", "edit", "delete"]
            },
            boardCourse: {
                label: "Board Course Master",
                operations: ["create", "edit", "delete"]
            },
            subject: {
                label: "Subject",
                operations: ["create", "edit", "delete"]
            },
            centre: {
                label: "Centre",
                operations: ["create", "edit", "delete"]
            },
            subjects: {
                label: "Subjects",
                operations: ["create", "edit", "delete"]
            },
            batch: {
                label: "Batch",
                operations: ["create", "edit", "delete"]
            },
            source: {
                label: "Source",
                operations: ["create", "edit", "delete"]
            },
            session: {
                label: "Session",
                operations: ["create", "edit", "delete"]
            },
            script: {
                label: "Script",
                operations: ["create", "edit", "delete"]
            },
            category: {
                label: "Expense Category",
                operations: ["create", "edit", "delete"]
            },
            subcategory: {
                label: "Expense Sub-Category",
                operations: ["create", "edit", "delete"]
            },
            expenditureType: {
                label: "Expenditure Type",
                operations: ["create", "edit", "delete"]
            },
            account: {
                label: "Account",
                operations: ["create", "edit", "delete"]
            },
            zone: {
                label: "Zone Management",
                operations: ["create", "edit", "delete"]
            },
            followUpFeedback: {
                label: "Follow-up Feedback",
                operations: ["create", "edit", "delete"]
            },
            schoolForTask: {
                label: "School For Task",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    dailyCenterTracking: {
        label: "Daily Center Tracking",
        sections: {
            dashboard: {
                label: "Dashboard",
                operations: ["view", "create", "edit", "delete"]
            }
        }
    },
    courseManagement: {
        label: "Course Management",
        sections: {
            courses: {
                label: "Courses",
                operations: ["create", "edit", "delete"]
            },
            carryForward: {
                label: "Carry Forward",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    dailyTrackingLog: {
        label: "Daily Tracking Log",
        sections: {
            myDailyLog: {
                label: "My Daily Log",
                operations: ["create", "edit", "delete"]
            },
            logTracking: {
                label: "Log Tracking",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    userManagement: {
        label: "User Management",
        sections: {
            users: {
                label: "Users",
                operations: ["create", "edit", "delete"]
            }
            // roles: {
            //     label: "Roles",
            //     operations: ["create", "edit", "delete"]
            // },
            // permissions: {
            //     label: "Permissions",
            //     operations: ["create", "edit", "delete"]
            // }
        }
    },
    leadManagement: {
        label: "Lead Management",
        sections: {
            leads: {
                label: "Leads",
                operations: ["create", "edit", "delete", "upload", "export"]
            },
            dashboard: {
                label: "Dashboard",
                operations: ["view"]
            },
            campaignAds: {
                label: "Campaign/Ads",
                operations: ["view", "create", "edit", "delete"]
            },
            conversionReport: {
                label: "Conversion Report",
                operations: ["view"]
            }
        }
    },
    pettyCashManagement: {
        label: "Petty Cash Management",
        sections: {
            pettyCashCentre: {
                label: "Petty Cash Centre",
                operations: ["view", "create", "edit"]
            },
            addExpenditure: {
                label: "Add Expenditure",
                operations: ["view", "create"]
            },
            expenditureApproval: {
                label: "Expenditure Approval",
                operations: ["approve", "create", "edit", "delete"]
            },
            addPettyCash: {
                label: "Add Petty Cash (Requests)",
                operations: ["create", "edit", "delete"]
            },
            pettyCashRequestApproval: {
                label: "Petty Cash Request Approval",
                operations: ["approve", "create", "edit", "delete"]
            }
        }
    },
    trackingFlagging: {
        label: "Tracking & Flagging",
        sections: {
            dailyCenterTracking: {
                label: "Daily Center Tracking",
                operations: ["view", "create", "edit", "delete"]
            },
            redFlagDesk: {
                label: "Red Flag Desk",
                operations: ["view", "create", "edit", "delete"]
            }
        }
    },
    taskWorkflow: {
        label: "Task Workflow",
        sections: {
            tasks: {
                label: "Tasks",
                operations: ["view", "create", "edit", "delete"]
            },
            assignTask: {
                label: "Assign Task",
                operations: ["view", "create", "edit", "delete"]
            }
        }
    },
    pntse: {
        label: "PNTSE",
        sections: {
            allStudents: {
                label: "All Students",
                operations: ["view", "create", "edit", "delete", "import", "export"]
            },
            addStudent: {
                label: "Add Student",
                operations: ["view", "create", "edit", "delete"]
            }
        }
    }
};

const getUserRole = (userOrPermissions) => {
    if (userOrPermissions?.role) return userOrPermissions.role;
    try {
        const localUser = JSON.parse(localStorage.getItem("user") || "{}");
        return localUser?.role;
    } catch (e) {
        return null;
    }
};

// Helper function to check if user has permission
// Accepts either (granularPermissions, module, section, operation) or (user, module, section, operation)
export const hasPermission = (granularPermissionsOrUser, module, section, operation) => {
    const role = getUserRole(granularPermissionsOrUser);
    if (role && (role.toLowerCase() === 'superadmin' || role.toLowerCase() === 'super admin')) {
        return true; // SuperAdmin has all permissions
    }

    const granularPermissions = granularPermissionsOrUser?.granularPermissions ||
        (typeof granularPermissionsOrUser === 'object' && !granularPermissionsOrUser.role ? granularPermissionsOrUser : null);

    // Digital role: default superadmin-like full access; if custom granular permissions are set in User Management, enforce them strictly
    if (role && role.toLowerCase() === 'digital') {
        if (granularPermissions && typeof granularPermissions === 'object' && Object.keys(granularPermissions).length > 0) {
            if (module === 'academics' && ['upcomingClass', 'ongoingClass', 'previousClass', 'subjects', 'chapters', 'topics'].includes(section)) {
                if (granularPermissions[module]?.['classManagement']?.[operation] === true ||
                    granularPermissions[module]?.['classes']?.[operation] === true) {
                    return true;
                }
            }
            if (granularPermissions[module]?.[section]) {
                if (granularPermissions[module][section][operation] === true) {
                    return true;
                }
                if (operation === 'view') {
                    if (granularPermissions[module][section]['view'] !== undefined) {
                        return granularPermissions[module][section]['view'] === true;
                    }
                    return true;
                }
            }
            return false;
        }
        return true; // Default to full access like SuperAdmin if no custom permissions configured
    }

    const ALL_ROLES_FOR_CLASS = [
        'teacher', 'admin', 'superAdmin', 'telecaller', 'centralizedTelecaller',
        'counsellor', 'RM', 'Class_Coordinator', 'HOD', 'marketing',
        'centerIncharge', 'zonalManager', 'zonalHead', 'hr', 'accounts',
        'coordinator', 'digital', 'assistantZonalManager', 'assistantCenterIncharge'
    ];

    if (granularPermissionsOrUser && granularPermissionsOrUser.role && module === 'academics' &&
        ['classes', 'classManagement', 'upcomingClass', 'ongoingClass', 'previousClass'].includes(section)) {
        if (ALL_ROLES_FOR_CLASS.some(r => r.toLowerCase() === granularPermissionsOrUser.role.toLowerCase())) {
            return true;
        }
    }

    // Check if permission is explicitly set to false in granularPermissions first
    if (granularPermissions && granularPermissions[module]) {
        const secObj = granularPermissions[module][section];
        if (secObj && typeof secObj === 'object') {
            if (operation === 'view' && secObj.view === false) return false;
            if (operation !== 'view' && secObj[operation] === false) return false;
        }
    }

    // Grant automatic access to marketingCRM module
    if (module === 'marketingCRM') {
        const isMktTargetRole = ['marketing', 'centerincharge', 'centreincharge', 'zonalmanager', 'zonalhead', 'superadmin', 'assistantzonalmanager', 'assistantcenterincharge'].includes(role?.toLowerCase()?.replace(/\s+/g, ''));
        if (isMktTargetRole && (!granularPermissions?.[module]?.[section] || granularPermissions[module][section].view !== false)) return true;
    }

    // Grant automatic access to dailyTrackingLog module actions (myDailyLog for all non-teacher roles)
    if (module === 'dailyTrackingLog') {
        if (section === 'myDailyLog') {
            const isTeacher = role?.toLowerCase() === 'teacher';
            if (!isTeacher && (!granularPermissions?.[module]?.[section] || granularPermissions[module][section].view !== false)) return true;
        } else {
            const isMktTargetRole = ['marketing', 'centerincharge', 'centreincharge', 'zonalmanager', 'zonalhead', 'superadmin', 'admin', 'assistantzonalmanager', 'assistantcenterincharge'].includes(role?.toLowerCase()?.replace(/\s+/g, ''));
            if ((isMktTargetRole || granularPermissions?.['marketingCRM']) && (!granularPermissions?.[module]?.[section] || granularPermissions[module][section].view !== false)) {
                return true;
            }
        }
    }

    if (!granularPermissions) return false;

    // Master permission check for Academics Class Management
    // If user has 'classManagement' or 'classes' permission, they get access to sub-sections
    if (module === 'academics' && ['upcomingClass', 'ongoingClass', 'previousClass', 'subjects', 'chapters', 'topics'].includes(section)) {
        if (granularPermissions[module]?.['classManagement']?.[operation] === true ||
            granularPermissions[module]?.['classes']?.[operation] === true) {
            return true;
        }
    }

    if (!granularPermissions[module] || !granularPermissions[module][section]) return false;

    // If checking for 'view' access and the section exists in granularPermissions:
    if (operation === 'view') {
        if (granularPermissions[module][section]['view'] !== undefined) {
            return granularPermissions[module][section]['view'] === true;
        }
        // Section exists in granularPermissions, so user has view access to this section
        return true;
    }

    return granularPermissions[module][section][operation] === true;
};

// Helper function to check if user has any permission in a module
export const hasModuleAccess = (granularPermissionsOrUser, module) => {
    const role = getUserRole(granularPermissionsOrUser);
    if (role && (role.toLowerCase() === 'superadmin' || role.toLowerCase() === 'super admin')) {
        return true; // SuperAdmin has access to all modules
    }
    const normalizedRole = role ? role.toLowerCase() : "";

    const granularPermissions = granularPermissionsOrUser?.granularPermissions ||
        (typeof granularPermissionsOrUser === 'object' && !granularPermissionsOrUser.role ? granularPermissionsOrUser : null);

    // Digital role: default superadmin-like module access; if custom permissions exist in User Management, enforce them strictly
    if (normalizedRole === 'digital') {
        if (granularPermissions && typeof granularPermissions === 'object' && Object.keys(granularPermissions).length > 0) {
            const sections = granularPermissions[module];
            if (!sections) return false;
            return Object.keys(sections).length > 0;
        }
        return true; // Default to full module access like SuperAdmin
    }

    // If granularPermissions specifies this module, ensure at least one section is enabled
    if (granularPermissions && granularPermissions[module]) {
        const sections = granularPermissions[module];
        const keys = Object.keys(sections);
        if (keys.length > 0) {
            const hasAnyEnabled = keys.some(secKey => {
                const sec = sections[secKey];
                if (!sec || typeof sec !== 'object') return false;
                if (sec.view !== undefined) return sec.view === true;
                return Object.values(sec).some(v => v === true);
            });
            if (!hasAnyEnabled) return false;
        }
    }

    if (module === 'academics' && (normalizedRole === 'class_coordinator' || normalizedRole === 'coordinator')) {
        return true;
    }

    if (module === 'marketingCRM') {
        const isMktTargetRole = ['marketing', 'centerincharge', 'centreincharge', 'zonalmanager', 'zonalhead', 'superadmin', 'assistantzonalmanager', 'assistantcenterincharge'].includes(normalizedRole.replace(/\s+/g, ''));
        if (isMktTargetRole) return true;
    }

    if (module === 'dailyTrackingLog') {
        if (normalizedRole !== 'teacher') return true;
    }

    if (!granularPermissions || !granularPermissions[module]) return false;
    const sections = granularPermissions[module];
    return Object.keys(sections).some(sectionKey => {
        const sec = sections[sectionKey];
        if (!sec || typeof sec !== 'object') return false;
        if (sec.view !== undefined) return sec.view === true;
        return Object.values(sec).some(v => v === true);
    });
};

// Helper function to get all accessible modules
export const getAccessibleModules = (granularPermissionsOrUser) => {
    const role = getUserRole(granularPermissionsOrUser);
    if (role && (role.toLowerCase() === 'superadmin' || role.toLowerCase() === 'super admin')) {
        return Object.keys(PERMISSION_MODULES); // SuperAdmin has access to all modules
    }

    const granularPermissions = granularPermissionsOrUser?.granularPermissions ||
        (typeof granularPermissionsOrUser === 'object' && !granularPermissionsOrUser.role ? granularPermissionsOrUser : null);

    if (role && role.toLowerCase() === 'digital') {
        if (!granularPermissions || (typeof granularPermissions === 'object' && Object.keys(granularPermissions).length === 0)) {
            return Object.keys(PERMISSION_MODULES); // Full access like SuperAdmin
        }
    }

    if (!granularPermissions) return [];
    return Object.keys(granularPermissions).filter(module =>
        hasModuleAccess(granularPermissionsOrUser, module)
    );
};

export default PERMISSION_MODULES;
