
#!/bin/bash

# Frontend Setup Script
# Run this script to set up the frontend environment

set -e  # Exit on error

echo "🚀 Setting up Chat Moderation Frontend..."

# Check Node.js version
echo "📌 Checking Node.js version..."
node --version
npm --version

# Install dependencies
echo "📥 Installing dependencies..."
npm install

# Create .env.local file if it doesn't exist
if [ ! -f .env.local ]; then
    echo "📝 Creating .env.local file..."
    cat > .env.local << EOF
NEXT_PUBLIC_API_URL=http://localhost:8000
NEXT_PUBLIC_WS_URL=ws://localhost:8000
EOF
    echo "✅ Created .env.local with default values"
fi

echo "✨ Frontend setup complete!"
echo ""
echo "To start the development server:"
echo "  npm run dev"
echo ""
echo "To build for production:"
echo "  npm run build"
echo "  npm start"
