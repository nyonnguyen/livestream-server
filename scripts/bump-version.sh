#!/bin/bash
#
# Version Bump Script
# Automatically bumps version based on commit/branch patterns
#
# Usage:
#   ./scripts/bump-version.sh patch    # Bump patch version (1.0.0 -> 1.0.1)
#   ./scripts/bump-version.sh minor    # Bump minor version (1.0.0 -> 1.1.0)
#   ./scripts/bump-version.sh major    # Bump major version (1.0.0 -> 2.0.0)
#   ./scripts/bump-version.sh auto     # Auto-detect from git branch/commits
#

set -e

VERSION_FILE="VERSION"
BUMP_TYPE="${1:-auto}"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Read current version
if [ ! -f "$VERSION_FILE" ]; then
    print_error "VERSION file not found"
    exit 1
fi

CURRENT_VERSION=$(cat "$VERSION_FILE" | tr -d '\n')
print_info "Current version: $CURRENT_VERSION"

# Parse semantic version
IFS='.' read -r -a VERSION_PARTS <<< "$CURRENT_VERSION"
MAJOR="${VERSION_PARTS[0]}"
MINOR="${VERSION_PARTS[1]}"
PATCH="${VERSION_PARTS[2]}"

# Auto-detect bump type from git
if [ "$BUMP_TYPE" = "auto" ]; then
    print_info "Auto-detecting version bump type..."

    # Get current branch name
    BRANCH=$(git rev-parse --abbrev-ref HEAD)

    # Get recent commits since last version tag
    LAST_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")
    if [ -n "$LAST_TAG" ]; then
        COMMITS=$(git log "$LAST_TAG"..HEAD --pretty=format:"%s" 2>/dev/null || git log --pretty=format:"%s" -10)
    else
        COMMITS=$(git log --pretty=format:"%s" -10)
    fi

    # Priority order: breaking > fix > feature > default(patch)

    # Detect breaking changes (major bump)
    if echo "$COMMITS" | grep -qiE "^(BREAKING|break:)"; then
        BUMP_TYPE="major"
        print_info "Detected breaking changes → MAJOR bump"
    elif echo "$BRANCH" | grep -qiE "(breaking|major)/"; then
        BUMP_TYPE="major"
        print_info "Breaking change branch detected → MAJOR bump"

    # Detect bug fixes (patch bump) - check BEFORE feature detection
    elif echo "$COMMITS" | grep -qiE "^(fix|bugfix|hotfix):"; then
        BUMP_TYPE="patch"
        print_info "Detected bug fixes → PATCH bump"
    elif echo "$BRANCH" | grep -qiE "(fix|bugfix|hotfix)/"; then
        BUMP_TYPE="patch"
        print_info "Fix branch detected → PATCH bump"

    # Detect new features (minor bump)
    elif echo "$COMMITS" | grep -qiE "^(feat|feature|add):"; then
        BUMP_TYPE="minor"
        print_info "Detected new features → MINOR bump"
    elif echo "$BRANCH" | grep -qiE "(feature|feat)/"; then
        BUMP_TYPE="minor"
        print_info "Feature branch detected → MINOR bump"

    # Default to patch for everything else
    else
        BUMP_TYPE="patch"
        print_info "No major/minor patterns detected → PATCH bump"
    fi
fi

# Bump version based on type
case "$BUMP_TYPE" in
    patch)
        PATCH=$((PATCH + 1))
        ;;
    minor)
        MINOR=$((MINOR + 1))
        PATCH=0
        ;;
    major)
        MAJOR=$((MAJOR + 1))
        MINOR=0
        PATCH=0
        ;;
    *)
        print_error "Invalid bump type: $BUMP_TYPE"
        echo "Usage: $0 [patch|minor|major|auto]"
        exit 1
        ;;
esac

NEW_VERSION="$MAJOR.$MINOR.$PATCH"

# Confirm bump
echo ""
print_warning "Version bump: $CURRENT_VERSION → $NEW_VERSION ($BUMP_TYPE)"
echo ""
read -p "Continue? (y/N): " -r
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    print_info "Cancelled"
    exit 0
fi

# Update VERSION file
echo "$NEW_VERSION" > "$VERSION_FILE"
print_success "Updated VERSION file: $NEW_VERSION"

# Commit version bump
if [ -d ".git" ]; then
    git add "$VERSION_FILE"
    git commit -m "chore: bump version to $NEW_VERSION" || true
    print_success "Committed version bump"

    # Create git tag
    git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION" || true
    print_success "Created tag: v$NEW_VERSION"

    echo ""
    print_info "To push changes:"
    echo "  git push origin main"
    echo "  git push origin v$NEW_VERSION"
fi

echo ""
print_success "Version bumped successfully!"
echo ""
echo "Next steps:"
echo "  1. Update CHANGELOG.md with release notes"
echo "  2. Push changes: git push && git push --tags"
echo "  3. Create GitHub release with tag v$NEW_VERSION"
echo ""
