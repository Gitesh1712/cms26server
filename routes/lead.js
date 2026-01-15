import express from "express";
import Lead from "../models/Lead.js";

const router = express.Router();

router.post("/submit", async (req, res) => {
  try {
    const { name, email, inquiryType, message,mobile } = req.body;
    console.log(req.body);
    if (!name || !email || !inquiryType || !message) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const lead = await Lead.create({
      name,
      email,
      inquiryType,
      message,
      mobile
    });

    res.status(201).json({
      success: true,
      message: "Lead submitted successfully",
      lead
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
}
);

// router.get("/count", async (req, res) => {
//   try {
//     const countTotal = await Lead.countDocuments();
//     const countToday = await Lead.count
//     res.json({ success: true, totalLeads: countTotal, todayLeads:countToday });
//   } catch (err) {
//     res.status(500).json({ success: false, message: err.message });
//   }
// })
router.get("/count", async (req, res) => {
  try {
    // Start of today (00:00:00)
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    // Start of tomorrow (00:00:00 next day)
    const startOfTomorrow = new Date(startOfToday);
    startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

    const [countTotal, countToday] = await Promise.all([
      Lead.countDocuments(),
      Lead.countDocuments({
        createdAt: {
          $gte: startOfToday,
          $lt: startOfTomorrow
        }
      })
    ]);

    res.json({
      success: true,
      totalLeads: countTotal,
      todayLeads: countToday
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      message: err.message
    });
  }
});
export default router;
