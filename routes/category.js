import express from "express";
import Category from "../models/Category.js";
import Post from "../models/Post.js";

const router = express.Router();

/* ---------------- CREATE CATEGORY ---------------- */
router.post("/add", async (req, res) => {
  try {
    const { id, name} = req.body;

    if (!id || !name) {
      return res.status(400).json({ error: "All fields required" });
    }

    const exists = await Category.findOne({ name });
    if (exists) return res.status(400).json({ error: "Category already exists" });

    const category = new Category({ id, name });
    await category.save();

    res.status(201).json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});


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


/* ---------------- UPDATE CATEGORY ---------------- */
router.put("/:id", async (req, res) => {
  try {
    const category = await Category.findOneAndUpdate(
      { id: req.params.id },
      req.body,
      { new: true }
    );
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json(category);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ---------------- DELETE CATEGORY ---------------- */
router.delete("/:id", async (req, res) => {
  try {
    // Check if any posts are using this category
    const postsUsingCategory = await Post.countDocuments({ category: req.params.id });
    
    if (postsUsingCategory > 0) {
      return res.status(400).json({ 
        message: "Category already used in post, hence cannot be deleted.",
        postsCount: postsUsingCategory,
        error: "Category already used in post, hence cannot be deleted." 
      });
    }

    const category = await Category.findOneAndDelete({ id: req.params.id });
    if (!category) return res.status(404).json({ error: "Category not found" });
    res.json({ message: "Category deleted" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;


