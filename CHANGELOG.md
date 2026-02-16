# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.3.0] - 2026-02-16

### Changed
- feat: add one-click web update functionality (#24)



## [1.2.6] - 2026-02-16

### Changed
- Nyon/fix version display and update notification (#23)



## [1.2.5] - 2026-02-16

### Changed
- Nyon/fix critical bugs (#22)



## [1.2.4] - 2026-02-16

### Changed
- Nyon/fix version display and update notification (#21)



## [1.2.3] - 2026-02-16

### Changed
- Nyon/fix critical bugs (#20)



## [1.2.2] - 2026-02-16

### Changed
- Nyon/fix version display and update notification (#19)



## [1.2.1] - 2026-02-16

### Changed
- fix: resolve critical bugs in Settings, Streams, Version, and QR Code (#17)



## [1.2.0] - 2026-02-16

### Changed
- Nyon/add version display (#16)



## [1.1.0] - 2026-02-16

### Changed
- Nyon/add version display (#15)



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

[1.1.0]: https://github.com/nyonnguyen/livestream-server/compare/v1.0.0...v1.1.0

[1.2.0]: https://github.com/nyonnguyen/livestream-server/compare/v1.1.0...v1.2.0

[1.2.1]: https://github.com/nyonnguyen/livestream-server/compare/v1.2.0...v1.2.1

[1.2.2]: https://github.com/nyonnguyen/livestream-server/compare/v1.2.1...v1.2.2

[1.2.3]: https://github.com/nyonnguyen/livestream-server/compare/v1.2.2...v1.2.3

[1.2.4]: https://github.com/nyonnguyen/livestream-server/compare/v1.2.3...v1.2.4

[1.2.5]: https://github.com/nyonnguyen/livestream-server/compare/v1.2.4...v1.2.5

[1.2.6]: https://github.com/nyonnguyen/livestream-server/compare/v1.2.5...v1.2.6

[1.3.0]: https://github.com/nyonnguyen/livestream-server/compare/v1.2.6...v1.3.0
