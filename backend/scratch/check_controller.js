import { createPlanner, getPlanners, updatePlannerApproval } from "../controllers/leadManagement/marketingPlannerController.js";
import MarketingPlanner from "../models/MarketingPlanner.js";

console.log("Imports successful!");
console.log("createPlanner:", typeof createPlanner);
console.log("getPlanners:", typeof getPlanners);
console.log("updatePlannerApproval:", typeof updatePlannerApproval);
console.log("MarketingPlanner:", typeof MarketingPlanner);
process.exit(0);
