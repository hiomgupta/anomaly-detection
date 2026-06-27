# Intelligent Banking Document Fraud Detection System

This repository contains the full-stack implementation of the Canara Bank Hackathon project. The system uses a FastAPI backend with Python-based forensic modules (EasyOCR, OpenCV, PyPDF2) and a maximalist, atmospheric React frontend.

## 🚀 Running the Application Locally

Follow these exact steps to run the full-stack application on your local machine (Windows).

### 1. Backend Setup

Open a terminal and navigate to the `backend` directory. We will create a virtual environment, install the dependencies, and start the FastAPI server.

```bash
# Navigate to the backend directory
cd backend

# Create a virtual environment
python -m venv venv

# Activate the virtual environment
.\venv\Scripts\activate

# Install the required Python packages (including OpenCV headless & EasyOCR)
pip install -r requirements.txt

# Start the FastAPI server on port 8000
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> **Database Note**: The SQLite database (`bank_audit.db`) is configured to auto-generate in the root of the backend folder the very first time an API request is made. No manual migration or setup is required.

### 2. Frontend Setup

Open a **new, separate terminal** (keep the backend server running) and navigate to the `frontend` directory.

```bash
# Navigate to the frontend directory
cd frontend

# Install the Node dependencies
npm install

# Start the React development server (typically runs on port 3000 or 5173 depending on your bundler)
npm start 
# OR use `npm run dev` if you set up the project with Vite
```

Once the development server is running, open your browser and navigate to `http://localhost:3000` (or the local URL provided in the terminal output) to access the Canara Bank Intelligence Dashboard.
