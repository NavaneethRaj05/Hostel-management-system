@echo off
echo 🚀 Starting deployment process...

REM Check if git is available
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ Git is not installed. Please install Git first:
    echo https://git-scm.com/download/win
    pause
    exit /b 1
)

REM Check if git is initialized
if not exist ".git" (
    echo 📦 Initializing git repository...
    git init
    git add .
    git commit -m "Initial commit - Hostel Management System"
)

echo ✅ Git repository ready!
echo.
echo 🌐 Deployment Options:
echo.
echo 1. VERCEL (Recommended - FREE):
echo    - Go to https://vercel.com
echo    - Sign up with GitHub
echo    - Import your repository
echo    - Deploy automatically
echo.
echo 2. NETLIFY (FREE):
echo    - Go to https://netlify.com
echo    - Sign up with GitHub
echo    - Connect your repository
echo    - Deploy automatically
echo.
echo 3. RAILWAY (FREE):
echo    - Go to https://railway.app
echo    - Sign up with GitHub
echo    - Deploy from GitHub
echo.
echo 📖 See DEPLOYMENT.md for detailed instructions
echo.
pause
