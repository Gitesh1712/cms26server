import mongoose from "mongoose";

const CategorySchema = new mongoose.Schema({
  id: { type: String, unique: true, required: true },   // entertainment, tech, etc
  name: { type: String, required: true },
  active: { type: Boolean, default: true }
}, { timestamps: true });

export default mongoose.model("Category", CategorySchema);
