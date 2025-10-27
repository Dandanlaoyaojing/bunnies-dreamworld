// pages/api-status/api-status.js
const aiService = require('../../utils/aiService')
const secureConfig = require('../../utils/secureConfigSimple')
const authGuard = require('../../utils/authGuard')

Page({
  data: {
    apiStatus: null,
    isLoading: false,
    testResults: [],
    currentUser: null
  },

  onLoad() {
    console.log('API状态检查页面加载')
    this.checkApiStatus()
    this.loadCurrentUser()
  },

  // 检查API状态
  checkApiStatus() {
    this.setData({ isLoading: true })
    
    try {
      const apiStatus = aiService.checkApiStatus()
      this.setData({
        apiStatus: apiStatus,
        isLoading: false
      })
      
      console.log('API状态检查结果:', apiStatus)
    } catch (error) {
      console.error('检查API状态失败:', error)
      this.setData({ isLoading: false })
      
      wx.showToast({
        title: '检查失败',
        icon: 'none'
      })
    }
  },

  // 加载当前用户信息
  loadCurrentUser() {
    const currentUser = authGuard.getCurrentUser()
    this.setData({
      currentUser: currentUser
    })
  },

  // 测试API连接
  async testApiConnection() {
    this.setData({ isLoading: true })
    
    try {
      // 测试智能标签生成
      const testContent = '这是一个测试内容，用于验证AI服务是否正常工作。'
      const result = await aiService.generateSmartTags(testContent, 'thinking')
      
      const testResult = {
        id: Date.now(),
        test: '智能标签生成',
        success: result.success,
        source: result.source || 'unknown',
        error: result.error || null,
        timestamp: new Date().toLocaleString()
      }
      
      this.setData({
        testResults: [testResult, ...this.data.testResults],
        isLoading: false
      })
      
      if (result.success) {
        wx.showModal({
          title: '测试成功',
          content: `API连接正常！\n\n生成的标签：${result.tags ? result.tags.join(', ') : '无'}\n数据源：${result.source}`,
          showCancel: false,
          confirmText: '确定'
        })
      } else {
        wx.showModal({
          title: '测试失败',
          content: `API连接失败：\n\n${result.error || '未知错误'}`,
          showCancel: false,
          confirmText: '确定'
        })
      }
      
    } catch (error) {
      console.error('API测试失败:', error)
      this.setData({ isLoading: false })
      
      const testResult = {
        id: Date.now(),
        test: '智能标签生成',
        success: false,
        source: 'error',
        error: error.message || '测试异常',
        timestamp: new Date().toLocaleString()
      }
      
      this.setData({
        testResults: [testResult, ...this.data.testResults]
      })
      
      wx.showModal({
        title: '测试异常',
        content: `测试过程中出现异常：\n\n${error.message}`,
        showCancel: false,
        confirmText: '确定'
      })
    }
  },

  // 更新API密钥
  updateApiKey() {
    wx.showModal({
      title: '更新API密钥',
      content: '请输入新的DeepSeek API密钥：',
      editable: true,
      placeholderText: 'sk-xxxxxxxxxxxxxxxx',
      success: (res) => {
        if (res.confirm && res.content) {
          const newKey = res.content.trim()
          
          if (!newKey.startsWith('sk-') || newKey.length < 20) {
            wx.showToast({
              title: '密钥格式无效',
              icon: 'none'
            })
            return
          }
          
          const success = secureConfig.updateApiKey('deepseek', newKey)
          if (success) {
            wx.showToast({
              title: '密钥更新成功',
              icon: 'success'
            })
            // 重新检查API状态
            this.checkApiStatus()
          } else {
            wx.showToast({
              title: '密钥更新失败',
              icon: 'none'
            })
          }
        }
      }
    })
  },

  // 清除测试结果
  clearTestResults() {
    this.setData({
      testResults: []
    })
  },

  // 显示详细状态信息
  showDetailedStatus() {
    const status = this.data.apiStatus
    if (!status) return
    
    const statusText = `
API服务状态详情：

🔑 API密钥状态：
• 服务：${status.apiKey.service}
• 有密钥：${status.apiKey.hasKey ? '是' : '否'}
• 密钥有效：${status.apiKey.isValid ? '是' : '否'}
• 状态：${status.apiKey.status}

👤 用户状态：
• 已登录：${status.user.isLoggedIn ? '是' : '否'}
${status.user.isLoggedIn ? `• 用户名：${status.user.username}\n• 用户ID：${status.user.userId}` : ''}

🌐 服务配置：
• 基础URL：${status.service.baseURL}
• 端点数量：${Object.keys(status.service.endpoints).length}
    `
    
    wx.showModal({
      title: '详细状态信息',
      content: statusText,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 跳转到登录页面
  goToLogin() {
    wx.navigateTo({
      url: '/pages/login/login'
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
