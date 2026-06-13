import mongoose from 'mongoose';
import dotenv from 'dotenv';
import LeadManagement from '../models/LeadManagement.js';

dotenv.config();

const rawLeadsData = [
  { name: "CHAITALI DAS", contact: "7797573478/N/A" },
  { name: "SOHANA KHATUN", contact: "9732810528/N/A" },
  { name: "SUDESHNA GHOSH", contact: "9475175980/N/A" },
  { name: "RESHMI KHATUN", contact: "6294781252/N/A" },
  { name: "SRIJONI GHOSH", contact: "5932099512/N/A" },
  { name: "DEBJANI TURI", contact: "7076291530/N/A" },
  { name: "TANDRIMA GOPE", contact: "7908950515/N/A" },
  { name: "VISAKHA CHATTERJEE", contact: "6295104431/N/A" },
  { name: "SUCHANDA METE", contact: "7797139946/N/A" },
  { name: "SAMPA DAS", contact: "7797837331/N/A" },
  { name: "PUJA PASWAN", contact: "8536020381/N/A" },
  { name: "PIU MAJI", contact: "8967557041/N/A" },
  { name: "PIU METE", contact: "9002819213/N/A" },
  { name: "PRIYA MURMU", contact: "7548937026/N/A" },
  { name: "NAYANA SHAW", contact: "7797003541/N/A" },
  { name: "SONIA THAKUR", contact: "9883109311/N/A" },
  { name: "PIU ADITYA", contact: "9933182810/N/A" },
  { name: "BISHAKHA ROY", contact: "9330616483/N/A" },
  { name: "Rittika pal", contact: "9038576483/chandannagar@pathfinder.edu.in" },
  { name: "Riya dutta", contact: "8926034546/chandannagar@pathfinder.edu.in" },
  { name: "Partha Ghosh", contact: "9123342304/chandannagar@pathfinder.edu.in" },
  { name: "Niloy basak", contact: "9564625721/chandannagar@pathfinder.edu.in" },
  { name: "Biswajit Ghosh", contact: "9749089585/chandannagar@pathfinder.edu.in" },
  { name: "SANA GHOSH", contact: "8420869757/N/A" },
  { name: "SUBARNA MUDI", contact: "9836894711/N/A" },
  { name: "ANEEK KOLEY", contact: "6291924582/N/A" },
  { name: "AROHI DUTTA", contact: "9732104675/N/A" },
  { name: "SAYANI ROY", contact: "8918691093/N/A" },
  { name: "DEVROP GHOSH", contact: "6290057416/N/A" },
  { name: "ANIK DAS", contact: "8017390403/N/A" },
  { name: "SOUMYAJIT KAR", contact: "6295133201/N/A" },
  { name: "ATANU DAS", contact: "9163208784/N/A" },
  { name: "ABHIRA MANNA", contact: "9330706859/N/A" },
  { name: "SUBHASREE NEOGI", contact: "8768041071/N/A" },
  { name: "KABERI KONER", contact: "9735185541/N/A" },
  { name: "NANDINI SHAW", contact: "8371862414/N/A" },
  { name: "NANDINI MAJI", contact: "6296084713/N/A" },
  { name: "DEBASMITA PATRA", contact: "9679112988/N/A" },
  { name: "ADRIKA LAHA", contact: "9002974254/N/A" },
  { name: "SANJANA SHARMA", contact: "9474325237/N/A" },
  { name: "JESHMIN SULTANA", contact: "9647267205/N/A" },
  { name: "SURJITI PASWAN", contact: "9883807073/N/A" },
  { name: "AYAN KHAN", contact: "9836748626/9836748626/N/A" },
  { name: "DEBMALYA CHAKRABORTY", contact: "9874034870/9874034870/N/A" },
  { name: "SUBAYU MAHATO", contact: "8047929828/8047929828/N/A" },
  { name: "RISHI GIRI", contact: "8617822982/8617822982/N/A" },
  { name: "SAYANTAN DE", contact: "7478670830/7478670830/N/A" },
  { name: "DEBTANUSH CHANDA", contact: "9476847055/9476847055/N/A" },
  { name: "DEBOJIT DAS", contact: "9330030113/9330030113/N/A" },
  { name: "RAJDEEP MAJUMDER", contact: "9748851720/9617417520/N/A" },
  { name: "PRITHIBI KOTAL", contact: "9038238682/8240223610/N/A" },
  { name: "AMRIT SHARMA", contact: "9836612807/8240223610/N/A" },
  { name: "CHANDAN DAS", contact: "9436141461/8582995296/N/A" },
  { name: "SUBHADEEP ROY", contact: "8768829352/N/A" },
  { name: "PRITAM BISWAS", contact: "6296556272/N/A" },
  { name: "ARIJIT MONDAL", contact: "9609050853/N/A" },
  { name: "JAYSHRI DEY", contact: "8967571657/N/A" },
  { name: "SUBHA GHOSH", contact: "9775272765/N/A" },
  { name: "RUPAM GHOSH", contact: "9831218936/N/A" },
  { name: "SOMDEV KIRTANIYA", contact: "9002767837/N/A" },
  { name: "SAYAN DAS", contact: "8759647636/N/A" },
  { name: "RITAM DAS", contact: "9679288685/N/A" },
  { name: "SUDIP MAL", contact: "9732002575/N/A" },
  { name: "SAYAN GHOSH", contact: "9734687183/N/A" },
  { name: "KUNAL KANKAR", contact: "9647453823/N/A" },
  { name: "ISHAN MUKHERJEE", contact: "9674006343/N/A" },
  { name: "SAPTARSHI KARMAKAR", contact: "9830021754/N/A" },
  { name: "AMRITA SINGHA", contact: "9874026194/bbl@gmail.com" },
  { name: "SURABHI PAUL", contact: "9933939023/N/A" },
  { name: "RIMPA DAS", contact: "9977573727/N/A" },
  { name: "CHANDRIKA BANIK", contact: "9798701449/N/A" },
  { name: "SILJIA BISWAS", contact: "7980867823/N/A" },
  { name: "OLIVIA CHOWDHURY", contact: "8910911586/N/A" },
  { name: "PIYASA GHOSH", contact: "9836384285/N/A" },
  { name: "KOYEL GHOSH", contact: "9732168249/N/A" },
  { name: "ANUSRIYA SHAW", contact: "9433747477/N/A" },
  { name: "SOUMI DAS", contact: "9883870479/N/A" },
  { name: "ARPHITA DAS", contact: "9883722950/N/A" },
  { name: "SAMPRIKA SARKAR", contact: "9748518719/N/A" },
  { name: "SUKANYA POREL", contact: "9007955981/N/A" },
  { name: "RUPSA SAMANTA", contact: "9679430472/N/A" },
  { name: "RIMPA PRAMANIK", contact: "7059870892/N/A" },
  { name: "DEEPSHI KHA DAS", contact: "9933153521/N/A" },
  { name: "SUDESHNA BISWAS", contact: "9051680502/N/A" },
  { name: "PRATYUSA MAITY", contact: "7044237839/N/A" },
  { name: "SOHINI KHAN", contact: "9875496071/N/A" },
  { name: "ANWESHA PAUL", contact: "9051651959/N/A" },
  { name: "ANUSHKA SAHA", contact: "9874160322/N/A" },
  { name: "APARNA MAHAPATRA", contact: "9933020448/N/A" },
  { name: "SOHINI ROY", contact: "9123893952/N/A" },
  { name: "TINA MONDAL", contact: "9748957620/N/A" },
  { name: "ADISA NASKAR", contact: "9874765476/N/A" },
  { name: "SHRABANI SRIMANI", contact: "9674870474/N/A" },
  { name: "DEBOSMITA GIRI", contact: "8001043598/N/A" },
  { name: "SANJIT BISWAS", contact: "8436019045/8436019045/N/A" },
  { name: "JAYASHREE RAJAK", contact: "9002045624/9002045624/N/A" },
  { name: "SUBHASHREE RAKSHIT", contact: "9474360666/SUBHA45@GMAIL.COM" },
  { name: "ASHRITA NANDI", contact: "7811825638/ASHRITA56@GMAIL.COM" },
  { name: "JAYA GHOSH", contact: "9733078315/9883378300/N/A" },
  { name: "Anusree Chakraborty", contact: "9933226815/anusree2026@gmail.com" },
  { name: "Iman Hazra", contact: "8617381335/IMONS6@gmail.com" },
  { name: "Sneha manna", contact: "9382075475/sne@gmail.com" },
  { name: "Suhana mondal", contact: "8116542426/suha@gmail.com" },
  { name: "RIMPI DEY", contact: "9977573727/RITIKA67@gmail.com" },
  { name: "DEBASMITA PANJA", contact: "9734344388/DEBASMITA45@GMAIL.COM" },
  { name: "SOUMYADIP KARMAKAR", contact: "8016424483/SOUMYADIP90@GMAIL.COM" },
  { name: "Suhan mondal", contact: "8116542426/suhn@gmail.com" },
  { name: "Anwesha Das", contact: "6296141925/anw@gmail.com" },
  { name: "Poulami koley", contact: "9733970518/Poulami36@gmail.com" },
  { name: "RITIKA ADHIKARI", contact: "8670228051/RITIKA67@gmail.com" },
  { name: "Ishita roy", contact: "8617834559/ish@gmail.com" },
  { name: "Samriddhi Ghosh", contact: "7595939001/some@gmail.com" },
  { name: "Rupam dey", contact: "9609642086/rup@gmail.com" },
  { name: "Anindita kar", contact: "9800566291/anin@gmail.com" },
  { name: "SUBHANGI GUCHAIT", contact: "9733794351/subhangi89@gmail.com" },
  { name: "ROUNAK CHAKRABORTY", contact: "6294235745/rounak78@gmail.com" },
  { name: "SHREYAS GHOSHAL", contact: "9593362313/sheyas65@gmail.com" },
  { name: "ROHAN KHANRA", contact: "9547495996/arnab65@gmail.com" }
];

const TARGET_DATE = new Date("2026-06-16T00:00:00.000Z");

const executeUpdate = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URL);
        console.log("Connected to MongoDB.");

        let matchedCount = 0;
        let multipleMatchedCount = 0;
        let unmatchedCount = 0;
        let updatedCount = 0;

        for (const entry of rawLeadsData) {
            const trimmedName = entry.name.trim();
            const contactParts = entry.contact.split('/');
            
            const phones = [];
            let email = null;

            contactParts.forEach(part => {
                const trimmedPart = part.trim();
                if (trimmedPart.includes('@')) {
                    email = trimmedPart;
                } else if (/^\d{8,11}$/.test(trimmedPart)) {
                    phones.push(trimmedPart);
                }
            });

            // Try query matching
            const queryConditions = [];
            if (phones.length > 0) {
                queryConditions.push({ phoneNumber: { $in: phones } });
                queryConditions.push({ secondPhoneNumber: { $in: phones } });
            }
            if (email) {
                queryConditions.push({ email: email });
            }

            let leads = [];
            if (queryConditions.length > 0) {
                leads = await LeadManagement.find({ $or: queryConditions });
            }

            // Fallback to name search if no phone/email matched
            if (leads.length === 0) {
                leads = await LeadManagement.find({ name: new RegExp(`^${trimmedName}$`, 'i') });
            }

            if (leads.length === 1) {
                const lead = leads[0];
                lead.nextFollowUpDate = TARGET_DATE;
                await lead.save();
                updatedCount++;
                matchedCount++;
            } else if (leads.length > 1) {
                // Try narrowing down exactly by name if multiple matched by phone
                const filteredByName = leads.filter(l => l.name.toLowerCase() === trimmedName.toLowerCase());
                if (filteredByName.length === 1) {
                    const lead = filteredByName[0];
                    lead.nextFollowUpDate = TARGET_DATE;
                    await lead.save();
                    updatedCount++;
                    matchedCount++;
                } else {
                    console.log(`[MULTIPLE] Could not resolve unique lead for ${entry.name}. Matches: ${leads.length}`);
                    multipleMatchedCount++;
                }
            } else {
                console.log(`[UNMATCHED] No record found for: ${entry.name} (${entry.contact})`);
                unmatchedCount++;
            }
        }

        console.log("\n--- UPDATE COMPLETED ---");
        console.log(`Total records processed: ${rawLeadsData.length}`);
        console.log(`Successfully matched: ${matchedCount}`);
        console.log(`Updated nextFollowUpDate to 16/06/2026: ${updatedCount}`);
        console.log(`Multiple matches unresolved: ${multipleMatchedCount}`);
        console.log(`Unmatched records: ${unmatchedCount}`);

        await mongoose.connection.close();
        console.log("Disconnected from MongoDB.");
    } catch (err) {
        console.error("Error running update:", err);
    }
};

executeUpdate();
