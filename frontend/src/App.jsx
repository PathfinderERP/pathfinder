import { BrowserRouter, Routes, Route } from "react-router-dom";
import './overflow-fix.css';
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
import TransactionList from "./pages/Finance/TransactionList";
import HR from "./pages/HR";
import Academics from "./pages/Academics";
import StudentAdmission from "./pages/StudentAdmission";
import StudentAdmissionPage from "./pages/StudentAdmissionPage";
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

// ... inside Routes ... (I will use a simpler replace block to avoid mess)


function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<LandingPage />} /> */}
        <Route path="/" element={<Login />} />
        <Route path="/lead-management" element={<LeadManagement />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/admissions/telecalling-console" element={<TelecallingConsole />} />
        <Route path="/student-registration" element={<StudentRegistration />} />
        <Route path="/student-admission/:studentId" element={<StudentAdmission />} />
        <Route path="/admission/:studentId" element={<StudentAdmissionPage />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/finance/installment-payment" element={<InstallmentPayment />} />
        <Route path="/finance/pay-employee" element={<PayEmployee />} />
        <Route path="/finance/pay-employee/:id" element={<PayEmployeeDetails />} />
        <Route path="/finance/fee-due-list" element={<FeeDueList />} />
        <Route path="/finance/cheque-management" element={<ChequeManagement />} />
        <Route path="/finance/cancel-cheque" element={<CancelChequePayment />} />
        <Route path="/finance/cash/report" element={<CashReport />} />
        <Route path="/finance/cash/transfer" element={<CashTransfer />} />
        <Route path="/finance/cash/receive" element={<CashReceive />} />
        <Route path="/finance/cash/centre/:centreId" element={<CashCentreDetails />} />
        <Route path="/finance/transaction-list" element={<TransactionList />} />
        <Route path="/finance/analysis" element={<FinancialAnalysis />} />
        <Route path="/finance/center-tagging" element={<CenterTagging />} />
        <Route path="/finance/budget" element={<Budget />} />
        <Route path="/finance/budget/:centreId" element={<BudgetDetails />} />
        <Route path="/finance/part-time-teachers" element={<PartTimeTeachers />} />
        <Route path="/sales" element={<Sales />} />
        <Route path="/sales/centre-target" element={<CentreTarget />} />
        <Route path="/sales/centre-rank" element={<CentreRank />} />
        <Route path="/sales/target-achievement-report" element={<TargetAchievementReport />} />
        <Route path="/sales/admission-report" element={<AdmissionReport />} />
        <Route path="/sales/course-report" element={<CourseReport />} />
        <Route path="/sales/discount-report" element={<DiscountReport />} />
        <Route path="/sales/transaction-report" element={<TransactionReport />} />
        <Route path="/hr" element={<HR />} />
        <Route path="/hr/employee/list" element={<EmployeeList />} />
        <Route path="/hr/employee/add" element={<AddEmployee />} />
        <Route path="/hr/employee/edit/:id" element={<AddEmployee />} />
        <Route path="/hr/employee/view/:id" element={<ViewEmployee />} />
        <Route path="/hr/employee/letters/:id" element={<EmployeeLetters />} />
        <Route path="/hr/employee/letters/:id/offer-letter" element={<OfferLetter />} />
        <Route path="/hr/employee/letters/:id/appointment-letter" element={<AppointmentLetter />} />
        <Route path="/hr/employee/letters/:id/contract-letter" element={<ContractLetter />} />
        <Route path="/hr/employee/letters/:id/experience-letter" element={<ExperienceLetter />} />
        <Route path="/hr/employee/letters/:id/virtual-id" element={<VirtualId />} />
        <Route path="/hr/employee/letters/:id/relieving-letter" element={<ReleaseLetter />} />

        {/* Attendance Management Routes */}
        <Route path="/hr/attendance/holiday-management" element={<HolidayCalendar />} />
        <Route path="/hr/attendance/holiday-list" element={<HolidayList />} />
        <Route path="/hr/attendance/leave-type" element={<LeaveType />} />
        <Route path="/hr/attendance/leave-management" element={<LeaveManagement />} />
        <Route path="/hr/attendance/leave-request" element={<LeaveRequest />} />
        <Route path="/hr/attendance/regularize-table" element={<RegularizeTable />} />
        <Route path="/employee/regularization" element={<MyRegularization />} />
        <Route path="/hr/attendance/employee-logs" element={<EmployeesAttendance />} />
        <Route path="/hr/training" element={<TrainingList />} />
        <Route path="/employee/training" element={<TrainingCenter />} />
        <Route path="/employee/attendance" element={<EmployeeAttendance />} />
        <Route path="/employee/details" element={<EmployeeDetails />} />
        <Route path="/employee/posh" element={<PoshComplaint />} />
        <Route path="/hr/resign/button" element={<ResignationRequest />} />
        <Route path="/hr/resign" element={<ResignationList />} />
        <Route path="/hr/resign-request" element={<ResignationList />} />
        <Route path="/hr/documents/upload" element={<DocumentUpload />} />
        <Route path="/employee/documents" element={<DocumentCenter />} />
        <Route path="/hr/birthday" element={<BirthdayList />} />
        <Route path="/hr/feedback" element={<AllFeedback />} />
        <Route path="/employee/feedback" element={<FeedbackEvaluation />} />
        <Route path="/hr/reimbursement" element={<ReimbursementList />} />
        <Route path="/hr/reimbursement/add" element={<AddReimbursement />} />
        <Route path="/hr/posh-table" element={<PoshDashboard />} />


        <Route path="/academics" element={<Academics />} />
        <Route path="/academics/teacher-list" element={<TeacherList />} />
        <Route path="/academics/teacher/view/:id" element={<ViewTeacher />} />
        <Route path="/academics/student-teacher-review" element={<StudentTeacherReview />} />
        <Route path="/academics/live-class-review" element={<LiveClassReview />} />
        <Route path="/academics/cc-teacher-review" element={<CCTeacherReview />} />
        <Route path="/academics/hod-list" element={<HodList />} />
        <Route path="/academics/centre-management" element={<CentreManagement />} />
        <Route path="/academics/rm-list" element={<RMList />} />
        <Route path="/academics/class-coordinator" element={<ClassCoordinator />} />
        <Route path="/academics/classes" element={<Classes />} />
        <Route path="/academics/class/add" element={<AddClass />} />
        <Route path="/academics/upcoming-class" element={<UpcomingClass />} />
        <Route path="/academics/ongoing-class" element={<OngoingClass />} />
        <Route path="/academics/previous-class" element={<PreviousClass />} />
        <Route path="/academics/mental-session-table" element={<MentalSessionTable />} />
        <Route path="/academics/class-management" element={<ClassManagement />} />
        <Route path="/academics/class-list" element={<ClassList />} />
        <Route path="/academics/create-subject" element={<SubjectList />} />
        <Route path="/academics/create-chapter" element={<ChapterList />} />
        <Route path="/academics/create-topic" element={<TopicList />} />
        <Route path="/academics/section-leader-board" element={<SectionLeaderBoard />} />
        <Route path="/academics/exam-leader-board" element={<ExamLeaderBoard />} />
        <Route path="/master-data" element={<MasterData />} />
        <Route path="/master-data/class" element={<MasterDataClass />} />
        <Route path="/master-data/exam-tag" element={<MasterDataExamTag />} />
        <Route path="/master-data/department" element={<MasterDataDepartment />} />
        <Route path="/master-data/centre" element={<MasterDataCentre />} />
        <Route path="/master-data/batch" element={<MasterDataBatch />} />
        <Route path="/master-data/source" element={<MasterDataSource />} />
        <Route path="/master-data/session" element={<MasterDataSession />} />
        <Route path="/master-data/script" element={<MasterDataScript />} />
        <Route path="/master-data/expense-category" element={<MasterDataExpenseCategory />} />
        <Route path="/master-data/expense-subcategory" element={<MasterDataExpenseSubCategory />} />
        <Route path="/master-data/expenditure-type" element={<MasterDataExpenditureType />} />
        <Route path="/master-data/account" element={<MasterDataAccount />} />
        <Route path="/master-data/board" element={<MasterDataBoard />} />
        <Route path="/master-data/subject" element={<MasterDataSubject />} />

        {/* Petty Cash Routes */}
        <Route path="/petty-cash/centre" element={<PettyCashCentre />} />
        <Route path="/petty-cash/add-cash" element={<AddPettyCash />} />
        <Route path="/petty-cash/request-approval" element={<PettyCashRequestApproval />} />
        <Route path="/petty-cash/add-expenditure" element={<AddPettyCashExpenditure />} />
        <Route path="/petty-cash/approval" element={<PettyCashApproval />} />

        <Route path="/master-data/designation" element={<MasterDataDesignation />} />
        <Route path="/course-management" element={<MasterDataCourse />} />
        <Route path="/course-management/carry-forward" element={<CarryForward />} />
        <Route path="/course-management/course-transfer" element={<CourseTransfer />} />
        <Route path="/enrolled-students" element={<EnrolledStudents />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
