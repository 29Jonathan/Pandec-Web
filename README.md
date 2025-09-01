# Pandec Web - Logistics Order Management System

A full-stack web application for managing logistics orders, documents, and user collaboration in the shipping and freight industry.

## 🚀 Project Overview

Pandec Web is a comprehensive logistics management platform that enables users to create, track, and manage shipping orders, upload and share documents, and collaborate with other users in the system. The application provides role-based access control, real-time notifications, and a user-friendly interface for managing complex logistics operations.

## ✨ Features

### 🔐 Authentication & User Management
- **User Registration & Login**: Secure authentication using Supabase Auth
- **Role-Based Access**: Support for Customer, Factory, and Admin roles
- **User Profiles**: Complete user profiles with contact information and addresses
- **User Search**: Find and connect with other users in the system

### 📦 Order Management
- **Create Orders**: Comprehensive order creation with detailed logistics information
- **Order Tracking**: Real-time tracking of order status and logistics progress
- **Access Control**: Orders are only visible to the creator, shipper, customer, and admin
- **Status Updates**: Update order logistics status with automatic notifications
- **Order Deletion**: Secure order deletion with proper permissions

### 📄 Document Management
- **File Upload**: Upload documents with secure storage in Supabase
- **File Sharing**: Share files with specific users or admin
- **File Download**: Secure file downloads with signed URLs
- **File Deletion**: Remove files with proper access control
- **Document Tracking**: Track uploaded files and their recipients

### 🔔 Notifications System
- **Real-time Notifications**: Get notified of order status changes
- **Notification Center**: Centralized notification management
- **Read/Unread Status**: Track notification status
- **Bulk Actions**: Mark all notifications as read

### 🎯 User Collaboration
- **Find Users**: Search for other users by username
- **User Profiles**: View detailed user information
- **Contact Information**: Access user contact details and addresses
- **Role Display**: See user roles and permissions

### 🛡️ Security & Permissions
- **JWT Authentication**: Secure token-based authentication
- **Role-Based Permissions**: Different access levels based on user roles
- **Data Privacy**: Users can only access their own data and shared content
- **Admin Controls**: Administrative oversight of all system activities

## 🏗️ Technology Stack

### Backend
- **Django 5.0.6**: Python web framework
- **Django REST Framework**: API development
- **PostgreSQL**: Primary database (via Supabase)
- **SQLite**: Local development database
- **JWT Authentication**: Custom Supabase JWT authentication

### Frontend
- **React 19.1.1**: Modern React with hooks
- **TypeScript**: Type-safe JavaScript
- **Vite**: Fast build tool and development server
- **React Bootstrap**: UI components and styling
- **React Router**: Client-side routing
- **Axios**: HTTP client for API calls

### External Services
- **Supabase**: Authentication, storage, and database
- **Supabase Auth**: User authentication and management
- **Supabase Storage**: File storage and management

## 📋 Prerequisites

Before setting up the project, ensure you have the following installed:

- **Node.js** (v18 or higher)
- **Python** (v3.8 or higher)
- **Git**
- **Supabase Account** (for authentication and storage)

## 🚀 Setup Instructions

### Step 1: Clone the Repository

```bash
git clone <repository-url>
cd pandec_web
```

### Step 2: Configure Environment Variables

#### Backend Configuration

1. Navigate to the backend directory:
```bash
cd backend
```

2. Copy the environment template:
```bash
cp .env.example .env
```

3. Edit `.env` file with your configuration:
```env
SECRET_KEY=your-secret-key-here
DEBUG=True
ALLOWED_HOSTS=localhost,127.0.0.1
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-supabase-anon-key
SUPABASE_JWKS_URL=https://your-project.supabase.co/auth/v1/keys
SUPABASE_JWT_SECRET=your-jwt-secret
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
ADMIN_EMAIL=admin@example.com
CORS_ALLOWED_ORIGINS=http://localhost:5173
DATABASE_URL=postgres://postgres:[YOUR-PASSWORD]@db.your-project.supabase.co:5432/postgres?sslmode=require
```

#### Frontend Configuration

1. Navigate to the frontend directory:
```bash
cd ../frontend
```

2. Copy the environment template:
```bash
cp .env.example .env
```

3. Edit `.env` file with your configuration:
```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
VITE_API_BASE_URL=http://127.0.0.1:8000
```

### Step 3: Set Up Supabase

1. **Create a Supabase Project**:
   - Go to [supabase.com](https://supabase.com)
   - Create a new project
   - Note down your project URL and API keys

2. **Configure Authentication**:
   - In Supabase Dashboard, go to Authentication > Settings
   - Configure your site URL and redirect URLs
   - Set up email templates if needed

3. **Create Storage Bucket**:
   - Go to Storage in Supabase Dashboard
   - Create a bucket named `uploads`
   - Set appropriate permissions

### Step 4: Set Up Backend

1. Navigate to the backend directory:
```bash
cd backend
```

2. Create and activate virtual environment:
```bash
python3 -m venv .venv
source .venv/bin/activate  # On Windows: .venv\Scripts\activate
```

3. Install dependencies:
```bash
pip install -r requirements.txt
```

4. Run database migrations:
```bash
python manage.py migrate
```

5. Create a superuser (optional):
```bash
python manage.py createsuperuser
```

6. Sync existing users (if any):
```bash
python manage.py sync_existing_users
```

7. Start the backend server:
```bash
python manage.py runserver 0.0.0.0:8000
```

The backend will be available at `http://localhost:8000`

### Step 5: Set Up Frontend

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev -- --host
```

The frontend will be available at `http://localhost:5173`

## 🧪 Testing the Application

### 1. User Registration and Login

1. Open `http://localhost:5173` in your browser
2. Click "Sign Up" to create a new account
3. Fill in the registration form with:
   - Username
   - Email
   - Password
   - Contact information
   - Role (Customer or Factory)
4. Complete registration and verify you can log in

### 2. Create and Manage Orders

1. **Navigate to "Create Order"**:
   - Click on "Create Order" in the navigation
   - Fill in the order form with required information
   - Use valid usernames for Shipper and Customer fields
   - Submit the order

2. **Test Order Access Control**:
   - Create an order as one user
   - Log in as the shipper or customer to verify they can see the order
   - Log in as a different user to verify they cannot see the order

### 3. Document Management

1. **Upload Documents**:
   - Go to "Documents" page
   - Upload a file
   - Specify a recipient username (optional)
   - Verify the file appears in the documents list

2. **Test Document Access**:
   - Upload a file as one user
   - Log in as the recipient to verify they can see the file
   - Test download and delete functionality

### 4. User Search and Collaboration

1. **Find Users**:
   - Go to "Find User" page
   - Search for other users by username
   - Verify user information is displayed correctly

2. **Test Notifications**:
   - Create an order or update order status
   - Check that notifications appear for relevant users
   - Test notification read/unread functionality

### 5. Admin Functions

1. **Access Admin Panel**:
   - Go to `http://localhost:8000/admin`
   - Log in with superuser credentials
   - Explore the admin interface for managing orders, users, and files

## 🔧 Development Commands

### Backend Commands

```bash
# Run migrations
python manage.py migrate

# Create superuser
python manage.py createsuperuser

# Sync user profiles
python manage.py sync_existing_users

# Check for issues
python manage.py check

# Run tests
python manage.py test
```

### Frontend Commands

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Run linting
npm run lint

# Preview production build
npm run preview
```

## 📁 Project Structure

```
pandec_web/
├── backend/                 # Django backend
│   ├── core/               # Django project settings
│   ├── orders/             # Main app with models, views, serializers
│   ├── manage.py           # Django management script
│   └── requirements.txt    # Python dependencies
├── frontend/               # React frontend
│   ├── src/
│   │   ├── components/     # Reusable React components
│   │   ├── pages/          # Page components
│   │   ├── hooks/          # Custom React hooks
│   │   └── lib/            # Utility libraries
│   ├── package.json        # Node.js dependencies
│   └── vite.config.ts      # Vite configuration
└── README.md              # This file
```

## 🐛 Troubleshooting

### Common Issues

1. **Database Connection Errors**:
   - Verify your `DATABASE_URL` in `.env`
   - Check Supabase project status
   - Ensure database migrations are applied

2. **Authentication Issues**:
   - Verify Supabase URL and API keys
   - Check CORS settings
   - Ensure user profiles are synced

3. **File Upload Issues**:
   - Verify Supabase storage bucket exists
   - Check storage permissions
   - Ensure proper bucket configuration

4. **Frontend Build Issues**:
   - Clear node_modules and reinstall: `rm -rf node_modules && npm install`
   - Check TypeScript errors: `npm run lint`
   - Verify environment variables are set correctly

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature-name`
3. Make your changes
4. Test thoroughly
5. Commit your changes: `git commit -m 'Add feature'`
6. Push to the branch: `git push origin feature-name`
7. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 📞 Support

For support and questions:
- Create an issue in the repository
- Contact the development team
- Check the documentation

---

**Pandec Web** - Streamlining logistics management for the modern shipping industry.
