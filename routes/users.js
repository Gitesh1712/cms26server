import express from 'express';
import User from '../models/User.js';

const router = express.Router();


/* ---------------- TOGGLE USER ACTIVE STATUS ---------------- */
router.post('/toggle-status', async (req, res) => {
  console.log('Toggle status endpoint hit', req.body);
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ code: "4000", message: "User ID is required" });
    }

    const user = await User.findById(userId);

    if (!user) {
      return res.status(404).json({ code: "4004", message: "User not found" });
    }

    // Prevent deactivating admin users
    if (user.role === 'admin') {
      return res.status(400).json({ code: "4000", message: "Admin users cannot be deactivated" });
    }

    // Toggle the active status
    user.isActive = !user.isActive;
    await user.save();

    const userResponse = user.toObject();
    delete userResponse.password;

    res.json({ 
      code: "1000", 
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`, 
      data: userResponse 
    });
  } catch (error) {
    res.status(500).json({ code: "5000", message: "error", error: error.message });
  }
});

/* ---------------- GET ALL USERS ---------------- */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 20, role } = req.query;
    const filter = role ? { role } : {};

    const users = await User.find(filter)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    const total = await User.countDocuments(filter);

    res.json({
      code: "1000",
      message: "success",
      data: {
        users,
        totalPages: Math.ceil(total / limit),
        currentPage: parseInt(page),
        total
      }
    });
  } catch (error) {
    res.status(500).json({ code: "5000", message: "error", error: error.message });
  }
});

/* ---------------- GET SINGLE USER ---------------- */
router.get('/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ code: "4004", message: "User not found" });
    }

    res.json({ code: "1000", message: "success", data: user });
  } catch (error) {
    res.status(500).json({ code: "5000", message: "error", error: error.message });
  }
});

/* ---------------- CREATE USER ---------------- */
router.post('/', async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({ code: "4000", message: "Email and password are required" });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ code: "4001", message: "User with this email already exists" });
    }

    const user = new User({
      name: name || '',
      email,
      mobile: mobile || '',
      password,
      role: role || 'member'
    });

    await user.save();

    // Return user without password
    const userResponse = user.toObject();
    delete userResponse.password;

    res.status(201).json({ code: "1000", message: "User created successfully", data: userResponse });
  } catch (error) {
    res.status(500).json({ code: "5000", message: "error", error: error.message });
  }
});

/* ---------------- UPDATE USER ---------------- */
router.put('/:id', async (req, res) => {
  try {
    const { name, email, mobile, password, role } = req.body;
    const updateData = {};

    if (name !== undefined) updateData.name = name;
    if (email) updateData.email = email;
    if (mobile !== undefined) updateData.mobile = mobile;
    if (role) updateData.role = role;

    // If password is being updated, hash it
    if (password) {
      const user = await User.findById(req.params.id);
      if (!user) {
        return res.status(404).json({ code: "4004", message: "User not found" });
      }
      user.password = password;
      await user.save(); // This will trigger the pre-save hook to hash password

      // Update other fields if any
      if (email || role) {
        await User.findByIdAndUpdate(req.params.id, updateData);
      }

      const updatedUser = await User.findById(req.params.id).select('-password');
      return res.json({ code: "1000", message: "User updated successfully", data: updatedUser });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({ code: "4004", message: "User not found" });
    }

    res.json({ code: "1000", message: "User updated successfully", data: user });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ code: "4001", message: "Email already in use" });
    }
    res.status(500).json({ code: "5000", message: "error", error: error.message });
  }
});

/* ---------------- DELETE USER ---------------- */
router.delete('/:id', async (req, res) => {
  try {
    // Prevent user from deleting themselves
    if (req.userId === req.params.id) {
      return res.status(400).json({ code: "4000", message: "You cannot delete your own account" });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({ code: "4004", message: "User not found" });
    }

    res.json({ code: "1000", message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ code: "5000", message: "error", error: error.message });
  }
});

export default router;
