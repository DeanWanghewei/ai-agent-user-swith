# Commands 模块说明

## 目录结构

```
commands/
├── README.md      # 本文件 - 模块说明
├── helpers.js     # ✅ 辅助函数 (maskApiKey, validateAccount)
├── account.js     # ⏳ 账号管理命令
├── model.js       # ⏳ 模型组管理命令
├── utility.js     # ⏳ 工具类命令
└── index.js       # ⏳ 统一导出接口
```

## 模块职责

### helpers.js ✅
**辅助函数** - 所有模块共用的工具函数

- `maskApiKey(apiKey)` - API密钥遮罩显示
- `validateAccount(apiKey, apiUrl)` - 验证账号有效性

### account.js
**账号管理** - 处理账号的 CRUD 操作

- `addAccount(name, options)` - 添加新账号
- `listAccounts()` - 列出所有账号
- `useAccount(name)` - 切换到指定账号
- `showInfo()` - 显示当前项目账号信息
- `removeAccount(name)` - 删除账号
- `showCurrent()` - 显示当前账号名称
- `exportAccount(name)` - 导出账号配置
- `promptForModelGroup()` - 模型组配置提示（内部使用）

### model.js
**模型组管理** - 管理 Claude 账号的模型组配置

- `listModelGroups()` - 列出模型组
- `addModelGroup(name)` - 添加模型组
- `useModelGroup(name)` - 切换模型组
- `removeModelGroup(name)` - 删除模型组
- `showModelGroup(name)` - 显示模型组详情

### utility.js
**工具类命令** - 诊断和辅助功能

- `showPaths()` - 显示配置文件路径
- `doctor()` - 诊断配置问题
- `startUI()` - 启动 Web UI 管理界面

### index.js
**统一导出** - 导出所有命令供主程序使用

```javascript
module.exports = {
  // Account commands
  addAccount,
  listAccounts,
  useAccount,
  showInfo,
  removeAccount,
  showCurrent,
  exportAccount,

  // Model commands
  listModelGroups,
  addModelGroup,
  useModelGroup,
  removeModelGroup,
  showModelGroup,

  // Utility commands
  showPaths,
  doctor,
  startUI
};
```

## 依赖关系

```
index.js (主入口)
    ↓
commands/index.js (命令导出)
    ↓
├─ account.js → helpers.js
├─ model.js → helpers.js
└─ utility.js → helpers.js
```

## 迁移状态

✅ **重构已完成！** (2025-10-24)

- [x] helpers.js - 辅助函数模块
- [x] account.js - 账号管理模块
- [x] model.js - 模型组管理模块
- [x] utility.js - 工具类模块
- [x] index.js - 统一导出
- [x] 更新 src/index.js 引用 (已兼容)
- [x] 测试所有命令功能
- [x] 备份原文件 (src/commands.js → src/commands.js.bak)

## 优势

1. **模块化** - 每个文件职责单一，代码清晰
2. **可维护** - 修改某个功能只需关注对应模块
3. **可测试** - 独立模块易于编写单元测试
4. **可扩展** - 新增功能只需添加新模块或扩展现有模块

## 使用方式

```javascript
// 旧方式 (src/commands.js)
const { addAccount, listAccounts } = require('./commands');

// 新方式 (src/commands/index.js)
const { addAccount, listAccounts } = require('./commands');
// 或
const commands = require('./commands');
commands.addAccount();
```

接口保持不变，只是内部实现变成模块化。
