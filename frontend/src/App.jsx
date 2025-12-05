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

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/admissions" element={<Admissions />} />
        <Route path="/student-registration" element={<StudentRegistration />} />
        <Route path="/student-admission/:studentId" element={<StudentAdmission />} />
        <Route path="/admission/:studentId" element={<StudentAdmissionPage />} />
        <Route path="/finance" element={<Finance />} />
        <Route path="/hr" element={<HR />} />
        <Route path="/academics" element={<Academics />} />
        <Route path="/master-data" element={<MasterData />} />
        <Route path="/master-data/class" element={<MasterDataClass />} />
        <Route path="/master-data/exam-tag" element={<MasterDataExamTag />} />
        <Route path="/master-data/department" element={<MasterDataDepartment />} />
        <Route path="/master-data/centre" element={<MasterDataCentre />} />
        <Route path="/course-management" element={<MasterDataCourse />} />
        <Route path="/enrolled-students" element={<EnrolledStudents />} />
        <Route path="/user-management" element={<UserManagement />} />
        <Route path="/profile" element={<Profile />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
