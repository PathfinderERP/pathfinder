// import { BrowserRouter, Routes, Route } from "react-router-dom";
// import Login from "./pages/Login";
// import Dashboard from "./pages/Dashboard";
// import Admissions from "./pages/Admissions";
// import StudentRegistration from "./pages/StudentRegistration";
// import Finance from "./pages/Finance";
// import HR from "./pages/HR";
// import Academics from "./pages/Academics";

// function App() {
//   return (
//     <BrowserRouter>
//       <Routes>
//         <Route path="/login" element={<Login />} />
//         <Route path="/dashboard" element={<Dashboard />} />
//         <Route path="/admissions" element={<Admissions />} />
//         <Route path="/student-registration" element={<StudentRegistration />} />
//         <Route path="/finance" element={<Finance />} />
//         <Route path="/hr" element={<HR />} />
//         <Route path="/academics" element={<Academics />} />
//       </Routes>
//     </BrowserRouter>
//   );
// }

// export default App;





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
import MasterDataSource from "./pages/MasterDataSource";
import CarryForward from "./pages/CarryForward";
import CourseTransfer from "./pages/CourseTransfer";

// Academics Pages
import TeacherList from "./pages/Academics/TeacherList";
import StudentTeacherReview from "./pages/Academics/StudentTeacherReview";
import LiveClassReview from "./pages/Academics/LiveClassReview";
import CCTeacherReview from "./pages/Academics/CCTeacherReview";
import HodList from "./pages/Academics/HodList";
import CentreManagement from "./pages/Academics/CentreManagement";
import RMList from "./pages/Academics/RMList";
import ClassCoordinator from "./pages/Academics/ClassCoordinator";
import Classes from "./pages/Academics/Classes";
import MentalSessionTable from "./pages/Academics/MentalSessionTable";
import ClassManagement from "./pages/Academics/ClassManagement";
import ClassList from "./pages/Academics/ClassManagement/ClassList";
import SubjectList from "./pages/Academics/ClassManagement/SubjectList";
import ChapterList from "./pages/Academics/ClassManagement/ChapterList";
import TopicList from "./pages/Academics/ClassManagement/TopicList";
import SectionLeaderBoard from "./pages/Academics/SectionLeaderBoard";
import ExamLeaderBoard from "./pages/Academics/ExamLeaderBoard";

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* <Route path="/" element={<LandingPage />} /> */}
        <Route path="/" element={<Login />} />
        <Route path="/lead-management" element={<LeadManagement />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admissions" element={<Admissions />} />
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
        <Route path="/academics" element={<Academics />} />
        <Route path="/academics/teacher-list" element={<TeacherList />} />
        <Route path="/academics/student-teacher-review" element={<StudentTeacherReview />} />
        <Route path="/academics/live-class-review" element={<LiveClassReview />} />
        <Route path="/academics/cc-teacher-review" element={<CCTeacherReview />} />
        <Route path="/academics/hod-list" element={<HodList />} />
        <Route path="/academics/centre-management" element={<CentreManagement />} />
        <Route path="/academics/rm-list" element={<RMList />} />
        <Route path="/academics/class-coordinator" element={<ClassCoordinator />} />
        <Route path="/academics/classes" element={<Classes />} />
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
        <Route path="/master-data/source" element={<MasterDataSource />} />
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
