#!/bin/bash

# Backend Setup Script
# Run this script to set up the backend environment

set -e  # Exit on error

echo "🚀 Setting up Chat Moderation Backend..."

# Check Python version
echo "📌 Checking Python version..."
python3 --version

# Create virtual environment
echo "📦 Creating virtual environment..."
python3 -m venv venv

# Activate virtual environment
echo "✅ Activating virtual environment..."
source venv/bin/activate

# Upgrade pip
echo "⬆️  Upgrading pip..."
pip install --upgrade pip

# Install dependencies
echo "📥 Installing dependencies..."
pip install -r requirements.txt

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file..."
    cp .env.example .env
    echo "⚠️  Please edit .env file and add your OpenAI API key!"
fi

# Initialize database
echo "🗄️  Initializing database..."
python -c "from database import init_db; init_db()"

echo "✨ Backend setup complete!"
echo ""
echo "To start the backend server:"
echo "  source venv/bin/activate"
echo "  python main.py"
echo ""
echo "Or using uvicorn:"
echo "  uvicorn main:app --host 0.0.0.0 --port 8000 --reload"
