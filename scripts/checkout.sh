#!/bin/bash
set -euo pipefail

echo "🚀 Setting up Yuki-no..."

# Clone Yuki-no repository
git clone https://github.com/Gumball12/yuki-no.git

cd yuki-no

echo "Try to use ${YUKI_NO_VERSION}"

# Checkout the specific version
# If YUKI_NO_VERSION is not set, it will use 'main'
git checkout "${YUKI_NO_VERSION:-main}" || {
  echo "Failed to checkout version ${YUKI_NO_VERSION:-main}"
  echo "Falling back to main branch"
  git checkout main
}

# Check if pnpm is installed, install if not
if ! command -v pnpm &> /dev/null; then
    echo "📦 pnpm not found, installing pnpm..."
    npm install -g pnpm
    echo "✅ pnpm installed successfully"
fi

# Fix workspace package symlink issues when used as plugins
# - Workspace packages get symlinked, but their dist directories don't exist
#   because local packages aren't built, causing runtime failures
# - node-linker=hoisted: Creates flat node_modules, eliminates .pnpm virtual store
# - symlink=false: Prevents workspace package symlinks (overrides special workspace handling)
# - package-import-method=hardlink: Forces hardlinks from global store (consistent across filesystems)
echo "node-linker=hoisted" > .npmrc
echo "symlink=false" >> .npmrc
echo "package-import-method=hardlink" >> .npmrc

# Install base dependencies
echo "📦 Installing base dependencies..."
pnpm install

# Install plugins with exact version requirement
if [ ! -z "${PLUGINS:-}" ]; then
  echo "🔌 Installing plugins with exact version requirement..."
  
  while IFS= read -r plugin; do
    # Skip empty lines and whitespace-only lines
    [[ -z "${plugin// }" ]] && continue
    
    # Check for range versions (not allowed)
    if [[ "$plugin" =~ [~^] ]]; then
      echo "❌ Range versions (^, ~) are not allowed for security and reproducibility: $plugin"
      echo "   Please specify exact version (e.g., plugin@1.0.0) or use @latest"
      exit 1
    fi
    
    # Check if plugin specifies a version
    if [[ ! "$plugin" =~ @ ]]; then
      echo "❌ Plugin must specify a version: $plugin"
      echo "   Use exact version (e.g., plugin@1.0.0) or @latest"
      exit 1
    fi
    
    # Handle latest version with warning
    if [[ "$plugin" =~ @latest$ ]]; then
      echo "⚠️  Warning: Using @latest for $plugin"
      echo "   This will install the latest available version, which may change over time"
      echo "   Consider pinning to a specific version for reproducibility"
    elif [[ ! "$plugin" =~ @[0-9]+\.[0-9]+\.[0-9]+(-[a-zA-Z0-9.-]+)?$ ]]; then
      echo "❌ Invalid version format: $plugin"
      echo "   Use exact version (e.g., plugin@1.0.0, plugin@1.0.0-beta.1) or @latest"
      exit 1
    fi
    
    # Install npm package plugins with exact version
    echo "📦 Installing: $plugin"
    if pnpm add "$plugin"; then
      echo "✅ Successfully installed: $plugin"
    else
      echo "❌ Failed to install plugin: $plugin"
      exit 1
    fi
    
  done <<< "$PLUGINS"
  
  echo "🎉 All plugins installed successfully!"
else
  echo "📝 No plugins specified - using base Yuki-no only"
fi
