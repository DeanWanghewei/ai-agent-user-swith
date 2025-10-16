# NPM Publishing Guide

This guide explains how to publish `ai-account-switch` to npm registry.

## Prerequisites

### 1. Create npm Account

If you don't have an npm account:

1. Go to https://www.npmjs.com/signup
2. Create your account
3. Verify your email

### 2. Login to npm

Login via command line:

```bash
npm login
```

Enter your:
- Username
- Password
- Email
- One-time password (if 2FA is enabled)

Verify you're logged in:

```bash
npm whoami
```

## Before Publishing

### 1. Update Package Information

Edit `package.json`:

```json
{
  "name": "ai-account-switch",
  "version": "1.1.0",
  "author": "Your Name <your.email@example.com>",
  "repository": {
    "type": "git",
    "url": "https://github.com/yourusername/ai-agent-user-swith.git"
  }
}
```

### 2. Check Package Name Availability

```bash
npm view ai-account-switch
```

If it returns an error, the name is available. If not, choose a different name like:
- `@yourusername/ai-account-switch` (scoped package)
- `ais-cli`
- `claude-account-switch`

### 3. Test Package Locally

```bash
# Install dependencies
npm install

# Test the CLI works
npm link
ais --version
ais --help

# Clean up
npm unlink
```

### 4. Dry Run

Test what will be published:

```bash
npm pack --dry-run
```

Or create a tarball to inspect:

```bash
npm pack
tar -xzf ai-account-switch-1.1.0.tgz
ls package/
```

## Publishing

### First Time Publication

```bash
# Make sure you're on the main branch
git checkout main

# Make sure everything is committed
git status

# Publish to npm
npm publish
```

For scoped packages:

```bash
npm publish --access public
```

### Updating a Published Package

1. **Update version number** in `package.json`:

```bash
# Patch version (1.1.0 -> 1.1.1)
npm version patch

# Minor version (1.1.0 -> 1.2.0)
npm version minor

# Major version (1.1.0 -> 2.0.0)
npm version major
```

This command will:
- Update `package.json`
- Create a git commit
- Create a git tag

2. **Push changes and tags**:

```bash
git push
git push --tags
```

3. **Publish to npm**:

```bash
npm publish
```

## After Publishing

### 1. Verify Publication

Check on npm website:
```
https://www.npmjs.com/package/ai-account-switch
```

Or via CLI:
```bash
npm view ai-account-switch
```

### 2. Test Installation

Test in a clean environment:

```bash
# Install globally
npm install -g ai-account-switch

# Test it works
ais --version
ais --help

# Uninstall
npm uninstall -g ai-account-switch
```

### 3. Update README

Update installation instructions to reflect the published package:

```markdown
### Option 3: Global npm Installation

\`\`\`bash
npm install -g ai-account-switch
\`\`\`
```

## Automation with GitHub Actions

### Option 1: Automatic NPM Publish on Release

Create `.github/workflows/npm-publish.yml`:

```yaml
name: Publish to NPM

on:
  release:
    types: [published]

jobs:
  publish:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '18'
          registry-url: 'https://registry.npmjs.org'

      - run: npm ci

      - run: npm publish
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

### Setup NPM Token in GitHub:

1. Generate NPM token:
   ```bash
   npm token create
   ```

2. Add to GitHub:
   - Go to your repository on GitHub
   - Settings → Secrets and variables → Actions
   - New repository secret
   - Name: `NPM_TOKEN`
   - Value: (paste your npm token)

## Troubleshooting

### Package Name Already Taken

Use a scoped package:

```json
{
  "name": "@yourusername/ai-account-switch"
}
```

### Permission Denied

Make sure you're logged in:
```bash
npm whoami
npm login
```

### 2FA Required

If you have 2FA enabled, you need to:

1. Generate an automation token on npmjs.com
2. Use it for CI/CD publishing

### Version Already Published

You cannot republish the same version. Update version:

```bash
npm version patch
npm publish
```

## Best Practices

1. **Semantic Versioning**: Follow semver (MAJOR.MINOR.PATCH)
2. **Test Before Publishing**: Always test locally first
3. **Keep README Updated**: Ensure documentation is current
4. **Changelog**: Maintain a changelog in README.md
5. **Clean Package**: Use `.npmignore` to exclude unnecessary files
6. **License**: Include appropriate license (MIT)

## Unpublishing (Emergency Only)

**Warning**: Only unpublish in emergency situations (security issues, etc.)

```bash
# Unpublish specific version
npm unpublish ai-account-switch@1.1.0

# Unpublish all versions (within 72 hours of publish)
npm unpublish ai-account-switch --force
```

After 72 hours, you cannot unpublish. Instead, publish a new version.

## Package Maintenance

### Deprecate a Version

```bash
npm deprecate ai-account-switch@1.0.0 "Please upgrade to 1.1.0"
```

### Add Collaborators

```bash
npm owner add username ai-account-switch
```

### View Package Stats

```bash
npm view ai-account-switch

# Download stats
npm view ai-account-switch time
```

## Checklist Before Publishing

- [ ] All tests pass
- [ ] Version number updated
- [ ] README.md is current
- [ ] CHANGELOG updated
- [ ] `.npmignore` configured
- [ ] `package.json` has correct info
- [ ] Tested with `npm pack`
- [ ] Logged into npm
- [ ] Git committed and pushed

## Resources

- [npm Documentation](https://docs.npmjs.com/)
- [Semantic Versioning](https://semver.org/)
- [npm Publishing Guide](https://docs.npmjs.com/packages-and-modules/contributing-packages-to-the-registry)
