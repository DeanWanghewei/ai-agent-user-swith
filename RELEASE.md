# Release Guide

This document describes how to create a new release for ai-account-switch.

## Prerequisites

- Ensure all changes are committed and pushed to the main branch
- Update version number in `package.json`
- Update CHANGELOG in `README.md`

## Creating a Release

### 1. Update Version

Update the version in `package.json`:

```json
{
  "version": "1.1.0"
}
```

### 2. Create and Push a Git Tag

```bash
# Create a new tag (e.g., v1.1.0)
git tag -a v1.1.0 -m "Release version 1.1.0"

# Push the tag to GitHub
git push origin v1.1.0
```

### 3. GitHub Actions Workflow

Once you push a tag starting with `v`, the GitHub Actions workflow will automatically:

1. Build executables for:
   - Linux (x64)
   - macOS (x64)
   - Windows (x64)

2. Create a GitHub Release with:
   - `ais-linux` - Linux executable
   - `ais-macos` - macOS executable
   - `ais-win.exe` - Windows executable
   - Auto-generated release notes

### 4. Manual Workflow Trigger (Optional)

You can also manually trigger the build workflow:

1. Go to GitHub repository
2. Click on "Actions" tab
3. Select "Build and Release" workflow
4. Click "Run workflow"
5. Select branch and run

## Release Checklist

Before creating a release, ensure:

- [ ] Version number updated in `package.json`
- [ ] CHANGELOG updated in `README.md`
- [ ] All tests pass
- [ ] README.md is up to date
- [ ] No sensitive information in code
- [ ] All dependencies are up to date
- [ ] Git tag created with correct version

## Post-Release

After the release is created:

1. Verify all binaries are attached to the release
2. Test download and installation on each platform
3. Update installation instructions if needed
4. Announce the release (if applicable)

## Troubleshooting

### Build Fails

- Check GitHub Actions logs
- Verify `pkg` configuration in `package.json`
- Ensure all dependencies are compatible with pkg

### Missing Binaries

- Check if the workflow completed successfully
- Verify artifact upload step succeeded
- Check release asset upload permissions

### Download Issues

- Verify release is not marked as draft
- Check file permissions
- Verify URLs in README.md are correct

## Version Numbering

Follow Semantic Versioning (SemVer):

- **MAJOR** (1.x.x): Incompatible API changes
- **MINOR** (x.1.x): New features, backwards compatible
- **PATCH** (x.x.1): Bug fixes, backwards compatible

Example:
- `v1.0.0` - Initial release
- `v1.1.0` - Added new features (smart directory detection, Claude Code integration)
- `v1.1.1` - Bug fixes
- `v2.0.0` - Breaking changes
