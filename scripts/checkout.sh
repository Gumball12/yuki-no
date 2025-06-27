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

# Install base dependencies
echo "📦 Installing base dependencies..."
yarn install

# Install plugins with exact version requirement
if [ ! -z "${PLUGINS:-}" ]; then
  echo "🔌 Installing plugins with exact version requirement..."
  
  while IFS= read -r plugin; do
    # Skip empty lines
    [[ -z "$plugin" ]] && continue
    
    # Check if npm plugin has exact version specified
    if [[ ! "$plugin" =~ @[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
      echo "❌ Plugin must specify exact version (e.g., plugin@1.0.0): $plugin"
      echo "   Range versions (^, ~) and latest are not allowed for security and reproducibility"
      exit 1
    fi
    
    # Install npm package plugins with exact version
    echo "📦 Installing: $plugin"
    if yarn add "$plugin"; then
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
