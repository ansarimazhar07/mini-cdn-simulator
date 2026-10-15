@echo off
setlocal enabledelayedexpansion
title Mini CDN Simulator - Distributed Systems Project

echo ========================================================
echo        Mini CDN Simulator - Startup Script
echo        Distributed Systems Course Project (CS-402)
echo ========================================================
echo.

:: 1. Check if Python is installed
where python >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Python was not found in your system PATH!
    echo Please install Python 3.8+ from https://www.python.org/
    echo Make sure to check "Add Python to PATH" during installation.
    echo.
    pause
    exit /b 1
)

echo [1/4] Found Python:
python --version
echo.

:: 2. Create virtual environment if it doesn't already exist
if not exist ".venv\Scripts\activate.bat" (
    echo [2/4] Creating Python virtual environment in .venv ...
    python -m venv .venv
    if %errorlevel% neq 0 (
        echo [ERROR] Failed to create virtual environment!
        pause
        exit /b 1
    )
    echo Virtual environment created successfully.
) else (
    echo [2/4] Virtual environment (.venv) already exists.
)
echo.

:: 3. Activate virtual environment and install requirements
echo [3/4] Activating virtual environment and verifying dependencies...
call .venv\Scripts\activate.bat
if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment!
    pause
    exit /b 1
)

pip install -r requirements.txt
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Failed to install required packages from requirements.txt!
    echo Please check your internet connection or Python pip setup.
    echo.
    pause
    exit /b 1
)
echo Dependencies verified successfully.
echo.

:: 4. Start the Flask application
echo [4/4] Starting Mini CDN Simulator...
echo.
echo ========================================================
echo   Application URL: http://127.0.0.1:5000/
echo   Press CTRL+C in this terminal window to stop the server.
echo ========================================================
echo.

python app.py

if %errorlevel% neq 0 (
    echo.
    echo [NOTICE] Application terminated with exit code %errorlevel%.
    echo.
    pause
)
