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
import MasterDataDesignation from "./pages/MasterDataDesignation";
import CarryForward from "./pages/CarryForward";
import CourseTransfer from "./pages/CourseTransfer";

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
