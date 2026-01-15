import express from "express";
import Category from "../models/Category.js";
import Post from "../models/Post.js";

const router = express.Router();

/* ---------------- GET ALL CATEGORIES (FRONTEND COMPATIBLE) ---------------- */
router.get("/", async (req, res) => {
  try {
    const categories = await Category
      .find({ active: true })
      .select("id name icon color -_id");

    res.json({
      code: "1000", message: "success", data: categories
    });
  } catch (err) {
    res.status(500).json({
      code: "5000", message: "error", error: err.message
    });
  }
});
export default router;


