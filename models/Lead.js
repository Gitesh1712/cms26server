import mongoose from "mongoose";

const leadSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },

  email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },

  inquiryType: {
    type: String,
    enum: ["General", "Partnership", "Support"],
    required: true
  },  

  message: {
    type: String,
    required: true
  },
  mobile: {
    type: String,
    required: true
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

export default mongoose.model("Lead", leadSchema);
