# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Automatic version checking and update notifications
- Version management API endpoints
- Update notification banner in web UI

### Fixed
- Settings page unable to save (missing database config entries)
- Ghost sessions showing as live after publisher stops (only players remain)

## [1.0.0] - 2026-02-16

### Added
- Complete livestream server with SRS integration
- Web-based dashboard for stream management
- RTMP and SRT protocol support
- Low-latency streaming (< 1 second)
- User authentication and session management
- Network configuration with QR code generation
- Vietnamese language support (i18n)
- Docker-based deployment
- One-command installation script
- Uninstall script with backup options
- Comprehensive documentation

### Features
- Stream key management with regeneration
- Active session monitoring with disconnect capability
- Real-time bandwidth and resolution display
- HTTP-FLV and WebRTC playback support
- Mobile-friendly QR codes for OBS/streaming apps
- Configurable max concurrent streams
- Auto-detection of network interfaces
- Public IP and hostname support for remote streaming

### Documentation
- Installation guide
- Deployment guide
- Uninstallation guide
- Configuration guide
- Troubleshooting guide
- Technical design documentation
- CI/CD pipeline documentation

---

## Version Format

- **MAJOR**: Breaking changes (incompatible API changes)
- **MINOR**: New features (backwards-compatible)
- **PATCH**: Bug fixes (backwards-compatible)

## Branch Naming Convention

For automatic version bumping:
- `nyon/fix-*` or `fix/*` → PATCH bump (1.0.0 → 1.0.1)
- `nyon/feature-*` or `feat/*` → MINOR bump (1.0.0 → 1.1.0)
- `nyon/breaking-*` or `major/*` → MAJOR bump (1.0.0 → 2.0.0)

## Commit Message Convention

Commit messages should follow:
- `fix:` → Bug fix (PATCH)
- `feat:` or `feature:` → New feature (MINOR)
- `BREAKING:` or `break:` → Breaking change (MAJOR)
- `chore:` → Maintenance (no version bump)
- `docs:` → Documentation (no version bump)

---

[Unreleased]: https://github.com/nyonnguyen/livestream-server/compare/v1.0.0...HEAD
[1.0.0]: https://github.com/nyonnguyen/livestream-server/releases/tag/v1.0.0
