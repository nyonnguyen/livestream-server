# CI/CD Pipeline Documentation

## Overview

This project uses GitHub Actions to automatically build and publish Docker images whenever code is committed to the main/master branch.

---

## Workflow Triggers

The build pipeline is triggered on:

1. **Push to main/master branch**
   ```bash
   git push origin main
   ```

2. **Pull Request merged to main/master**
   - When a PR is closed and merged

---

## What Gets Built

### Docker Images

Two Docker images are built and published for each commit:

1. **web-api**: Node.js backend API
   - Image: `ghcr.io/nyonnguyen/livestream-server/web-api`
   - Platforms: `linux/amd64`, `linux/arm64`

2. **web-ui**: React frontend
   - Image: `ghcr.io/nyonnguyen/livestream-server/web-ui`
   - Platforms: `linux/amd64`, `linux/arm64`

### Image Tags

Each image is tagged with:
- `latest` - Latest stable build from main branch
- `main-<sha>` - Specific commit SHA
- `<version>` - Semantic version (if tagged)

**Example:**
```
ghcr.io/nyonnguyen/livestream-server/web-api:latest
ghcr.io/nyonnguyen/livestream-server/web-api:main-5752f81
ghcr.io/nyonnguyen/livestream-server/web-ui:latest
```

### Deployment Artifacts

A deployment package is created containing:
- `docker-compose.yml`
- `.env.example`
- `srs/` configuration
- `nginx/` configuration
- `scripts/` utilities
- Documentation (README.md, DEPLOYMENT.md)

**Artifact name:** `livestream-server-deployment-<sha>.tar.gz`

---

## Using Published Images

### Option 1: Production Deployment (Recommended)

Use pre-built images from GitHub Container Registry:

```bash
# Pull images
docker pull ghcr.io/nyonnguyen/livestream-server/web-api:latest
docker pull ghcr.io/nyonnguyen/livestream-server/web-ui:latest

# Deploy using production compose file
docker-compose -f docker-compose.prod.yml up -d
```

### Option 2: Development Build

Build images locally from source:

```bash
docker-compose build
docker-compose up -d
```

---

## Workflow Steps

### 1. Build and Push Images

```yaml
- Checkout code
- Setup QEMU (for multi-platform builds)
- Setup Docker Buildx
- Login to GitHub Container Registry
- Build images for amd64 and arm64
- Push to registry with proper tags
```

**Duration:** ~5-10 minutes

### 2. Create Release Artifact

```yaml
- Package deployment files
- Create compressed archive
- Generate checksums
- Upload to GitHub Artifacts
```

**Duration:** ~1 minute

**Retention:** 90 days

### 3. Notify

```yaml
- Generate build summary
- Display image URLs
- Show deployment instructions
```

---

## Accessing Build Artifacts

### Via GitHub UI

1. Go to repository: https://github.com/nyonnguyen/livestream-server
2. Click **Actions** tab
3. Select the workflow run
4. Scroll to **Artifacts** section
5. Download `deployment-package`

### Via GitHub CLI

```bash
# List artifacts
gh run list --limit 5

# Download latest artifact
gh run download --name deployment-package
```

### Extract and Deploy

```bash
# Extract archive
tar -xzf livestream-server-deployment-*.tar.gz

# Verify checksums
sha256sum -c checksums.txt

# Deploy
cp .env.example .env
# Edit .env with your configuration
docker-compose -f docker-compose.prod.yml up -d
```

---

## Image Registry Access

### Public Access (Pull)

Images are public and can be pulled without authentication:

```bash
docker pull ghcr.io/nyonnguyen/livestream-server/web-api:latest
```

### Authentication (Push)

Only required for pushing images (handled by GitHub Actions):

```bash
echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin
```

---

## Multi-Platform Support

Images are built for multiple architectures:

### linux/amd64 (x86_64)
- Desktop computers
- Cloud servers (AWS, GCP, Azure)
- Intel/AMD processors

### linux/arm64 (ARM 64-bit)
- Raspberry Pi 3 (64-bit OS)
- Raspberry Pi 4
- Apple Silicon Macs (M1/M2)
- AWS Graviton instances

**Automatic Selection:**
Docker automatically pulls the correct architecture for your platform.

---

## Build Cache

The workflow uses GitHub Actions cache to speed up builds:

- **Cache Type:** GitHub Actions cache
- **Cache Key:** Based on Dockerfile and dependencies
- **Benefits:**
  - Faster builds (~2-3x speedup)
  - Reduced bandwidth usage
  - Layer reuse across builds

---

## Monitoring Builds

### GitHub Actions UI

View build status at:
```
https://github.com/nyonnguyen/livestream-server/actions
```

### Status Badge

Add to README.md:
```markdown
![Build Status](https://github.com/nyonnguyen/livestream-server/actions/workflows/build-and-publish.yml/badge.svg)
```

### Build Notifications

Configure notifications in GitHub settings:
- Settings → Notifications → Actions

---

## Troubleshooting

### Build Failures

**Issue:** Build fails with authentication error

**Solution:**
```bash
# Ensure GITHUB_TOKEN has packages:write permission
# Check workflow permissions:
# Settings → Actions → General → Workflow permissions
# Select: Read and write permissions
```

**Issue:** Out of disk space during build

**Solution:**
```yaml
# The workflow includes cleanup steps
# If still failing, reduce image size or use smaller base images
```

### Image Pull Failures

**Issue:** Cannot pull image from ghcr.io

**Solution:**
```bash
# 1. Check if image exists
docker manifest inspect ghcr.io/nyonnguyen/livestream-server/web-api:latest

# 2. Ensure correct image name (case-sensitive)
# 3. Check if image is public in package settings
```

### Platform Issues

**Issue:** Image doesn't work on Raspberry Pi

**Solution:**
```bash
# Verify multi-platform build worked
docker manifest inspect ghcr.io/nyonnguyen/livestream-server/web-api:latest

# Should show both linux/amd64 and linux/arm64

# Pull specific platform if needed
docker pull --platform linux/arm64 ghcr.io/nyonnguyen/livestream-server/web-api:latest
```

---

## Manual Workflow Trigger

Trigger the workflow manually from GitHub UI:

1. Go to **Actions** tab
2. Select **Build and Publish** workflow
3. Click **Run workflow**
4. Select branch
5. Click **Run workflow** button

---

## Version Tagging

To create a versioned release:

```bash
# Tag the commit
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# This creates images tagged as:
# - latest
# - v1.0.0
# - 1.0
```

---

## Workflow Configuration

### File Location
`.github/workflows/build-and-publish.yml`

### Key Configuration

**Build Matrix:**
```yaml
strategy:
  matrix:
    service: [web-api, web-ui]
```

**Platforms:**
```yaml
platforms: linux/amd64,linux/arm64
```

**Registry:**
```yaml
registry: ghcr.io
```

---

## Security Best Practices

✅ **Implemented:**
- Use GitHub Actions built-in GITHUB_TOKEN
- No long-lived credentials stored
- Automatic token expiration
- Read-only checkout
- Write-only package permissions
- Signed images with metadata

🔒 **Recommendations:**
- Enable Dependabot for dependency updates
- Scan images for vulnerabilities
- Use minimal base images
- Regular security updates

---

## Cost Considerations

### GitHub Actions

- **Free Tier:** 2,000 minutes/month for public repos
- **Storage:** 500MB packages for free tier
- **Transfer:** 1GB/month data transfer free

### Current Usage (Estimated)

- Build time: ~10 minutes per push
- Storage: ~200MB per image set
- Total: ~20 builds/month within free tier

---

## Future Enhancements

Planned improvements:

1. **Image Scanning**
   - Add Trivy or Snyk for vulnerability scanning
   - Fail builds on critical vulnerabilities

2. **Automated Testing**
   - Run unit tests before building
   - Integration tests with docker-compose

3. **Release Automation**
   - Automatic changelog generation
   - GitHub Releases creation
   - Version bump automation

4. **Deployment**
   - Auto-deploy to staging environment
   - Integration with ArgoCD/Flux for GitOps

5. **Notifications**
   - Slack/Discord notifications
   - Email alerts on failures

---

## Support

**Issues:** https://github.com/nyonnguyen/livestream-server/issues

**Documentation:**
- [README.md](README.md) - Quick start
- [DEPLOYMENT.md](DEPLOYMENT.md) - Deployment guide
- [TECHNICAL_DESIGN.md](TECHNICAL_DESIGN.md) - Architecture

**Contact:** nyonnguyen@gmail.com

---

**Last Updated:** February 2026
**Workflow Version:** 1.0.0
