// import AcademicsClass from "../../models/Academics/Academics_class.js";
// import AcademicsSubject from "../../models/Academics/Academics_subject.js";
// import AcademicsChapter from "../../models/Academics/Academics_chapter.js";
// import AcademicsTopic from "../../models/Academics/Academics_topic.js";

// export const seedAcademicsData = async (req, res) => {
//     try {
//         // 1. Create Classes
//         const classesData = ["Class 11 Science", "Class 12 Science"];
//         const classes = [];

//         for (const className of classesData) {
//             let cls = await AcademicsClass.findOne({ className });
//             if (!cls) {
//                 cls = new AcademicsClass({ className });
//                 await cls.save();
//             }
//             classes.push(cls);
//         }

//         // 2. Create Subjects
//         const subjectsData = [
//             { name: "Physics", classIndex: 0 },
//             { name: "Chemistry", classIndex: 0 },
//             { name: "Mathematics", classIndex: 1 },
//             { name: "Biology", classIndex: 1 }
//         ];
//         const subjects = [];

//         for (const sub of subjectsData) {
//             const classId = classes[sub.classIndex]._id;
//             let subject = await AcademicsSubject.findOne({ subjectName: sub.name, classId });
//             if (!subject) {
//                 subject = new AcademicsSubject({ subjectName: sub.name, classId });
//                 await subject.save();
//             }
//             subjects.push(subject);
//         }

//         // 3. Create Chapters
//         // Physics (Index 0) -> "Kinematics", "Laws of Motion"
//         // Chemistry (Index 1) -> "Thermodynamics", "Chemical Bonding"
//         const chaptersData = [
//             { name: "Kinematics", subjectIndex: 0 },
//             { name: "Laws of Motion", subjectIndex: 0 },
//             { name: "Thermodynamics", subjectIndex: 1 },
//             { name: "Chemical Bonding", subjectIndex: 1 },
//             { name: "Calculus", subjectIndex: 2 },
//             { name: "Genetics", subjectIndex: 3 }
//         ];
//         const chapters = [];

//         for (const chap of chaptersData) {
//             const subjectId = subjects[chap.subjectIndex]._id;
//             let chapter = await AcademicsChapter.findOne({ chapterName: chap.name, subjectId });
//             if (!chapter) {
//                 chapter = new AcademicsChapter({ chapterName: chap.name, subjectId });
//                 await chapter.save();
//             }
//             chapters.push(chapter);
//         }

//         // 4. Create Topics
//         // Kinematics (Index 0) -> "Velocity", "Acceleration"
//         // Thermodynamics (Index 2) -> "Entropy", "Enthalpy"
//         const topicsData = [
//             { name: "Velocity", chapterIndex: 0 },
//             { name: "Acceleration", chapterIndex: 0 },
//             { name: "Newton's First Law", chapterIndex: 1 },
//             { name: "Entropy", chapterIndex: 2 },
//             { name: "Enthalpy", chapterIndex: 2 },
//             { name: "Ionic Bonds", chapterIndex: 3 },
//             { name: "Integration", chapterIndex: 4 },
//             { name: "DNA Replication", chapterIndex: 5 }
//         ];

//         for (const top of topicsData) {
//             const chapterId = chapters[top.chapterIndex]._id;
//             let topic = await AcademicsTopic.findOne({ topicName: top.name, chapterId });
//             if (!topic) {
//                 topic = new AcademicsTopic({ topicName: top.name, chapterId });
//                 await topic.save();
//             }
//         }

//         res.status(200).json({ message: "Demo data seeded successfully!" });

//     } catch (error) {
//         console.error("Seeding error:", error);
//         res.status(500).json({ message: "Seeding failed", error: error.message });
//     }
// };









import AcademicsClass from "../../models/Academics/Academics_class.js";
import AcademicsSubject from "../../models/Academics/Academics_subject.js";
import AcademicsChapter from "../../models/Academics/Academics_chapter.js";
import AcademicsTopic from "../../models/Academics/Academics_topic.js";

export const seedAcademicsData = async (req, res) => {
    try {
        /* =========================
           1. CLASSES
        ========================== */
        const classesData = ["Class 11 Science", "Class 12 Science"];
        const classMap = {};

        for (const className of classesData) {
            let cls = await AcademicsClass.findOne({ className });
            if (!cls) {
                cls = await AcademicsClass.create({ className });
            }
            classMap[className] = cls._id;
        }

        /* =========================
           2. SUBJECTS → CHAPTERS → TOPICS
        ========================== */
        const academicsData = {
            "Class 11 Science": {
                Physics: {
                    "Kinematics": ["Distance & Displacement", "Velocity", "Acceleration"],
                    "Laws of Motion": ["Newton’s Laws", "Friction", "Circular Motion"],
                    "Work, Energy and Power": ["Work-Energy Theorem", "Kinetic Energy", "Power"]
                },
                Chemistry: {
                    "Some Basic Concepts of Chemistry": ["Mole Concept", "Stoichiometry"],
                    "Thermodynamics": ["System & Surroundings", "Enthalpy", "Entropy"],
                    "Chemical Bonding": ["Ionic Bond", "Covalent Bond", "VSEPR Theory"]
                },
                Mathematics: {
                    "Sets": ["Types of Sets", "Venn Diagrams"],
                    "Relations and Functions": ["Relations", "Functions"],
                    "Trigonometry": ["Trigonometric Ratios", "Identities"]
                },
                Biology: {
                    "Cell Structure and Function": ["Cell Theory", "Cell Organelles"],
                    "Biological Classification": ["Five Kingdom Classification"],
                    "Plant Kingdom": ["Algae", "Bryophytes", "Pteridophytes"]
                }
            },

            "Class 12 Science": {
                Physics: {
                    "Electrostatics": ["Electric Charge", "Coulomb’s Law", "Electric Field"],
                    "Current Electricity": ["Ohm’s Law", "Kirchhoff’s Laws"],
                    "Magnetism": ["Biot Savart Law", "Ampere’s Law"]
                },
                Chemistry: {
                    "Solid State": ["Types of Solids", "Crystal Lattice"],
                    "Solutions": ["Concentration Terms", "Colligative Properties"],
                    "Electrochemistry": ["Redox Reactions", "Electrochemical Cells"]
                },
                Mathematics: {
                    "Relations and Functions": ["Inverse Functions"],
                    "Calculus": ["Limits", "Continuity", "Differentiation", "Integration"],
                    "Vectors": ["Vector Algebra", "Scalar Product"]
                },
                Biology: {
                    "Reproduction": ["Human Reproduction", "Reproductive Health"],
                    "Genetics": ["Mendel’s Laws", "DNA Replication"],
                    "Evolution": ["Origin of Life", "Natural Selection"]
                }
            }
        };

        /* =========================
           3. INSERT DATA
        ========================== */
        for (const className in academicsData) {
            const classId = classMap[className];

            for (const subjectName in academicsData[className]) {
                let subject = await AcademicsSubject.findOne({ subjectName, classId });
                if (!subject) {
                    subject = await AcademicsSubject.create({ subjectName, classId });
                }

                for (const chapterName in academicsData[className][subjectName]) {
                    let chapter = await AcademicsChapter.findOne({
                        chapterName,
                        subjectId: subject._id
                    });

                    if (!chapter) {
                        chapter = await AcademicsChapter.create({
                            chapterName,
                            subjectId: subject._id
                        });
                    }

                    for (const topicName of academicsData[className][subjectName][chapterName]) {
                        const exists = await AcademicsTopic.findOne({
                            topicName,
                            chapterId: chapter._id
                        });

                        if (!exists) {
                            await AcademicsTopic.create({
                                topicName,
                                chapterId: chapter._id
                            });
                        }
                    }
                }
            }
        }

        res.status(200).json({
            message: "Academics data (Classes → Subjects → Chapters → Topics) seeded successfully ✅"
        });

    } catch (error) {
        console.error("Seeding error:", error);
        res.status(500).json({
            message: "Seeding failed ❌",
            error: error.message
        });
    }
};
