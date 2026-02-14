import { BrowserRouter, Routes, Route } from "react-router-dom";
import './overflow-fix.css';
import ProtectedRoute from "./components/ProtectedRoute";
import LandingPage from "./pages/LandingPage";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Admissions from "./pages/Admissions";
import StudentRegistration from "./pages/StudentRegistration";
import Finance from "./pages/Finance";
import Sales from "./pages/Sales";
import CentreTarget from "./pages/Sales/CentreTarget";
import CentreRank from "./pages/Sales/CentreRank";
import TargetAchievementReport from "./pages/Sales/TargetAchievementReport";
import AdmissionReport from "./pages/Sales/AdmissionReport";
import CourseReport from "./pages/Sales/CourseReport";
import DiscountReport from "./pages/Sales/DiscountReport";
import TransactionReport from "./pages/Sales/TransactionReport";
import BoardReport from "./pages/Sales/BoardReport";
import TransactionList from "./pages/Finance/TransactionList";
import HR from "./pages/HR";
import Academics from "./pages/Academics";
import StudentAdmission from "./pages/StudentAdmission";
import StudentAdmissionPage from "./pages/StudentAdmissionPage";
import SectionAllotment from "./pages/SectionAllotment";
import TelecallingConsole from "./pages/TelecallingConsole";
import MasterData from "./pages/MasterData";
import MasterDataClass from "./pages/MasterDataClass";
import MasterDataExamTag from "./pages/MasterDataExamTag";
import MasterDataDepartment from "./pages/MasterDataDepartment";
import MasterDataCourse from "./pages/MasterDataCourse";
import MasterDataCentre from "./pages/MasterDataCentre";
import EnrolledStudents from "./pages/EnrolledStudents";
import UserManagement from "./pages/UserManagement";
import Profile from "./pages/Profile";
import LeadManagement from "./pages/LeadManagement";
import LeadDashboard from "./pages/LeadManagement/LeadDashboard";
import MasterDataBatch from "./pages/MasterDataBatch";
import MasterDataSource from "./pages/MasterDataSource";
import MasterDataSession from "./pages/MasterDataSession";
import MasterDataScript from "./pages/MasterDataScript";
import MasterDataExpenseCategory from "./pages/MasterDataExpenseCategory";
import MasterDataExpenseSubCategory from "./pages/MasterDataExpenseSubCategory";
import MasterDataExpenditureType from "./pages/MasterDataExpenditureType";
import PettyCashCentre from "./pages/PettyCash/PettyCashCentre";
import AddPettyCash from "./pages/PettyCash/AddPettyCash";
import PettyCashRequestApproval from "./pages/PettyCash/PettyCashRequestApproval";
import AddPettyCashExpenditure from "./pages/PettyCash/AddPettyCashExpenditure";
import PettyCashApproval from "./pages/PettyCash/PettyCashApproval";
import MasterDataDesignation from "./pages/MasterDataDesignation";
import MasterDataAccount from "./pages/MasterDataAccount";
import MasterDataBoard from "./pages/MasterDataBoard";
import MasterDataSubject from "./pages/MasterDataSubject";
import MasterDataFollowUpFeedback from "./pages/MasterDataFollowUpFeedback";
import ZoneManagement from "./pages/ZoneManagement";
import EditBoardSubjects from "./pages/EditBoardSubjects";
import MarketingCRM from "./pages/MarketingCRM";

// ... [existing imports]

// Master Data Routes
// ... [existing routes]
// ... (removed misplaced routes)
import CarryForward from "./pages/CarryForward";
import CourseTransfer from "./pages/CourseTransfer";
import DocumentCenter from "./pages/Employee/DocumentCenter";
// Academics Pages
import TeacherList from "./pages/Academics/TeacherList";
import ViewTeacher from "./pages/Academics/ViewTeacher";
import StudentTeacherReview from "./pages/Academics/StudentTeacherReview";
import LiveClassReview from "./pages/Academics/LiveClassReview";
import CCTeacherReview from "./pages/Academics/CCTeacherReview";
import HodList from "./pages/Academics/HodList";
import CentreManagement from "./pages/Academics/CentreManagement";
import RMList from "./pages/Academics/RMList";
import ClassCoordinator from "./pages/Academics/ClassCoordinator";
import Classes from "./pages/Academics/Classes";
import AddClass from "./pages/Academics/AddClass";
import UpcomingClass from "./pages/Academics/UpcomingClass";
import OngoingClass from "./pages/Academics/OngoingClass";
import PreviousClass from "./pages/Academics/PreviousClass";
import MentalSessionTable from "./pages/Academics/MentalSessionTable";
import ClassManagement from "./pages/Academics/ClassManagement";
import ClassList from "./pages/Academics/ClassManagement/ClassList";
import SubjectList from "./pages/Academics/ClassManagement/SubjectList";
import ChapterList from "./pages/Academics/ClassManagement/ChapterList";
import TopicList from "./pages/Academics/ClassManagement/TopicList";
import SectionLeaderBoard from "./pages/Academics/SectionLeaderBoard";
import ExamLeaderBoard from "./pages/Academics/ExamLeaderBoard";

// HR Pages
import EmployeeList from "./pages/HR/EmployeeList";
import AddEmployee from "./pages/HR/AddEmployee";
import ViewEmployee from "./pages/HR/ViewEmployee";
import EmployeeLetters from "./pages/HR/EmployeeLetters";
import OfferLetter from "./pages/HR/Letters/OfferLetter";
import AppointmentLetter from "./pages/HR/Letters/AppointmentLetter";
import ContractLetter from "./pages/HR/Letters/ContractLetter";
import ExperienceLetter from "./pages/HR/Letters/ExperienceLetter";
import VirtualId from "./pages/HR/Letters/VirtualId";
import ReleaseLetter from "./pages/HR/Letters/ReleaseLetter";

// Attendance Management
import HolidayCalendar from "./pages/HR/Attendance/HolidayCalendar";
import HolidayList from "./pages/HR/Attendance/HolidayList";
import LeaveType from "./pages/HR/Attendance/LeaveType";
import LeaveManagement from "./pages/HR/Attendance/LeaveManagement";
import RegularizeTable from "./pages/HR/Attendance/RegularizeTable";
import MyRegularization from "./pages/HR/Attendance/MyRegularization";
import LeaveRequest from "./pages/HR/Attendance/LeaveRequest";
import EmployeeDetails from "./pages/HR/Employee/EmployeeDetails";
import TrainingList from "./pages/HR/TrainingList";
import EmployeesAttendance from "./pages/HR/EmployeesAttendance";
import TrainingCenter from "./pages/Employee/TrainingCenter";
import EmployeeAttendance from "./pages/Employee/EmployeeAttendance";

// Resignation Pages
import ResignationList from "./pages/HR/ResignRequestList";
import ResignationRequest from "./pages/Employee/ResignationRequest";
import DocumentUpload from "./pages/HR/DocumentUpload";
import BirthdayList from "./pages/HR/BirthdayList";
import AllFeedback from "./pages/HR/AllFeedback";
import FeedbackEvaluation from "./pages/Employee/FeedbackEvaluation";
import ReimbursementList from "./pages/HR/ReimbursementList";
import AddReimbursement from "./pages/HR/AddReimbursement";
import PoshComplaint from "./pages/Employee/PoshComplaint";
import PoshDashboard from "./pages/HR/PoshDashboard";
import CandidateHiring from "./pages/HR/CandidateHiring";
import InstallmentPayment from "./pages/Finance/InstallmentPayment";
import FeeDueList from "./pages/Finance/FeeDueList";
import ChequeManagement from "./pages/Finance/ChequeManagement";
import CancelChequePayment from "./pages/Finance/CancelChequePayment";
import CashReport from "./pages/Finance/CashReport";
import CashTransfer from "./pages/Finance/CashTransfer";
import CashReceive from "./pages/Finance/CashReceive";
import CashCentreDetails from "./pages/Finance/CashCentreDetails";
import FinancialAnalysis from "./pages/Finance/FinancialAnalysis";
import CenterTagging from "./pages/Finance/CenterTagging";
import Budget from "./pages/Finance/Budget";
import BudgetDetails from "./pages/Finance/BudgetDetails";
import PartTimeTeachers from "./pages/Finance/PartTimeTeachers";
import PayEmployee from "./pages/Finance/PayEmployee";
import PayEmployeeDetails from "./pages/Finance/PayEmployeeDetails";
import CEOControlTower from "./pages/CEOControlTower";


// ... inside Routes ... (I will use a simpler replace block to avoid mess)


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Root is now Dashboard */}
        <Route path="/" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/login" element={<Login />} />

        {/* Protected Routes */}
        <Route path="/lead-management" element={<ProtectedRoute><LeadManagement /></ProtectedRoute>} />
        <Route path="/lead-management/dashboard" element={<ProtectedRoute><LeadDashboard /></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/ceo-control-tower" element={<ProtectedRoute><CEOControlTower /></ProtectedRoute>} />
        <Route path="/marketing-crm" element={<ProtectedRoute><MarketingCRM /></ProtectedRoute>} />
        <Route path="/admissions" element={<ProtectedRoute><Admissions /></ProtectedRoute>} />

        <Route path="/admissions/telecalling-console" element={<ProtectedRoute><TelecallingConsole /></ProtectedRoute>} />
        <Route path="/admissions/section-allotment" element={<ProtectedRoute><SectionAllotment /></ProtectedRoute>} />
        <Route path="/student-registration" element={<ProtectedRoute><StudentRegistration /></ProtectedRoute>} />
        <Route path="/student-admission/:studentId" element={<ProtectedRoute><StudentAdmission /></ProtectedRoute>} />
        <Route path="/admission/:studentId" element={<ProtectedRoute><StudentAdmissionPage /></ProtectedRoute>} />
        <Route path="/finance" element={<ProtectedRoute><Finance /></ProtectedRoute>} />
        <Route path="/finance/installment-payment" element={<ProtectedRoute><InstallmentPayment /></ProtectedRoute>} />
        <Route path="/finance/pay-employee" element={<ProtectedRoute><PayEmployee /></ProtectedRoute>} />
        <Route path="/finance/pay-employee/:id" element={<ProtectedRoute><PayEmployeeDetails /></ProtectedRoute>} />
        <Route path="/finance/fee-due-list" element={<ProtectedRoute><FeeDueList /></ProtectedRoute>} />
        <Route path="/finance/cheque-management" element={<ProtectedRoute><ChequeManagement /></ProtectedRoute>} />
        <Route path="/finance/cancel-cheque" element={<ProtectedRoute><CancelChequePayment /></ProtectedRoute>} />
        <Route path="/finance/cash/report" element={<ProtectedRoute><CashReport /></ProtectedRoute>} />
        <Route path="/finance/cash/transfer" element={<ProtectedRoute><CashTransfer /></ProtectedRoute>} />
        <Route path="/finance/cash/receive" element={<ProtectedRoute><CashReceive /></ProtectedRoute>} />
        <Route path="/finance/cash/centre/:centreId" element={<ProtectedRoute><CashCentreDetails /></ProtectedRoute>} />
        <Route path="/finance/transaction-list" element={<ProtectedRoute><TransactionList /></ProtectedRoute>} />
        <Route path="/finance/analysis" element={<ProtectedRoute><FinancialAnalysis /></ProtectedRoute>} />
        <Route path="/finance/payment-analysis" element={<ProtectedRoute><FinancialAnalysis /></ProtectedRoute>} />
        <Route path="/finance/center-tagging" element={<ProtectedRoute><CenterTagging /></ProtectedRoute>} />
        <Route path="/finance/budget" element={<ProtectedRoute><Budget /></ProtectedRoute>} />
        <Route path="/finance/budget/:centreId" element={<ProtectedRoute><BudgetDetails /></ProtectedRoute>} />
        <Route path="/finance/part-time-teachers" element={<ProtectedRoute><PartTimeTeachers /></ProtectedRoute>} />
        <Route path="/sales" element={<ProtectedRoute><Sales /></ProtectedRoute>} />
        <Route path="/sales/centre-target" element={<ProtectedRoute><CentreTarget /></ProtectedRoute>} />
        <Route path="/sales/centre-rank" element={<ProtectedRoute><CentreRank /></ProtectedRoute>} />
        <Route path="/sales/target-achievement-report" element={<ProtectedRoute><TargetAchievementReport /></ProtectedRoute>} />
        <Route path="/sales/admission-report" element={<ProtectedRoute><AdmissionReport /></ProtectedRoute>} />
        <Route path="/sales/course-report" element={<ProtectedRoute><CourseReport /></ProtectedRoute>} />
        <Route path="/sales/discount-report" element={<ProtectedRoute><DiscountReport /></ProtectedRoute>} />
        <Route path="/sales/transaction-report" element={<ProtectedRoute><TransactionReport /></ProtectedRoute>} />
        <Route path="/sales/board-report" element={<ProtectedRoute><BoardReport /></ProtectedRoute>} />
        <Route path="/hr" element={<ProtectedRoute><HR /></ProtectedRoute>} />
        <Route path="/hr/employee/list" element={<ProtectedRoute><EmployeeList /></ProtectedRoute>} />
        <Route path="/hr/employee/add" element={<ProtectedRoute><AddEmployee /></ProtectedRoute>} />
        <Route path="/hr/employee/edit/:id" element={<ProtectedRoute><AddEmployee /></ProtectedRoute>} />
        <Route path="/hr/employee/view/:id" element={<ProtectedRoute><ViewEmployee /></ProtectedRoute>} />
        <Route path="/hr/employee/letters/:id" element={<ProtectedRoute><EmployeeLetters /></ProtectedRoute>} />
        <Route path="/hr/employee/letters/:id/offer-letter" element={<ProtectedRoute><OfferLetter /></ProtectedRoute>} />
        <Route path="/hr/employee/letters/:id/appointment-letter" element={<ProtectedRoute><AppointmentLetter /></ProtectedRoute>} />
        <Route path="/hr/employee/letters/:id/contract-letter" element={<ProtectedRoute><ContractLetter /></ProtectedRoute>} />
        <Route path="/hr/employee/letters/:id/experience-letter" element={<ProtectedRoute><ExperienceLetter /></ProtectedRoute>} />
        <Route path="/hr/employee/letters/:id/virtual-id" element={<ProtectedRoute><VirtualId /></ProtectedRoute>} />
        <Route path="/hr/employee/letters/:id/relieving-letter" element={<ProtectedRoute><ReleaseLetter /></ProtectedRoute>} />

        {/* Attendance Management Routes */}
        <Route path="/hr/attendance/holiday-management" element={<ProtectedRoute><HolidayCalendar /></ProtectedRoute>} />
        <Route path="/hr/attendance/holiday-list" element={<ProtectedRoute><HolidayList /></ProtectedRoute>} />
        <Route path="/hr/attendance/leave-type" element={<ProtectedRoute><LeaveType /></ProtectedRoute>} />
        <Route path="/hr/attendance/leave-management" element={<ProtectedRoute><LeaveManagement /></ProtectedRoute>} />
        <Route path="/hr/attendance/leave-request" element={<ProtectedRoute><LeaveRequest /></ProtectedRoute>} />
        <Route path="/hr/attendance/regularize-table" element={<ProtectedRoute><RegularizeTable /></ProtectedRoute>} />
        <Route path="/employee/regularization" element={<ProtectedRoute><MyRegularization /></ProtectedRoute>} />
        <Route path="/hr/attendance/employee-logs" element={<ProtectedRoute><EmployeesAttendance /></ProtectedRoute>} />
        <Route path="/hr/training" element={<ProtectedRoute><TrainingList /></ProtectedRoute>} />
        <Route path="/employee/training" element={<ProtectedRoute><TrainingCenter /></ProtectedRoute>} />
        <Route path="/employee/attendance" element={<ProtectedRoute><EmployeeAttendance /></ProtectedRoute>} />
        <Route path="/employee/details" element={<ProtectedRoute><EmployeeDetails /></ProtectedRoute>} />
        <Route path="/employee/posh" element={<ProtectedRoute><PoshComplaint /></ProtectedRoute>} />
        <Route path="/hr/resign/button" element={<ProtectedRoute><ResignationRequest /></ProtectedRoute>} />
        <Route path="/hr/resign" element={<ProtectedRoute><ResignationList /></ProtectedRoute>} />
        <Route path="/hr/resign-request" element={<ProtectedRoute><ResignationList /></ProtectedRoute>} />
        <Route path="/hr/documents/upload" element={<ProtectedRoute><DocumentUpload /></ProtectedRoute>} />
        <Route path="/employee/documents" element={<ProtectedRoute><DocumentCenter /></ProtectedRoute>} />
        <Route path="/hr/birthday" element={<ProtectedRoute><BirthdayList /></ProtectedRoute>} />
        <Route path="/hr/feedback" element={<ProtectedRoute><AllFeedback /></ProtectedRoute>} />
        <Route path="/employee/feedback" element={<ProtectedRoute><FeedbackEvaluation /></ProtectedRoute>} />
        <Route path="/hr/reimbursement" element={<ProtectedRoute><ReimbursementList /></ProtectedRoute>} />
        <Route path="/hr/reimbursement/add" element={<ProtectedRoute><AddReimbursement /></ProtectedRoute>} />
        <Route path="/hr/posh-table" element={<ProtectedRoute><PoshDashboard /></ProtectedRoute>} />
        <Route path="/hr/candidate-hiring" element={<ProtectedRoute><CandidateHiring /></ProtectedRoute>} />


        <Route path="/academics" element={<ProtectedRoute><Academics /></ProtectedRoute>} />
        <Route path="/academics/teacher-list" element={<ProtectedRoute><TeacherList /></ProtectedRoute>} />
        <Route path="/academics/teacher/view/:id" element={<ProtectedRoute><ViewTeacher /></ProtectedRoute>} />
        <Route path="/academics/student-teacher-review" element={<ProtectedRoute><StudentTeacherReview /></ProtectedRoute>} />
        <Route path="/academics/live-class-review" element={<ProtectedRoute><LiveClassReview /></ProtectedRoute>} />
        <Route path="/academics/cc-teacher-review" element={<ProtectedRoute><CCTeacherReview /></ProtectedRoute>} />
        <Route path="/academics/hod-list" element={<ProtectedRoute><HodList /></ProtectedRoute>} />
        <Route path="/academics/centre-management" element={<ProtectedRoute><CentreManagement /></ProtectedRoute>} />
        <Route path="/academics/rm-list" element={<ProtectedRoute><RMList /></ProtectedRoute>} />
        <Route path="/academics/class-coordinator" element={<ProtectedRoute><ClassCoordinator /></ProtectedRoute>} />
        <Route path="/academics/classes" element={<ProtectedRoute><Classes /></ProtectedRoute>} />
        <Route path="/academics/class/add" element={<ProtectedRoute><AddClass /></ProtectedRoute>} />
        <Route path="/academics/upcoming-class" element={<ProtectedRoute><UpcomingClass /></ProtectedRoute>} />
        <Route path="/academics/ongoing-class" element={<ProtectedRoute><OngoingClass /></ProtectedRoute>} />
        <Route path="/academics/previous-class" element={<ProtectedRoute><PreviousClass /></ProtectedRoute>} />
        <Route path="/academics/mental-session-table" element={<ProtectedRoute><MentalSessionTable /></ProtectedRoute>} />
        <Route path="/academics/class-management" element={<ProtectedRoute><ClassManagement /></ProtectedRoute>} />
        <Route path="/academics/class-list" element={<ProtectedRoute><ClassList /></ProtectedRoute>} />
        <Route path="/academics/create-subject" element={<ProtectedRoute><SubjectList /></ProtectedRoute>} />
        <Route path="/academics/create-chapter" element={<ProtectedRoute><ChapterList /></ProtectedRoute>} />
        <Route path="/academics/create-topic" element={<ProtectedRoute><TopicList /></ProtectedRoute>} />
        <Route path="/academics/section-leader-board" element={<ProtectedRoute><SectionLeaderBoard /></ProtectedRoute>} />
        <Route path="/academics/exam-leader-board" element={<ProtectedRoute><ExamLeaderBoard /></ProtectedRoute>} />
        <Route path="/master-data" element={<ProtectedRoute><MasterData /></ProtectedRoute>} />
        <Route path="/master-data/class" element={<ProtectedRoute><MasterDataClass /></ProtectedRoute>} />
        <Route path="/master-data/exam-tag" element={<ProtectedRoute><MasterDataExamTag /></ProtectedRoute>} />
        <Route path="/master-data/department" element={<ProtectedRoute><MasterDataDepartment /></ProtectedRoute>} />
        <Route path="/master-data/centre" element={<ProtectedRoute><MasterDataCentre /></ProtectedRoute>} />
        <Route path="/master-data/batch" element={<ProtectedRoute><MasterDataBatch /></ProtectedRoute>} />
        <Route path="/master-data/source" element={<ProtectedRoute><MasterDataSource /></ProtectedRoute>} />
        <Route path="/master-data/session" element={<ProtectedRoute><MasterDataSession /></ProtectedRoute>} />
        <Route path="/master-data/script" element={<ProtectedRoute><MasterDataScript /></ProtectedRoute>} />
        <Route path="/master-data/expense-category" element={<ProtectedRoute><MasterDataExpenseCategory /></ProtectedRoute>} />
        <Route path="/master-data/expense-subcategory" element={<ProtectedRoute><MasterDataExpenseSubCategory /></ProtectedRoute>} />
        <Route path="/master-data/expenditure-type" element={<ProtectedRoute><MasterDataExpenditureType /></ProtectedRoute>} />
        <Route path="/master-data/account" element={<ProtectedRoute><MasterDataAccount /></ProtectedRoute>} />
        <Route path="/master-data/board" element={<ProtectedRoute><MasterDataBoard /></ProtectedRoute>} />
        <Route path="/master-data/subject" element={<ProtectedRoute><MasterDataSubject /></ProtectedRoute>} />
        <Route path="/master-data/zone" element={<ProtectedRoute><ZoneManagement /></ProtectedRoute>} />

        {/* Petty Cash Routes */}
        <Route path="/petty-cash/centre" element={<ProtectedRoute><PettyCashCentre /></ProtectedRoute>} />
        <Route path="/petty-cash/add-cash" element={<ProtectedRoute><AddPettyCash /></ProtectedRoute>} />
        <Route path="/petty-cash/request-approval" element={<ProtectedRoute><PettyCashRequestApproval /></ProtectedRoute>} />
        <Route path="/petty-cash/add-expenditure" element={<ProtectedRoute><AddPettyCashExpenditure /></ProtectedRoute>} />
        <Route path="/petty-cash/approval" element={<ProtectedRoute><PettyCashApproval /></ProtectedRoute>} />

        <Route path="/master-data/designation" element={<ProtectedRoute><MasterDataDesignation /></ProtectedRoute>} />
        <Route path="/master-data/follow-up-feedback" element={<ProtectedRoute><MasterDataFollowUpFeedback /></ProtectedRoute>} />
        <Route path="/course-management" element={<ProtectedRoute><MasterDataCourse /></ProtectedRoute>} />
        <Route path="/course-management/carry-forward" element={<ProtectedRoute><CarryForward /></ProtectedRoute>} />
        <Route path="/course-management/course-transfer" element={<ProtectedRoute><CourseTransfer /></ProtectedRoute>} />
        <Route path="/enrolled-students" element={<ProtectedRoute><EnrolledStudents /></ProtectedRoute>} />
        <Route path="/edit-board-subjects/:admissionId" element={<ProtectedRoute><EditBoardSubjects /></ProtectedRoute>} />
        <Route path="/user-management" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />
        <Route path="/profile" element={<ProtectedRoute><Profile /></ProtectedRoute>} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
