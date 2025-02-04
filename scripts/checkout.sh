#!/bin/bash

# Clone the repository
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
