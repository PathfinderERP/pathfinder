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
                operations: ["create", "edit", "delete"]
            },
            // salesDashboard: {
            //     label: "Sales Dashboard",
            //     operations: ["create", "edit", "delete"]
            // },
            telecallingConsole: {
                label: "Telecalling Console",
                operations: ["view", "create", "edit", "delete"]
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
            liveClassReview: { label: "Live Class Review", operations: ["create", "edit", "delete"] },
            ccTeacherReview: { label: "CC Teacher Review", operations: ["create", "edit", "delete"] },
            hodList: { label: "HoD List", operations: ["create", "edit", "delete"] },
            centreManagement: { label: "Centre Management", operations: ["create", "edit", "delete"] },
            rmList: { label: "RM List", operations: ["create", "edit", "delete"] },
            classCoordinator: { label: "Class Coordinator", operations: ["create", "edit", "delete"] },
            mentalSessionTable: { label: "Mental Session Table", operations: ["create", "edit", "delete"] },
            classManagement: { label: "Class Management", operations: ["create", "edit", "delete"] },
            sectionLeaderBoard: { label: "Section Leader Board", operations: ["create", "edit", "delete"] },
            examLeaderBoard: { label: "Exam Leader Board", operations: ["create", "edit", "delete"] },
            upcomingClass: { label: "Upcoming Class", operations: ["create", "edit", "delete"] },
            ongoingClass: { label: "Ongoing Class", operations: ["create", "edit", "delete"] },
            previousClass: { label: "Previous Class", operations: ["create", "edit", "delete"] }
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
            cancelCheque: {
                label: "Cancel Cheque Payment",
                operations: ["create", "edit", "delete"]
            },
            // billGeneration: {
            //     label: "Bill Generation",
            //     operations: ["create", "edit", "delete"]
            // },
            payments: {
                label: "Payments",
                operations: ["create", "edit", "delete"]
            },
            paymentReminders: {
                label: "Payment Reminders",
                operations: ["create", "edit", "delete"]
            },
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
            centerTagging: {
                label: "Center Tagging",
                operations: ["create", "edit", "delete"]
            },
            budget: {
                label: "Budget",
                operations: ["create", "edit", "delete"]
            },
            cashCentre: {
                label: "Cash Centre",
                operations: ["create", "edit", "delete"]
            },
            partTimeTeachers: {
                label: "Part Time Teachers",
                operations: ["create", "edit", "delete"]
            },
            financePerson: {
                label: "Finance Person",
                operations: ["create", "edit", "delete"]
            },
            vendorManagement: {
                label: "Vendor Management",
                operations: ["create", "edit", "delete"]
            },
            payEmployee: {
                label: "Pay Employee",
                operations: ["create", "edit", "delete"]
            },
            paymentAnalysis: {
                label: "Payment Analysis",
                operations: ["create", "edit", "delete"]
            },
            budgetAnalysis: {
                label: "Budget Analysis",
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
            center: { label: "Center Management", operations: ["create", "edit", "delete"] },
            centerDetails: { label: "Center On/Off Details", operations: ["create", "edit", "delete"] },
            training: { label: "Training List", operations: ["create", "edit", "delete"] },
            posh: { label: "POSH Table", operations: ["create", "edit", "delete"] },
            upload: { label: "Upload File", operations: ["create", "edit", "delete"] },
            feedback: { label: "All Feedback", operations: ["create", "edit", "delete"] },
            reimbursement: { label: "Reimbursement List", operations: ["create", "edit", "delete"] },
            resign: { label: "Resign Request", operations: ["create", "edit", "delete"] },
            birthday: { label: "Birthday Lists", operations: ["create", "edit", "delete"] },
            overview: { label: "Overview", operations: ["create", "edit", "delete"] },
            payroll: { label: "Payroll", operations: ["create", "edit", "delete"] }
        }
    },
    operations: {
        label: "Operations",
        sections: {
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
    digitalPortal: {
        label: "Digital Portal",
        sections: {
            studentPortal: {
                label: "Student Portal",
                operations: ["create", "edit", "delete"]
            },
            teacherPortal: {
                label: "Teacher Portal",
                operations: ["create", "edit", "delete"]
            },
            parentPortal: {
                label: "Parent Portal",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    marketingCRM: {
        label: "Marketing & CRM",
        sections: {
            campaigns: {
                label: "Campaigns",
                operations: ["create", "edit", "delete"]
            },
            leads: {
                label: "Leads",
                operations: ["create", "edit", "delete"]
            },
            communications: {
                label: "Communications",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    franchiseMgmt: {
        label: "Franchise Mgmt",
        sections: {
            franchises: {
                label: "Franchises",
                operations: ["create", "edit", "delete"]
            },
            agreements: {
                label: "Agreements",
                operations: ["create", "edit", "delete"]
            },
            royalties: {
                label: "Royalties",
                operations: ["create", "edit", "delete"]
            }
        }
    },
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
            curriculum: {
                label: "Curriculum",
                operations: ["create", "edit", "delete"]
            },
            materials: {
                label: "Materials",
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
            },
            roles: {
                label: "Roles",
                operations: ["create", "edit", "delete"]
            },
            permissions: {
                label: "Permissions",
                operations: ["create", "edit", "delete"]
            }
        }
    },
    leadManagement: {
        label: "Lead Management",
        sections: {
            leads: {
                label: "Leads",
                operations: ["create", "edit", "delete"]
            },
            // allocations: {
            //     label: "Allocations",
            //     operations: ["create", "edit", "delete"]
            // },
            // leadStatus: {
            //     label: "Lead Status",
            //     operations: ["create", "edit", "delete"]
            // }
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
                operations: ["view", "approve"]
            },
            addPettyCash: {
                label: "Add Petty Cash (Requests)",
                operations: ["view", "create"]
            },
            pettyCashRequestApproval: {
                label: "Petty Cash Request Approval",
                operations: ["view", "approve"]
            }
        }
    }
};

// Helper function to check if user has permission
// Accepts either (granularPermissions, module, section, operation) or (user, module, section, operation)
export const hasPermission = (granularPermissionsOrUser, module, section, operation) => {
    // Check if first argument is a user object with role
    if (granularPermissionsOrUser && granularPermissionsOrUser.role === 'superAdmin') {
        return true; // SuperAdmin has all permissions
    }

    // Otherwise treat it as granularPermissions object
    const granularPermissions = granularPermissionsOrUser?.granularPermissions || granularPermissionsOrUser;

    if (!granularPermissions) return false;
    if (!granularPermissions[module]) return false;
    if (!granularPermissions[module][section]) return false;
    return granularPermissions[module][section][operation] === true;
};

// Helper function to check if user has any permission in a module
export const hasModuleAccess = (granularPermissionsOrUser, module) => {
    // Check if first argument is a user object with role
    if (granularPermissionsOrUser && granularPermissionsOrUser.role === 'superAdmin') {
        return true; // SuperAdmin has access to all modules
    }

    const granularPermissions = granularPermissionsOrUser?.granularPermissions || granularPermissionsOrUser;
    if (!granularPermissions || !granularPermissions[module]) return false;
    const sections = granularPermissions[module];
    return Object.keys(sections).length > 0;
};

// Helper function to get all accessible modules
export const getAccessibleModules = (granularPermissionsOrUser) => {
    // Check if first argument is a user object with role
    if (granularPermissionsOrUser && granularPermissionsOrUser.role === 'superAdmin') {
        return Object.keys(PERMISSION_MODULES); // SuperAdmin has access to all modules
    }

    const granularPermissions = granularPermissionsOrUser?.granularPermissions || granularPermissionsOrUser;
    if (!granularPermissions) return [];
    return Object.keys(granularPermissions).filter(module =>
        hasModuleAccess(granularPermissions, module)
    );
};

export default PERMISSION_MODULES;
