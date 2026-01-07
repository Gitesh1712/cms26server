# Kaivailayam Backend API

Complete MERN stack backend for Kaivailayam CMS.

## Setup Instructions

### 1. Install Dependencies

```bash
cd server
npm install
```

### 2. Setup Environment Variables

Create a `.env` file in the server directory:

```env
PORT=5000
MONGODB_URI=mongodb://localhost:27017/kaivailayam
JWT_SECRET=your-secret-key-here
```

### 3. Start MongoDB

Make sure MongoDB is installed and running on your system.

**Windows:**
```bash
net start MongoDB
```

**Mac/Linux:**
```bash
sudo systemctl start mongod
# or
brew services start mongodb-community
```

### 4. Run the Server

**Development mode (with auto-reload):**
```bash
npm run dev
```

**Production mode:**
```bash
npm start
```

The server will run on `http://localhost:5000`

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login user

### Posts
- `GET /api/posts` - Get all posts (query params: category, featured, heroContent, topStory, limit, page)
- `GET /api/posts/:id` - Get single post
- `POST /api/posts` - Create new post (multipart/form-data with files)
- `PUT /api/posts/:id` - Update post (multipart/form-data with files)
- `DELETE /api/posts/:id` - Delete post

## File Upload

Uploaded files are stored in:
- `server/uploads/images/` - Images
- `server/uploads/videos/` - Videos

Files are served at `http://localhost:5000/uploads/`

## Database Models

### Post
- title, description, category, type
- media (array of {url, type})
- author, tags, featured, views
- heroContent, topStory, categoryHighlight

### User
- email, password (hashed with bcrypt)
- role (admin, editor)

## Technology Stack

- **Node.js** - Runtime
- **Express** - Web framework
- **MongoDB** - Database
- **Mongoose** - ODM
- **Multer** - File uploads
- **JWT** - Authentication
- **bcryptjs** - Password hashing

