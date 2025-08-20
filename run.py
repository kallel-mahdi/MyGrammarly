#!/usr/bin/env python3
"""
MyGrammarly Development Server

Simple script to run the MyGrammarly application in development mode.
This script provides a convenient way to start the server with proper
error handling and informative messages.

Usage:
    python run.py

The script will:
1. Check for required dependencies
2. Start the Flask development server
3. Provide helpful startup messages and URLs
"""

import sys
import subprocess
import importlib.util
from pathlib import Path

def check_dependencies():
    """Check if required Python packages are installed"""
    required_packages = ['flask', 'language_tool_python']
    missing_packages = []
    
    for package in required_packages:
        if importlib.util.find_spec(package) is None:
            missing_packages.append(package)
    
    if missing_packages:
        print("❌ Missing required packages:", ', '.join(missing_packages))
        print("\nTo install missing packages, run:")
        print(f"pip install {' '.join(missing_packages)}")
        return False
    
    return True

def main():
    """Main entry point"""
    print("🚀 MyGrammarly Development Server")
    print("=" * 40)
    
    # Check if we're in the correct directory
    if not Path('app.py').exists():
        print("❌ Error: app.py not found in current directory")
        print("Please run this script from the MyGrammarly project root")
        sys.exit(1)
    
    # Check dependencies
    print("🔍 Checking dependencies...")
    if not check_dependencies():
        sys.exit(1)
    
    print("✅ All dependencies found")
    print("\n📝 Starting MyGrammarly server...")
    print("📍 URL: http://127.0.0.1:5001")
    print("🛑 Press Ctrl+C to stop the server")
    print("-" * 40)
    
    try:
        # Run the Flask application
        subprocess.run([sys.executable, 'app.py'], check=True)
    except KeyboardInterrupt:
        print("\n\n👋 Server stopped by user")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Server error: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n💥 Unexpected error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
