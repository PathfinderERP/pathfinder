import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadManagement from '../models/LeadManagement.js';

dotenv.config();

const namesList = [
    "CHAITALI DAS", "SOHANA KHATUN", "SUDESHNA GHOSH", "RESHMI KHATUN", "SRIJONI GHOSH",
    "DEBJANI TURI", "TANDRIMA GOPE", "VISAKHA CHATTERJEE", "SUCHANDA METE", "SAMPA DAS",
    "PUJA PASWAN", "PIU MAJI", "PIU METE", "PRIYA MURMU", "NAYANA SHAW",
    "SONIA THAKUR", "PIU ADITYA", "BISHAKHA ROY", "Rittika pal", "Riya dutta",
    "Partha Ghosh", "Niloy basak", "Biswajit Ghosh", "SANA GHOSH", "SUBARNA MUDI",
    "ANEEK KOLEY", "AROHI DUTTA", "SAYANI ROY", "DEVROP GHOSH", "ANIK DAS",
    "SOUMYAJIT KAR", "ATANU DAS", "ABHIRA MANNA", "SUBHASREE NEOGI", "KABERI KONER",
    "NANDINI SHAW", "NANDINI MAJI", "DEBASMITA PATRA", "ADRIKA LAHA", "SANJANA SHARMA",
    "JESHMIN SULTANA", "SURJITI PASWAN", "AYAN KHAN", "DEBMALYA CHAKRABORTY", "SUBAYU MAHATO",
    "RISHI GIRI", "SAYANTAN DE", "DEBTANUSH CHANDA", "DEBOJIT DAS", "RAJDEEP MAJUMDER",
    "PRITHIBI KOTAL", "AMRIT SHARMA", "CHANDAN DAS", "SUBHADEEP ROY", "PRITAM BISWAS",
    "ARIJIT MONDAL", "JAYSHRI DEY", "SUBHA GHOSH", "RUPAM GHOSH", "SOMDEV KIRTANIYA",
    "SAYAN DAS", "RITAM DAS", "SUDIP MAL", "SAYAN GHOSH", "KUNAL KANKAR",
    "ISHAN MUKHERJEE", "SAPTARSHI KARMAKAR", "AMRITA SINGHA", "SURABHI PAUL", "RIMPA DAS",
    "CHANDRIKA BANIK", "SILJIA BISWAS", "OLIVIA CHOWDHURY", "PIYASA GHOSH", "KOYEL GHOSH",
    "ANUSRIYA SHAW", "SOUMI DAS", "ARPHITA DAS", "SAMPRIKA SARKAR", "SUKANYA POREL",
    "RUPSA SAMANTA", "RIMPA PRAMANIK", "DEEPSHI KHA DAS", "DEEPSHIKHA DAS", "SUDESHNA BISWAS",
    "PRATYUSA MAITY", "SOHINI KHAN", "ANWESHA PAUL", "ANUSHKA SAHA", "APARNA MAHAPATRA",
    "SOHINI ROY", "TINA MONDAL", "ADISA NASKAR", "SHRABANI SRIMANI", "DEBOSMITA GIRI",
    "SANJIT BISWAS", "JAYASHREE RAJAK", "SUBHASHREE RAKSHIT", "ASHRITA NANDI", "JAYA GHOSH",
    "Anusree Chakraborty", "Iman Hazra", "Sneha manna", "Suhana mondal", "RIMPI DEY",
    "DEBASMITA PANJA", "SOUMYADIP KARMAKAR", "Suhan mondal", "Anwesha Das", "Poulami koley",
    "RITIKA ADHIKARI", "Ishita roy", "Samriddhi Ghosh", "Rupam dey", "Anindita kar",
    "SUBHANGI GUCHAIT", "ROUNAK CHAKRABORTY", "SHREYAS GHOSHAL", "ROHAN KHANRA"
];

const run = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        const unmatched = [];
        const matched = [];
        const multipleMatches = [];

        for (const name of namesList) {
            // Trim and search case-insensitively
            const trimmedName = name.trim();
            
            // Try matching as string or regex
            const regex = new RegExp(`^${trimmedName}$`, 'i');
            const leads = await LeadManagement.find({ name: regex });

            if (leads.length === 0) {
                // Try fuzzy regex (e.g. containing or replacing double spaces)
                const leadsFuzzy = await LeadManagement.find({ 
                    name: new RegExp(trimmedName.replace(/\s+/g, '\\s+'), 'i') 
                });
                if (leadsFuzzy.length === 0) {
                    unmatched.push(name);
                } else if (leadsFuzzy.length === 1) {
                    matched.push({ inputName: name, lead: leadsFuzzy[0] });
                } else {
                    multipleMatches.push({ inputName: name, count: leadsFuzzy.length, leads: leadsFuzzy });
                }
            } else if (leads.length === 1) {
                matched.push({ inputName: name, lead: leads[0] });
            } else {
                multipleMatches.push({ inputName: name, count: leads.length, leads });
            }
        }

        console.log(`\n--- SUMMARY ---`);
        console.log(`Total Names in Input: ${namesList.length}`);
        console.log(`Exactly Matched: ${matched.length}`);
        console.log(`Multiple Matches: ${multipleMatches.length}`);
        console.log(`Unmatched: ${unmatched.length}`);

        if (unmatched.length > 0) {
            console.log("\nUnmatched Names:", unmatched);
        }

        if (multipleMatches.length > 0) {
            console.log("\nMultiple Matches:");
            multipleMatches.forEach(m => {
                console.log(`- ${m.inputName}: matched ${m.count} leads`);
                m.leads.forEach(l => {
                    console.log(`  * ID: ${l._id}, Phone: ${l.phoneNumber}, Assigned: ${l.assignedAt}`);
                });
            });
        }

        // Dry run check
        console.log("\nDry run completed. No updates performed.");
        await mongoose.connection.close();
    } catch (err) {
        console.error(err);
    }
};

run();
