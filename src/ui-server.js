const http = require('http');
const path = require('path');
const fs = require('fs');
const ConfigManager = require('./config');

class UIServer {
  constructor(port = null) {
    // Use random high port (49152-65535) if not specified
    this.port = port || this.getRandomHighPort();
    this.config = new ConfigManager();
  }

  /**
   * Get a random high port number (49152-65535)
   * These are dynamic/private ports recommended for temporary use
   */
  getRandomHighPort() {
    const MIN_PORT = 49152;
    const MAX_PORT = 65535;
    return Math.floor(Math.random() * (MAX_PORT - MIN_PORT + 1)) + MIN_PORT;
  }

  start() {
    const server = http.createServer((req, res) => {
      this.handleRequest(req, res);
    });

    server.listen(this.port, () => {
      console.log(`\n🚀 AIS Web UI started at: http://localhost:${this.port}`);
      console.log('Press Ctrl+C to stop the server\n');

      // Try to open browser
      this.openBrowser(`http://localhost:${this.port}`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${this.port} is already in use. Trying another port...`);
        this.port = this.getRandomHighPort();
        this.start();
      } else {
        console.error('Server error:', err);
      }
    });
  }

  openBrowser(url) {
    const { exec } = require('child_process');
    const platform = process.platform;

    let command;
    if (platform === 'darwin') {
      command = `open ${url}`;
    } else if (platform === 'win32') {
      command = `start ${url}`;
    } else {
      command = `xdg-open ${url}`;
    }

    exec(command, (error) => {
      if (error) {
        console.log('Could not open browser automatically. Please open manually.');
      }
    });
  }

  handleRequest(req, res) {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
      res.writeHead(200);
      res.end();
      return;
    }

    // Parse URL
    const urlParts = req.url.split('?');
    const pathname = urlParts[0];

    // Serve static HTML page
    if (pathname === '/' || pathname === '/index.html') {
      this.serveHTML(res);
      return;
    }

    // API Routes
    if (pathname === '/api/accounts' && req.method === 'GET') {
      this.handleGetAccounts(req, res);
    } else if (pathname === '/api/accounts' && req.method === 'POST') {
      this.handleAddAccount(req, res);
    } else if (pathname.startsWith('/api/accounts/') && req.method === 'DELETE') {
      this.handleDeleteAccount(req, res, pathname);
    } else if (pathname.startsWith('/api/accounts/') && req.method === 'PUT') {
      this.handleUpdateAccount(req, res, pathname);
    } else if (pathname === '/api/export' && req.method === 'GET') {
      this.handleExportAll(req, res);
    } else if (pathname === '/api/import' && req.method === 'POST') {
      this.handleImportAccounts(req, res);
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
    }
  }

  serveHTML(res) {
    const html = this.getHTMLContent();
    res.writeHead(200, { 'Content-Type': 'text/html' });
    res.end(html);
  }

  handleGetAccounts(req, res) {
    try {
      const accounts = this.config.getAllAccounts();
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(accounts));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  handleAddAccount(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const { name, ...accountData } = data;

        if (!name || !accountData.apiKey) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Name and API Key are required' }));
          return;
        }

        this.config.addAccount(name, accountData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Account added successfully' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  handleUpdateAccount(req, res, pathname) {
    const name = decodeURIComponent(pathname.split('/api/accounts/')[1]);

    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const accountData = JSON.parse(body);

        if (!this.config.accountExists(name)) {
          res.writeHead(404, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: 'Account not found' }));
          return;
        }

        this.config.addAccount(name, accountData);
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, message: 'Account updated successfully' }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  handleDeleteAccount(req, res, pathname) {
    const name = decodeURIComponent(pathname.split('/api/accounts/')[1]);

    try {
      if (!this.config.accountExists(name)) {
        res.writeHead(404, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: 'Account not found' }));
        return;
      }

      this.config.removeAccount(name);
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: true, message: 'Account deleted successfully' }));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  handleExportAll(req, res) {
    try {
      const accounts = this.config.getAllAccounts();
      res.writeHead(200, {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="ais-accounts-export.json"'
      });
      res.end(JSON.stringify({ accounts }, null, 2));
    } catch (error) {
      res.writeHead(500, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ error: error.message }));
    }
  }

  handleImportAccounts(req, res) {
    let body = '';
    req.on('data', chunk => {
      body += chunk.toString();
    });

    req.on('end', () => {
      try {
        const data = JSON.parse(body);
        const accounts = data.accounts || {};

        let imported = 0;
        let skipped = 0;

        Object.keys(accounts).forEach(name => {
          if (this.config.accountExists(name) && !data.overwrite) {
            skipped++;
          } else {
            this.config.addAccount(name, accounts[name]);
            imported++;
          }
        });

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          success: true,
          imported,
          skipped,
          message: `Imported ${imported} accounts, skipped ${skipped} existing accounts`
        }));
      } catch (error) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: error.message }));
      }
    });
  }

  getHTMLContent() {
    return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIS - Account Manager</title>
    <style>
        :root {
            --bg-gradient-start: #667eea;
            --bg-gradient-end: #764ba2;
            --card-bg: #ffffff;
            --card-shadow: rgba(0, 0, 0, 0.1);
            --card-shadow-hover: rgba(0, 0, 0, 0.15);
            --text-primary: #333333;
            --text-secondary: #666666;
            --text-tertiary: #999999;
            --border-color: #eeeeee;
            --input-bg: #ffffff;
            --input-border: #dddddd;
            --modal-bg: rgba(0, 0, 0, 0.5);
            --header-text: #ffffff;
        }

        [data-theme="dark"] {
            --bg-gradient-start: #1a1a2e;
            --bg-gradient-end: #16213e;
            --card-bg: #2d2d44;
            --card-shadow: rgba(0, 0, 0, 0.3);
            --card-shadow-hover: rgba(0, 0, 0, 0.5);
            --text-primary: #e0e0e0;
            --text-secondary: #b0b0b0;
            --text-tertiary: #808080;
            --border-color: #404060;
            --input-bg: #1f1f35;
            --input-border: #404060;
            --modal-bg: rgba(0, 0, 0, 0.7);
            --header-text: #ffffff;
        }

        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            background: linear-gradient(135deg, var(--bg-gradient-start) 0%, var(--bg-gradient-end) 100%);
            min-height: 100vh;
            padding: 20px;
            transition: background 0.3s ease;
        }

        .container {
            max-width: 1200px;
            margin: 0 auto;
        }

        .header {
            text-align: center;
            color: var(--header-text);
            margin-bottom: 30px;
            position: relative;
        }

        .header h1 {
            font-size: 2.5rem;
            margin-bottom: 10px;
        }

        .header p {
            font-size: 1.1rem;
            opacity: 0.9;
        }

        .settings-bar {
            position: absolute;
            top: 0;
            right: 0;
            display: flex;
            gap: 15px;
            align-items: center;
        }

        .lang-toggle {
            background: rgba(255, 255, 255, 0.2);
            border: 1px solid rgba(255, 255, 255, 0.3);
            color: white;
            padding: 8px 15px;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            transition: all 0.3s;
            min-width: 80px;
            text-align: center;
        }

        .lang-toggle:hover {
            background: rgba(255, 255, 255, 0.3);
        }

        /* Theme Switch */
        .theme-switch-wrapper {
            display: flex;
            align-items: center;
            gap: 10px;
        }

        .theme-switch-label {
            color: white;
            font-size: 14px;
            opacity: 0.9;
        }

        .theme-switch {
            position: relative;
            display: inline-block;
            width: 52px;
            height: 26px;
        }

        .theme-switch input {
            opacity: 0;
            width: 0;
            height: 0;
        }

        .theme-slider {
            position: absolute;
            cursor: pointer;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background-color: rgba(255, 255, 255, 0.3);
            border: 1px solid rgba(255, 255, 255, 0.4);
            transition: 0.4s;
            border-radius: 26px;
        }

        .theme-slider:before {
            position: absolute;
            content: "☀️";
            height: 20px;
            width: 20px;
            left: 3px;
            bottom: 2px;
            background-color: white;
            transition: 0.4s;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            line-height: 20px;
        }

        .theme-switch input:checked + .theme-slider {
            background-color: rgba(255, 255, 255, 0.5);
        }

        .theme-switch input:checked + .theme-slider:before {
            transform: translateX(26px);
            content: "🌙";
        }

        .theme-slider:hover {
            background-color: rgba(255, 255, 255, 0.4);
        }

        .controls {
            display: flex;
            gap: 10px;
            margin-bottom: 20px;
            flex-wrap: wrap;
        }

        .btn {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.3s;
        }

        .btn-primary {
            background: #4CAF50;
            color: white;
        }

        .btn-primary:hover {
            background: #45a049;
        }

        .btn-secondary {
            background: #2196F3;
            color: white;
        }

        .btn-secondary:hover {
            background: #0b7dda;
        }

        .btn-danger {
            background: #f44336;
            color: white;
        }

        .btn-danger:hover {
            background: #da190b;
        }

        .btn-small {
            padding: 5px 10px;
            font-size: 12px;
        }

        .search-box {
            flex: 1;
            min-width: 200px;
        }

        .search-box input {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--input-border);
            border-radius: 5px;
            font-size: 14px;
            background: var(--input-bg);
            color: var(--text-primary);
        }

        .accounts-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
            gap: 20px;
        }

        .account-card {
            background: var(--card-bg);
            border-radius: 10px;
            padding: 20px;
            box-shadow: 0 4px 6px var(--card-shadow);
            transition: transform 0.3s, box-shadow 0.3s;
            display: flex;
            flex-direction: column;
            min-height: 200px;
        }

        .account-card:hover {
            transform: translateY(-5px);
            box-shadow: 0 6px 12px var(--card-shadow-hover);
        }

        .account-content {
            flex: 1;
        }

        .account-header {
            display: flex;
            justify-content: space-between;
            align-items: start;
            margin-bottom: 15px;
        }

        .account-name {
            font-size: 1.4rem;
            font-weight: 600;
            color: var(--text-primary);
        }

        .account-type {
            display: inline-block;
            padding: 4px 8px;
            border-radius: 4px;
            font-size: 12px;
            font-weight: 500;
            background: #e3f2fd;
            color: #1976d2;
        }

        .account-info {
            margin-bottom: 10px;
        }

        .info-label {
            font-weight: 600;
            color: var(--text-secondary);
            font-size: 13px;
        }

        .info-value {
            color: var(--text-primary);
            font-size: 14px;
            margin-top: 2px;
            word-break: break-all;
        }

        .account-actions {
            display: flex;
            gap: 10px;
            margin-top: auto;
            padding-top: 15px;
            border-top: 1px solid var(--border-color);
        }

        .modal {
            display: none;
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: var(--modal-bg);
            z-index: 1000;
            align-items: center;
            justify-content: center;
        }

        .modal.active {
            display: flex;
        }

        .modal-content {
            background: var(--card-bg);
            border-radius: 10px;
            padding: 30px;
            max-width: 500px;
            width: 90%;
            max-height: 90vh;
            overflow-y: auto;
        }

        .modal-header {
            font-size: 1.5rem;
            font-weight: 600;
            margin-bottom: 20px;
            color: var(--text-primary);
        }

        .form-group {
            margin-bottom: 15px;
        }

        .form-group label {
            display: block;
            margin-bottom: 5px;
            font-weight: 500;
            color: var(--text-secondary);
        }

        .form-group input,
        .form-group select,
        .form-group textarea {
            width: 100%;
            padding: 10px;
            border: 1px solid var(--input-border);
            border-radius: 5px;
            font-size: 14px;
            background: var(--input-bg);
            color: var(--text-primary);
        }

        .form-group textarea {
            min-height: 60px;
            resize: vertical;
        }

        .form-actions {
            display: flex;
            gap: 10px;
            margin-top: 20px;
        }

        .env-vars-list {
            margin-top: 10px;
        }

        .env-var-item {
            display: flex;
            gap: 5px;
            margin-bottom: 5px;
        }

        .env-var-item input {
            flex: 1;
        }

        .empty-state {
            text-align: center;
            padding: 60px 20px;
            background: var(--card-bg);
            border-radius: 10px;
        }

        .empty-state h2 {
            color: var(--text-secondary);
            margin-bottom: 10px;
        }

        .empty-state p {
            color: var(--text-tertiary);
            margin-bottom: 20px;
        }

        .toast {
            position: fixed;
            top: 20px;
            right: 20px;
            background: #333;
            color: white;
            padding: 15px 20px;
            border-radius: 5px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.2);
            z-index: 2000;
            animation: slideIn 0.3s ease-out;
        }

        .toast.success {
            background: #4CAF50;
        }

        .toast.error {
            background: #f44336;
        }

        @keyframes slideIn {
            from {
                transform: translateX(100%);
                opacity: 0;
            }
            to {
                transform: translateX(0);
                opacity: 1;
            }
        }

        .hidden {
            display: none;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <div class="settings-bar">
                <div class="theme-switch-wrapper">
                    <span class="theme-switch-label" id="themeSwitchLabel" data-i18n="themeLabel">主题</span>
                    <label class="theme-switch">
                        <input type="checkbox" id="themeToggle" onchange="toggleTheme()">
                        <span class="theme-slider"></span>
                    </label>
                </div>
                <button class="lang-toggle" onclick="toggleLanguage()" id="langToggle">English</button>
            </div>
            <h1 data-i18n="title">AIS 账号管理器</h1>
            <p data-i18n="subtitle">管理你的 AI 账号配置</p>
        </div>

        <div class="controls">
            <div class="search-box">
                <input type="text" id="searchInput" data-i18n-placeholder="searchPlaceholder" placeholder="搜索账号...">
            </div>
            <button class="btn btn-primary" onclick="showAddModal()" data-i18n="addAccount">+ 添加账号</button>
            <button class="btn btn-secondary" onclick="exportAccounts()" data-i18n="exportAll">导出全部</button>
            <button class="btn btn-secondary" onclick="document.getElementById('importFile').click()" data-i18n="import">导入</button>
            <input type="file" id="importFile" accept=".json" style="display: none" onchange="importAccounts(this)">
        </div>

        <div id="accountsContainer" class="accounts-grid"></div>
        <div id="emptyState" class="empty-state hidden">
            <h2 data-i18n="noAccounts">还没有账号</h2>
            <p data-i18n="getStarted">开始添加你的第一个账号吧</p>
            <button class="btn btn-primary" onclick="showAddModal()" data-i18n="addAccount">+ 添加账号</button>
        </div>
    </div>

    <!-- Add/Edit Modal -->
    <div id="accountModal" class="modal">
        <div class="modal-content">
            <div class="modal-header" id="modalTitle" data-i18n="addAccountTitle">添加账号</div>
            <form id="accountForm" onsubmit="saveAccount(event)">
                <div class="form-group">
                    <label for="accountName" data-i18n="accountName">账号名称 *</label>
                    <input type="text" id="accountName" required>
                </div>
                <div class="form-group">
                    <label for="accountType" data-i18n="type">类型 *</label>
                    <select id="accountType" required>
                        <option value="Claude">Claude</option>
                        <option value="Codex">Codex</option>
                        <option value="Other" data-i18n="other">其他</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="apiKey" data-i18n="apiKey">API Key *</label>
                    <input type="text" id="apiKey" required>
                </div>
                <div class="form-group">
                    <label for="apiUrl" data-i18n="apiUrl">API URL (可选)</label>
                    <input type="text" id="apiUrl">
                </div>
                <div class="form-group">
                    <label for="email" data-i18n="email">邮箱 (可选)</label>
                    <input type="email" id="email">
                </div>
                <div class="form-group">
                    <label for="description" data-i18n="description">描述 (可选)</label>
                    <textarea id="description"></textarea>
                </div>
                <div class="form-group">
                    <label data-i18n="customEnv">自定义环境变量 (可选)</label>
                    <div id="envVarsList"></div>
                    <button type="button" class="btn btn-secondary btn-small" onclick="addEnvVar()" data-i18n="addVariable">+ 添加变量</button>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary" data-i18n="save">保存</button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal()" data-i18n="cancel">取消</button>
                </div>
            </form>
        </div>
    </div>

    <script>
        // i18n translations
        const translations = {
            zh: {
                title: 'AIS 账号管理器',
                subtitle: '管理你的 AI 账号配置',
                themeLabel: '主题',
                searchPlaceholder: '搜索账号...',
                addAccount: '+ 添加账号',
                exportAll: '导出全部',
                import: '导入',
                noAccounts: '还没有账号',
                getStarted: '开始添加你的第一个账号吧',
                addAccountTitle: '添加账号',
                editAccountTitle: '编辑账号',
                accountName: '账号名称 *',
                type: '类型 *',
                other: '其他',
                apiKey: 'API Key *',
                apiUrl: 'API URL (可选)',
                email: '邮箱 (可选)',
                description: '描述 (可选)',
                customEnv: '自定义环境变量 (可选)',
                addVariable: '+ 添加变量',
                save: '保存',
                cancel: '取消',
                edit: '编辑',
                delete: '删除',
                apiKeyLabel: 'API Key',
                customEnvVars: '自定义环境变量',
                confirmDelete: '确定要删除账号',
                confirmOverwrite: '是否覆盖同名的现有账号?',
                loadFailed: '加载账号失败',
                saveFailed: '保存账号失败',
                saveSuccess: '保存成功',
                deleteFailed: '删除账号失败',
                deleteSuccess: '删除成功',
                exportSuccess: '导出成功',
                exportFailed: '导出失败',
                importSuccess: '导入成功',
                importFailed: '导入失败',
                importMessage: '已导入 {imported} 个账号，跳过 {skipped} 个现有账号'
            },
            en: {
                title: 'AIS Account Manager',
                subtitle: 'Manage your AI account configurations',
                themeLabel: 'Theme',
                searchPlaceholder: 'Search accounts...',
                addAccount: '+ Add Account',
                exportAll: 'Export All',
                import: 'Import',
                noAccounts: 'No accounts yet',
                getStarted: 'Get started by adding your first account',
                addAccountTitle: 'Add Account',
                editAccountTitle: 'Edit Account',
                accountName: 'Account Name *',
                type: 'Type *',
                other: 'Other',
                apiKey: 'API Key *',
                apiUrl: 'API URL (optional)',
                email: 'Email (optional)',
                description: 'Description (optional)',
                customEnv: 'Custom Environment Variables (optional)',
                addVariable: '+ Add Variable',
                save: 'Save',
                cancel: 'Cancel',
                edit: 'Edit',
                delete: 'Delete',
                apiKeyLabel: 'API Key',
                customEnvVars: 'Custom Env Vars',
                confirmDelete: 'Are you sure you want to delete account',
                confirmOverwrite: 'Overwrite existing accounts with same names?',
                loadFailed: 'Failed to load accounts',
                saveFailed: 'Failed to save account',
                saveSuccess: 'Account saved successfully',
                deleteFailed: 'Failed to delete account',
                deleteSuccess: 'Account deleted successfully',
                exportSuccess: 'Accounts exported successfully',
                exportFailed: 'Failed to export accounts',
                importSuccess: 'Import successful',
                importFailed: 'Failed to import accounts',
                importMessage: 'Imported {imported} accounts, skipped {skipped} existing accounts'
            }
        };

        let currentLang = localStorage.getItem('ais-lang') || 'zh';
        let currentTheme = localStorage.getItem('ais-theme') || 'auto';
        let accounts = {};
        let editingAccount = null;
        let envVarCount = 0;

        // Initialize theme
        function initTheme() {
            const themeCheckbox = document.getElementById('themeToggle');

            if (currentTheme === 'auto') {
                const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
                document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
                themeCheckbox.checked = prefersDark;
            } else {
                document.documentElement.setAttribute('data-theme', currentTheme);
                themeCheckbox.checked = currentTheme === 'dark';
            }
        }

        function toggleTheme() {
            const themeCheckbox = document.getElementById('themeToggle');
            const newTheme = themeCheckbox.checked ? 'dark' : 'light';
            currentTheme = newTheme;
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('ais-theme', newTheme);
        }

        // i18n functions
        function t(key, params = {}) {
            let text = translations[currentLang][key] || key;
            Object.keys(params).forEach(param => {
                text = text.replace(\`{\${param}}\`, params[param]);
            });
            return text;
        }

        function updateLanguage() {
            document.querySelectorAll('[data-i18n]').forEach(el => {
                const key = el.getAttribute('data-i18n');
                el.textContent = t(key);
            });

            document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
                const key = el.getAttribute('data-i18n-placeholder');
                el.placeholder = t(key);
            });

            // Update language toggle button
            const langBtn = document.getElementById('langToggle');
            langBtn.textContent = currentLang === 'zh' ? 'English' : '中文';

            // Re-render accounts to update labels
            renderAccounts();
        }

        function toggleLanguage() {
            currentLang = currentLang === 'zh' ? 'en' : 'zh';
            localStorage.setItem('ais-lang', currentLang);
            updateLanguage();
        }

        // Initialize
        initTheme();
        updateLanguage();

        async function loadAccounts() {
            try {
                const response = await fetch('/api/accounts');
                accounts = await response.json();
                renderAccounts();
            } catch (error) {
                showToast(t('loadFailed'), 'error');
            }
        }

        function renderAccounts() {
            const container = document.getElementById('accountsContainer');
            const emptyState = document.getElementById('emptyState');
            const searchTerm = document.getElementById('searchInput').value.toLowerCase();

            const filteredAccounts = Object.entries(accounts).filter(([name, data]) => {
                return name.toLowerCase().includes(searchTerm) ||
                       (data.email && data.email.toLowerCase().includes(searchTerm)) ||
                       (data.type && data.type.toLowerCase().includes(searchTerm));
            });

            if (filteredAccounts.length === 0) {
                container.innerHTML = '';
                emptyState.classList.remove('hidden');
                return;
            }

            emptyState.classList.add('hidden');
            container.innerHTML = filteredAccounts.map(([name, data]) => \`
                <div class="account-card">
                    <div class="account-content">
                        <div class="account-header">
                            <div class="account-name">\${name}</div>
                            <div class="account-type">\${data.type || 'N/A'}</div>
                        </div>
                        <div class="account-info">
                            <div class="info-label">\${t('apiKeyLabel')}</div>
                            <div class="info-value">\${maskApiKey(data.apiKey)}</div>
                        </div>
                        \${data.apiUrl ? \`
                        <div class="account-info">
                            <div class="info-label">\${t('apiUrl').replace(' (可选)', '').replace(' (optional)', '')}</div>
                            <div class="info-value">\${data.apiUrl}</div>
                        </div>
                        \` : ''}
                        \${data.email ? \`
                        <div class="account-info">
                            <div class="info-label">\${t('email').replace(' (可选)', '').replace(' (optional)', '')}</div>
                            <div class="info-value">\${data.email}</div>
                        </div>
                        \` : ''}
                        \${data.description ? \`
                        <div class="account-info">
                            <div class="info-label">\${t('description').replace(' (可选)', '').replace(' (optional)', '')}</div>
                            <div class="info-value">\${data.description}</div>
                        </div>
                        \` : ''}
                        \${data.customEnv && Object.keys(data.customEnv).length > 0 ? \`
                        <div class="account-info">
                            <div class="info-label">\${t('customEnvVars')}</div>
                            <div class="info-value">\${Object.keys(data.customEnv).join(', ')}</div>
                        </div>
                        \` : ''}
                    </div>
                    <div class="account-actions">
                        <button class="btn btn-secondary btn-small" onclick="editAccount('\${name}')">\${t('edit')}</button>
                        <button class="btn btn-danger btn-small" onclick="deleteAccount('\${name}')">\${t('delete')}</button>
                    </div>
                </div>
            \`).join('');
        }

        function maskApiKey(key) {
            if (!key || key.length < 8) return '****';
            return key.substring(0, 4) + '****' + key.substring(key.length - 4);
        }

        function showAddModal() {
            editingAccount = null;
            document.getElementById('modalTitle').textContent = t('addAccountTitle');
            document.getElementById('accountForm').reset();
            document.getElementById('accountName').disabled = false;
            document.getElementById('envVarsList').innerHTML = '';
            envVarCount = 0;
            document.getElementById('accountModal').classList.add('active');
        }

        function editAccount(name) {
            editingAccount = name;
            const account = accounts[name];

            document.getElementById('modalTitle').textContent = t('editAccountTitle');
            document.getElementById('accountName').value = name;
            document.getElementById('accountName').disabled = true;
            document.getElementById('accountType').value = account.type || 'Claude';
            document.getElementById('apiKey').value = account.apiKey;
            document.getElementById('apiUrl').value = account.apiUrl || '';
            document.getElementById('email').value = account.email || '';
            document.getElementById('description').value = account.description || '';

            // Load custom env vars
            document.getElementById('envVarsList').innerHTML = '';
            envVarCount = 0;
            if (account.customEnv) {
                Object.entries(account.customEnv).forEach(([key, value]) => {
                    addEnvVar(key, value);
                });
            }

            document.getElementById('accountModal').classList.add('active');
        }

        function closeModal() {
            document.getElementById('accountModal').classList.remove('active');
        }

        function addEnvVar(key = '', value = '') {
            const id = envVarCount++;
            const container = document.getElementById('envVarsList');
            const div = document.createElement('div');
            div.className = 'env-var-item';
            div.id = \`envVar\${id}\`;
            div.innerHTML = \`
                <input type="text" placeholder="KEY" value="\${key}" id="envKey\${id}">
                <input type="text" placeholder="VALUE" value="\${value}" id="envValue\${id}">
                <button type="button" class="btn btn-danger btn-small" onclick="removeEnvVar(\${id})">×</button>
            \`;
            container.appendChild(div);
        }

        function removeEnvVar(id) {
            document.getElementById(\`envVar\${id}\`).remove();
        }

        async function saveAccount(event) {
            event.preventDefault();

            const name = document.getElementById('accountName').value;
            const accountData = {
                type: document.getElementById('accountType').value,
                apiKey: document.getElementById('apiKey').value,
                apiUrl: document.getElementById('apiUrl').value,
                email: document.getElementById('email').value,
                description: document.getElementById('description').value,
                customEnv: {}
            };

            // Collect custom env vars
            const envVarsList = document.getElementById('envVarsList');
            envVarsList.querySelectorAll('.env-var-item').forEach(item => {
                const key = item.querySelector('[id^="envKey"]').value.trim();
                const value = item.querySelector('[id^="envValue"]').value.trim();
                if (key && value) {
                    accountData.customEnv[key] = value;
                }
            });

            if (Object.keys(accountData.customEnv).length === 0) {
                delete accountData.customEnv;
            }

            try {
                const url = editingAccount
                    ? \`/api/accounts/\${encodeURIComponent(name)}\`
                    : '/api/accounts';
                const method = editingAccount ? 'PUT' : 'POST';

                const response = await fetch(url, {
                    method,
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ name, ...accountData })
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(t('saveSuccess'), 'success');
                    closeModal();
                    await loadAccounts();
                } else {
                    showToast(result.error || t('saveFailed'), 'error');
                }
            } catch (error) {
                showToast(t('saveFailed'), 'error');
            }
        }

        async function deleteAccount(name) {
            if (!confirm(\`\${t('confirmDelete')} "\${name}"?\`)) {
                return;
            }

            try {
                const response = await fetch(\`/api/accounts/\${encodeURIComponent(name)}\`, {
                    method: 'DELETE'
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(t('deleteSuccess'), 'success');
                    await loadAccounts();
                } else {
                    showToast(result.error || t('deleteFailed'), 'error');
                }
            } catch (error) {
                showToast(t('deleteFailed'), 'error');
            }
        }

        async function exportAccounts() {
            try {
                const response = await fetch('/api/export');
                const data = await response.json();

                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'ais-accounts-export.json';
                a.click();
                URL.revokeObjectURL(url);

                showToast(t('exportSuccess'), 'success');
            } catch (error) {
                showToast(t('exportFailed'), 'error');
            }
        }

        async function importAccounts(input) {
            const file = input.files[0];
            if (!file) return;

            try {
                const text = await file.text();
                const data = JSON.parse(text);

                const overwrite = confirm(t('confirmOverwrite'));

                const response = await fetch('/api/import', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ ...data, overwrite })
                });

                const result = await response.json();

                if (response.ok) {
                    showToast(t('importMessage', { imported: result.imported, skipped: result.skipped }), 'success');
                    await loadAccounts();
                } else {
                    showToast(result.error || t('importFailed'), 'error');
                }
            } catch (error) {
                showToast(t('importFailed') + ': ' + error.message, 'error');
            }

            input.value = '';
        }

        function showToast(message, type = 'success') {
            const toast = document.createElement('div');
            toast.className = \`toast \${type}\`;
            toast.textContent = message;
            document.body.appendChild(toast);

            setTimeout(() => {
                toast.remove();
            }, 3000);
        }

        // Event listeners
        document.getElementById('searchInput').addEventListener('input', renderAccounts);

        // Load accounts on page load
        loadAccounts();
    </script>
</body>
</html>`;
  }
}

module.exports = UIServer;
