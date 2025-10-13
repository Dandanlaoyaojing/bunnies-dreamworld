# 小程序后端API使用指南

## 📦 已创建的文件

1. `utils/apiConfig.js` - API配置文件
2. `utils/apiService.js` - API请求服务类

## 🚀 使用方法

### 1. 在页面中引入API服务

```javascript
// 在页面的js文件顶部引入
const apiService = require('../../utils/apiService.js')
```

### 2. 用户注册示例

```javascript
// pages/register/register.js
const apiService = require('../../utils/apiService.js')

Page({
  async handleRegister() {
    try {
      wx.showLoading({ title: '注册中...' })
      
      const result = await apiService.register(
        this.data.username,
        this.data.password,
        this.data.nickname
      )
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '注册成功',
          icon: 'success'
        })
        
        // 保存用户信息和token
        wx.setStorageSync('userInfo', {
          ...result.data.user,
          token: result.data.token
        })
        
        // 跳转到首页
        wx.switchTab({ url: '/pages/index/index' })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '注册失败',
        icon: 'none'
      })
    }
  }
})
```

### 3. 用户登录示例

```javascript
// pages/login/login.js
const apiService = require('../../utils/apiService.js')

Page({
  async handleLogin() {
    try {
      wx.showLoading({ title: '登录中...' })
      
      const result = await apiService.login(
        this.data.username,
        this.data.password
      )
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '登录成功',
          icon: 'success'
        })
        
        // 跳转到首页
        setTimeout(() => {
          wx.switchTab({ url: '/pages/index/index' })
        }, 1500)
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '登录失败',
        icon: 'none'
      })
    }
  }
})
```

### 4. 创建笔记示例

```javascript
// pages/note-editor/note-editor.js
const apiService = require('../../utils/apiService.js')

Page({
  async saveNoteToServer() {
    try {
      wx.showLoading({ title: '保存中...' })
      
      const result = await apiService.createNote({
        title: this.data.title,
        content: this.data.content,
        category: this.data.category,
        tags: this.data.tags
      })
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '保存成功',
          icon: 'success'
        })
        
        // 保存笔记ID
        this.setData({
          noteId: result.data.id
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '保存失败',
        icon: 'none'
      })
    }
  }
})
```

### 5. 获取笔记列表示例

```javascript
// pages/my-notes/my-notes.js
const apiService = require('../../utils/apiService.js')

Page({
  data: {
    notes: [],
    page: 1,
    limit: 20
  },
  
  async loadNotes() {
    try {
      wx.showLoading({ title: '加载中...' })
      
      const result = await apiService.getNotes({
        page: this.data.page,
        limit: this.data.limit,
        category: this.data.selectedCategory
      })
      
      wx.hideLoading()
      
      if (result.success) {
        this.setData({
          notes: result.data.notes,
          total: result.data.pagination.total
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '加载失败',
        icon: 'none'
      })
    }
  },
  
  onLoad() {
    this.loadNotes()
  }
})
```

### 6. 搜索笔记示例

```javascript
const apiService = require('../../utils/apiService.js')

Page({
  async searchNotes(keyword) {
    try {
      const result = await apiService.searchNotes(keyword, {
        page: 1,
        limit: 20
      })
      
      if (result.success) {
        this.setData({
          searchResults: result.data.notes
        })
      }
    } catch (err) {
      console.error('搜索失败:', err)
    }
  }
})
```

### 7. 收藏笔记示例

```javascript
const apiService = require('../../utils/apiService.js')

Page({
  async toggleFavorite(noteId, isFavorite) {
    try {
      let result
      if (isFavorite) {
        // 取消收藏
        result = await apiService.unfavoriteNote(noteId)
      } else {
        // 添加收藏
        result = await apiService.favoriteNote(noteId)
      }
      
      if (result.success) {
        wx.showToast({
          title: isFavorite ? '已取消收藏' : '已收藏',
          icon: 'success'
        })
        
        // 刷新列表
        this.loadNotes()
      }
    } catch (err) {
      wx.showToast({
        title: err.message || '操作失败',
        icon: 'none'
      })
    }
  }
})
```

### 8. 云同步示例

```javascript
const apiService = require('../../utils/apiService.js')

Page({
  async syncToCloud() {
    try {
      wx.showLoading({ title: '同步中...' })
      
      // 获取本地笔记
      const localNotes = wx.getStorageSync('notes') || []
      
      // 上传到云端
      const result = await apiService.syncUpload(localNotes)
      
      wx.hideLoading()
      
      if (result.success) {
        wx.showToast({
          title: '同步成功',
          icon: 'success'
        })
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '同步失败',
        icon: 'none'
      })
    }
  },
  
  async syncFromCloud() {
    try {
      wx.showLoading({ title: '下载中...' })
      
      const result = await apiService.syncDownload()
      
      wx.hideLoading()
      
      if (result.success) {
        // 保存到本地
        wx.setStorageSync('notes', result.data.notes)
        
        wx.showToast({
          title: '下载成功',
          icon: 'success'
        })
        
        // 刷新页面
        this.loadNotes()
      }
    } catch (err) {
      wx.hideLoading()
      wx.showToast({
        title: err.message || '下载失败',
        icon: 'none'
      })
    }
  }
})
```

## 🔧 配置说明

### 1. 修改API地址

编辑 `utils/apiConfig.js` 文件：

```javascript
// 开发环境（本地测试）
const DEV_API_BASE_URL = 'http://localhost:3000/api/v1'

// 生产环境（部署后的服务器）
const PROD_API_BASE_URL = 'https://your-domain.com/api/v1'
```

### 2. 小程序合法域名配置

在微信小程序后台配置服务器域名：

1. 登录 [微信公众平台](https://mp.weixin.qq.com/)
2. 进入"开发" -> "开发管理" -> "开发设置"
3. 找到"服务器域名"配置
4. 添加你的后端服务器域名（必须是 https）

**注意**：开发阶段可以在微信开发者工具中勾选"不校验合法域名"来测试 http://localhost

### 3. 错误处理

所有API调用都使用 try-catch 包裹，错误对象结构：

```javascript
{
  code: 'ERROR_CODE',      // 错误代码
  message: '错误信息',      // 用户友好的错误提示
  statusCode: 400,         // HTTP状态码（如果有）
  data: {}                 // 额外的错误数据
}
```

常见错误代码：
- `NETWORK_ERROR` - 网络错误
- `UNAUTHORIZED` - 未授权（需要重新登录）
- `BUSINESS_ERROR` - 业务逻辑错误
- `HTTP_ERROR` - HTTP错误

## 📝 迁移现有代码

### 替换本地存储为API调用

**之前（使用本地存储）：**
```javascript
// 保存笔记
const notes = wx.getStorageSync('notes') || []
notes.push(newNote)
wx.setStorageSync('notes', notes)
```

**现在（使用API）：**
```javascript
// 保存笔记
const result = await apiService.createNote(newNote)
if (result.success) {
  // 保存成功，可以选择性地更新本地缓存
  const notes = wx.getStorageSync('notes') || []
  notes.push({ ...newNote, id: result.data.id })
  wx.setStorageSync('notes', notes)
}
```

### 混合模式（推荐）

为了提供更好的离线体验，可以使用"API + 本地缓存"的混合模式：

```javascript
// 获取笔记列表
async loadNotes() {
  try {
    // 1. 先从本地缓存读取（快速显示）
    const cachedNotes = wx.getStorageSync('notes') || []
    if (cachedNotes.length > 0) {
      this.setData({ notes: cachedNotes })
    }
    
    // 2. 从服务器获取最新数据
    const result = await apiService.getNotes()
    if (result.success) {
      // 3. 更新显示和缓存
      this.setData({ notes: result.data.notes })
      wx.setStorageSync('notes', result.data.notes)
    }
  } catch (err) {
    // 网络错误时，使用缓存数据
    console.log('使用缓存数据')
  }
}
```

## 🧪 测试连接

在小程序的任意页面添加测试按钮：

```javascript
const apiService = require('../../utils/apiService.js')

Page({
  async testConnection() {
    try {
      const result = await apiService.healthCheck()
      console.log('后端连接成功:', result)
      wx.showToast({
        title: '后端连接正常',
        icon: 'success'
      })
    } catch (err) {
      console.error('后端连接失败:', err)
      wx.showModal({
        title: '连接失败',
        content: err.message,
        showCancel: false
      })
    }
  }
})
```

## 🎯 下一步

1. **测试连接**：先测试健康检查接口，确保能连接到后端
2. **实现登录**：修改登录页面，使用API登录
3. **实现笔记同步**：修改笔记编辑器，保存到后端
4. **逐步迁移**：逐个页面替换本地存储为API调用

## ⚠️ 注意事项

1. **开发阶段**：在微信开发者工具中勾选"不校验合法域名、web-view、TLS版本及HTTPS证书"
2. **生产部署**：必须使用HTTPS域名，并在小程序后台配置
3. **Token管理**：Token会自动保存和加载，无需手动管理
4. **错误处理**：所有API调用都要用try-catch包裹
5. **离线支持**：建议保留本地缓存，提供离线查看功能

## 📞 技术支持

如有问题，请查看：
- 后端服务器日志
- 微信开发者工具Console
- 网络请求面板

