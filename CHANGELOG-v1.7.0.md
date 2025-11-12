# Changelog v1.7.0

## 🎉 Major Features

### MCP (Model Context Protocol) Web UI Management
- **Full MCP server management through Web UI**
  - Add, edit, delete MCP servers
  - Support for stdio, sse, and http server types
  - Test MCP server connections
  - Enable/disable servers per project
  - Sync configuration to Claude Code
  - Search and filter functionality
  - Complete internationalization (Chinese/English)

### Backend API (9 new endpoints)
- `GET /api/mcp-servers` - Get all MCP servers
- `POST /api/mcp-servers` - Add new MCP server
- `PUT /api/mcp-servers/:name` - Update MCP server
- `DELETE /api/mcp-servers/:name` - Delete MCP server
- `POST /api/mcp-servers/:name/test` - Test connection
- `POST /api/mcp-servers/:name/enable` - Enable for project
- `POST /api/mcp-servers/:name/disable` - Disable for project
- `GET /api/mcp-servers/enabled` - Get enabled servers
- `POST /api/mcp-servers/sync` - Sync configuration

### Frontend UI Enhancements
- **Tab Navigation System**
  - Accounts management tab
  - MCP servers management tab
  - Smooth tab switching with event listeners

- **MCP Server Management Interface**
  - Card-based layout matching existing design
  - Dynamic forms based on server type
  - Environment variables and headers support
  - Status indicators (enabled/disabled)
  - Real-time search and filtering

## 🐛 Bug Fixes

### Fixed: Account Data Not Showing
- **Issue**: After adding tabs, account data disappeared
- **Cause**: Incorrect HTML structure and indentation
- **Fix**: Corrected tab div structure and proper indentation

### Fixed: switchTab is not defined
- **Issue**: JavaScript error when clicking tabs
- **Cause**: Function defined after being used in onclick
- **Fix**: Replaced onclick attributes with event listeners using DOMContentLoaded

### Fixed: Incorrect Search Result Messages
- **Issue**: When search has no results, showed "Add your first account" message
- **Cause**: Did not distinguish between "no data" and "no search results"
- **Fix**: Smart detection of filtered state vs empty state
  - No data: Shows "Add your first..." message
  - No search results: Shows "No matching results found"

## ✨ Improvements

### User Experience
- Better error messages for search results
- Clearer distinction between empty state and filtered state
- Improved tab navigation with proper event handling
- Consistent UI design across all features

### Code Quality
- Modern JavaScript practices (event listeners vs onclick)
- Better separation of concerns
- Improved maintainability
- Comprehensive error handling

### Internationalization
- Complete Chinese translations for MCP features
- Complete English translations for MCP features
- Consistent translation keys

## 📊 Testing

### Automated Tests
- 32/32 tests passing
- Comprehensive coverage of all features
- Verification scripts included

### Manual Testing
- Test guides provided
- Step-by-step instructions
- Expected results documented

## 📁 New Files

### Documentation
- `MCP-UI-IMPLEMENTATION.md` - Complete implementation guide
- `FIXED-ISSUES.md` - Detailed problem fixes
- `SEARCH-FIX.md` - Search result fix documentation
- `QUICK-TEST.md` - Quick testing guide
- `TEST-NOW.md` - Immediate testing instructions
- `CHANGELOG-v1.7.0.md` - This file

### Testing
- `verify-implementation.js` - Automated verification script
- `test-ui.html` - Manual testing guide

## 🔧 Technical Details

### Modified Files
- `src/ui-server.js` - Main implementation file
  - Added 9 API handler methods
  - Added MCP tab HTML structure
  - Added MCP modal HTML
  - Added MCP JavaScript functions
  - Added MCP translations (zh/en)
  - Added tab navigation CSS
  - Fixed switchTab function placement
  - Fixed search result messages

### Code Statistics
- Lines added: ~1500
- API endpoints: +9
- JavaScript functions: +15
- Translations: +40 keys
- Tests: 32 automated tests

## 🎯 Migration Guide

### For Users
No migration needed. All existing functionality remains unchanged.

### For Developers
If you've customized the UI:
1. Tab navigation now uses event listeners instead of onclick
2. Search results have improved empty state handling
3. New MCP management APIs available

## 🚀 Upgrade Instructions

### From v1.6.x to v1.7.0

1. **Update package**:
```bash
npm install -g ai-account-switch@1.7.0
```

2. **Verify installation**:
```bash
ais --version
# Should show: 1.7.0
```

3. **Test new features**:
```bash
ais ui
# Navigate to MCP Servers tab
```

## 📝 Breaking Changes

None. This is a backward-compatible release.

## 🙏 Acknowledgments

- Comprehensive testing and verification
- User feedback incorporated
- Production-ready code quality

## 📚 Resources

- [README.md](README.md) - Main documentation
- [MCP-UI-IMPLEMENTATION.md](MCP-UI-IMPLEMENTATION.md) - Implementation details
- [QUICK-TEST.md](QUICK-TEST.md) - Testing guide

---

**Release Date**: 2025-11-12
**Version**: 1.7.0
**Status**: Stable
**Tests**: 32/32 passing
