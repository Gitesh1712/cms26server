import mongoose from 'mongoose';
import User from './models/User.js';
import dotenv from 'dotenv';

dotenv.config();

const createAdminUser = async () => {
  try {
    const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || `mongodb://localhost:27017/${process.env.DB_NAME || 'kaivailayam'}`;
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

   
    const existingAdmin = await User.findOne({ email: 'admin@example.com' });
    
    if (existingAdmin) {
      console.log('⚠️  Admin user already exists');
      process.exit(0);
    }

    
    const admin = new User({
      email: 'admin@example.com',
      password: 'admin123', 
      role: 'admin'
    });

    await admin.save();
    console.log('✅ Admin user created successfully');
    console.log('📧 Email: admin@example.com');
    console.log('🔑 Password: admin123');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

createAdminUser();
