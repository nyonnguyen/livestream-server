# Version Management Guide

This document explains how version management works in the Nyon Livestream Server.

## Overview

The project uses **Semantic Versioning (SemVer)**: `MAJOR.MINOR.PATCH`

- **MAJOR**: Incompatible API changes, breaking changes
- **MINOR**: New features, backwards-compatible
- **PATCH**: Bug fixes, backwards-compatible

Current version is tracked in the `VERSION` file at the project root.

---

## For Users: Update Detection

### Automatic Update Checking

The web UI automatically checks for updates:
- On first page load
- Every 6 hours while the app is open
- Checks GitHub releases for the latest version

### Update Notification

When a new version is available, you'll see a blue notification banner in the top-right corner:

![Update Notification](https://via.placeholder.com/400x150?text=Update+Available)

The notification shows:
- Current version vs Latest version
- Release notes (what's new)
- Link to GitHub release page
- Quick update command

### How to Update

**Method 1: Git Pull (Recommended)**
```bash
ssh your-pi-ip
cd /opt/livestream-server
git pull origin main
docker compose pull
docker compose up -d
```

**Method 2: Re-run Installer**
```bash
curl -fsSL https://raw.githubusercontent.com/nyonnguyen/livestream-server/main/install.sh | bash
```

The installer is idempotent - it will update to the latest version while preserving your data.

---

## For Developers: Version Bumping

### Automatic Version Bump

Use the `bump-version.sh` script:

```bash
# Auto-detect from branch/commits
./scripts/bump-version.sh auto

# Manual bump
./scripts/bump-version.sh patch   # 1.0.0 → 1.0.1
./scripts/bump-version.sh minor   # 1.0.0 → 1.1.0
./scripts/bump-version.sh major   # 1.0.0 → 2.0.0
```

### Auto-Detection Rules

The script analyzes your git history to determine the bump type:

#### From Commit Messages:
- `fix:` → PATCH bump
- `feat:` or `feature:` → MINOR bump
- `BREAKING:` or `break:` → MAJOR bump

Examples:
```bash
git commit -m "fix: resolve ghost session bug"        # → PATCH
git commit -m "feat: add dark mode support"           # → MINOR
git commit -m "BREAKING: change API authentication"   # → MAJOR
```

#### From Branch Names:
- `nyon/fix-*` or `fix/*` → PATCH
- `nyon/feature-*` or `feat/*` → MINOR
- `nyon/breaking-*` or `major/*` → MAJOR

Examples:
```bash
git checkout -b nyon/fix-session-ghost     # → PATCH when merged
git checkout -b nyon/feature-dark-mode     # → MINOR when merged
git checkout -b nyon/breaking-api-v2       # → MAJOR when merged
```

### Manual Version Bump Workflow

**1. Create your branch with appropriate naming:**
```bash
git checkout -b nyon/fix-settings-save
```

**2. Make your changes and commit:**
```bash
git add .
git commit -m "fix: Settings page unable to save"
```

**3. Before merging, bump the version:**
```bash
./scripts/bump-version.sh auto
# Or manually specify: ./scripts/bump-version.sh patch
```

This will:
- Update the `VERSION` file
- Commit the version bump
- Create a git tag (e.g., `v1.0.1`)

**4. Push changes:**
```bash
git push origin nyon/fix-settings-save
git push origin v1.0.1  # Push the tag
```

**5. Create GitHub Release:**
- Go to https://github.com/nyonnguyen/livestream-server/releases/new
- Select the tag (e.g., `v1.0.1`)
- Copy release notes from CHANGELOG.md
- Publish release

---

## API Endpoints

### GET /api/version

Get current version.

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "1.0.1",
    "releaseDate": "2026-02-16T10:30:00Z"
  }
}
```

### GET /api/version/check

Check for available updates.

**Response (update available):**
```json
{
  "success": true,
  "data": {
    "current": "1.0.0",
    "latest": "1.0.1",
    "hasUpdate": true,
    "releaseNotes": "## What's New\n- Fixed settings save bug\n- Fixed ghost sessions",
    "releaseUrl": "https://github.com/nyonnguyen/livestream-server/releases/tag/v1.0.1",
    "publishedAt": "2026-02-16T10:30:00Z"
  }
}
```

**Response (no update):**
```json
{
  "success": true,
  "data": {
    "current": "1.0.1",
    "latest": "1.0.1",
    "hasUpdate": false
  }
}
```

---

## CI/CD Integration

### GitHub Actions Auto-Bump (Future)

Add to `.github/workflows/version-bump.yml`:

```yaml
name: Auto Version Bump

on:
  pull_request:
    types: [closed]
    branches:
      - main

jobs:
  bump-version:
    if: github.event.pull_request.merged == true
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Bump version
        run: |
          chmod +x scripts/bump-version.sh
          ./scripts/bump-version.sh auto

      - name: Push changes
        run: |
          git config user.name "github-actions[bot]"
          git config user.email "github-actions[bot]@users.noreply.github.com"
          git push origin main --tags

      - name: Create GitHub Release
        uses: actions/create-release@v1
        with:
          tag_name: ${{ env.NEW_VERSION }}
          release_name: Release ${{ env.NEW_VERSION }}
          body_path: CHANGELOG.md
```

---

## Changelog Maintenance

Update `CHANGELOG.md` for every release:

### Format:

```markdown
## [1.0.1] - 2026-02-16

### Fixed
- Settings page unable to save due to missing config entries
- Ghost sessions showing as live after publisher stops

### Changed
- Improved version detection logic

[1.0.1]: https://github.com/nyonnguyen/livestream-server/compare/v1.0.0...v1.0.1
```

### Categories:
- **Added**: New features
- **Changed**: Changes to existing functionality
- **Deprecated**: Soon-to-be removed features
- **Removed**: Removed features
- **Fixed**: Bug fixes
- **Security**: Security fixes

---

## Version File Location

- **Backend**: `/VERSION` (root directory)
- **API reads from**: `VERSION` file
- **Frontend displays**: Via `/api/version` endpoint

The `VERSION` file is the **single source of truth** for the application version.

---

## Release Checklist

Before releasing a new version:

- [ ] Update `CHANGELOG.md` with all changes
- [ ] Run `./scripts/bump-version.sh auto`
- [ ] Verify VERSION file updated
- [ ] Push changes: `git push && git push --tags`
- [ ] Create GitHub release with tag
- [ ] Copy CHANGELOG section to release notes
- [ ] Test update notification in web UI
- [ ] Update any version-specific documentation

---

## Troubleshooting

### "Update notification not showing"

1. Check if new release exists on GitHub
2. Clear browser localStorage: `localStorage.clear()`
3. Check browser console for errors
4. Verify API endpoint: `curl http://your-pi-ip:3000/api/version/check`

### "Version not updating after git pull"

The VERSION file is tracked in git. Make sure to:
```bash
git pull origin main  # Pull latest including VERSION file
docker compose restart web-api  # Restart API to read new VERSION
```

### "Tag already exists"

If you need to re-tag:
```bash
git tag -d v1.0.1  # Delete local tag
git push origin :refs/tags/v1.0.1  # Delete remote tag
./scripts/bump-version.sh patch  # Bump again
```

---

## Best Practices

1. **Always bump version before merging to main**
2. **Use semantic versioning consistently**
3. **Update CHANGELOG for every release**
4. **Test update flow after every release**
5. **Keep release notes concise and user-friendly**
6. **Tag releases on main branch only**
7. **Never edit released tags/versions**

---

## Future Enhancements

Planned improvements:
- [ ] Auto-download and apply updates
- [ ] Rollback to previous version
- [ ] Version history in UI
- [ ] Breaking change warnings
- [ ] Migration scripts for breaking changes
- [ ] Docker image versioning alignment

---

## Related Documentation

- [CHANGELOG.md](../CHANGELOG.md) - Version history
- [CI-CD.md](CI-CD.md) - CI/CD pipeline
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
