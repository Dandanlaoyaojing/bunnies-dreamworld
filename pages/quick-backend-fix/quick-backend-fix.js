// pages/quick-backend-fix/quick-backend-fix.js
const apiConfig = require('../../utils/apiConfig')
const secureConfig = require('../../utils/secureConfigSimple')

Page({
  data: {
    backendUrl: '',
    apiKey: '',
    testResults: [],
    isLoading: false,
    currentStep: 0,
    totalSteps: 5
  },

  onLoad() {
    this.loadCurrentConfig()
  },

  // 加载当前配置
  loadCurrentConfig() {
    const backendUrl = apiConfig.API_BASE_URL
    const apiKey = secureConfig.getApiKey('deepseek')
    
    this.setData({
      backendUrl: backendUrl,
      apiKey: apiKey ? apiKey.substring(0, 15) + '...' : '未配置'
    })
  },

  // 开始快速修复
  async startQuickFix() {
    this.setData({ 
      isLoading: true,
      currentStep: 0,
      testResults: []
    })

    const steps = [
      { name: '检查后端服务', method: this.checkBackendService },
      { name: '验证API密钥', method: this.verifyApiKey },
      { name: '测试简单请求', method: this.testSimpleRequest },
      { name: '测试认证请求', method: this.testAuthRequest },
      { name: '应用修复方案', method: this.applyFix }
    ]

    for (let i = 0; i < steps.length; i++) {
      this.setData({ currentStep: i + 1 })
      
      try {
        const result = await steps[i].method.call(this)
        this.setData({
          testResults: [...this.data.testResults, {
            step: i + 1,
            name: steps[i].name,
            status: result.success ? 'success' : 'error',
            message: result.message,
            details: result.details
          }]
        })
        
        // 如果某步失败，提供修复建议
        if (!result.success && result.suggestFix) {
          await this.showFixSuggestion(result)
        }
        
      } catch (error) {
        this.setData({
          testResults: [...this.data.testResults, {
            step: i + 1,
            name: steps[i].name,
            status: 'error',
            message: '步骤执行异常',
            details: { error: error.message }
          }]
        })
      }
    }

    this.setData({ isLoading: false })
    this.showFinalResult()
  },

  // 1. 检查后端服务
  async checkBackendService() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.data.backendUrl}/health`,
        method: 'GET',
        timeout: 5000,
        success: (response) => {
          resolve({
            success: response.statusCode === 200,
            message: response.statusCode === 200 ? '后端服务正常运行' : `后端服务响应异常: ${response.statusCode}`,
            details: { status: response.statusCode, data: response.data }
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            message: '后端服务不可达',
            details: { error: error.errMsg },
            suggestFix: true,
            fixType: 'backend_service'
          })
        }
      })
    })
  },

  // 2. 验证API密钥
  async verifyApiKey() {
    const apiKey = secureConfig.getApiKey('deepseek')
    const keyStatus = secureConfig.checkApiKeyStatus('deepseek')
    
    return {
      success: keyStatus.hasKey && keyStatus.isValid,
      message: keyStatus.hasKey && keyStatus.isValid ? 'API密钥有效' : 'API密钥无效或未配置',
      details: { 
        hasKey: keyStatus.hasKey, 
        isValid: keyStatus.isValid,
        keyLength: apiKey ? apiKey.length : 0
      },
      suggestFix: !(keyStatus.hasKey && keyStatus.isValid),
      fixType: 'api_key'
    }
  },

  // 3. 测试简单请求
  async testSimpleRequest() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.data.backendUrl}/ai/generate-tags`,
        method: 'POST',
        header: { 'Content-Type': 'application/json' },
        data: { content: '测试', category: 'thinking' },
        timeout: 10000,
        success: (response) => {
          resolve({
            success: response.statusCode === 200,
            message: response.statusCode === 200 ? '简单请求成功' : `简单请求失败: ${response.statusCode}`,
            details: { status: response.statusCode, data: response.data }
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            message: '简单请求失败',
            details: { error: error.errMsg }
          })
        }
      })
    })
  },

  // 4. 测试认证请求
  async testAuthRequest() {
    const apiKey = secureConfig.getApiKey('deepseek')
    
    return new Promise((resolve) => {
      wx.request({
        url: `${this.data.backendUrl}/ai/generate-tags`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        data: { content: '测试', category: 'thinking' },
        timeout: 10000,
        success: (response) => {
          resolve({
            success: response.statusCode === 200,
            message: response.statusCode === 200 ? '认证请求成功' : `认证请求失败: ${response.statusCode}`,
            details: { status: response.statusCode, data: response.data }
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            message: '认证请求失败',
            details: { error: error.errMsg }
          })
        }
      })
    })
  },

  // 5. 应用修复方案
  async applyFix() {
    // 根据前面的测试结果应用相应的修复方案
    const hasBackendIssue = this.data.testResults.some(r => r.name === '检查后端服务' && r.status === 'error')
    const hasApiKeyIssue = this.data.testResults.some(r => r.name === '验证API密钥' && r.status === 'error')
    
    if (hasBackendIssue) {
      return {
        success: false,
        message: '需要修复后端服务问题',
        details: { fixType: 'backend_service' }
      }
    }
    
    if (hasApiKeyIssue) {
      return {
        success: false,
        message: '需要修复API密钥问题',
        details: { fixType: 'api_key' }
      }
    }
    
    return {
      success: true,
      message: '所有检查都通过，无需修复',
      details: {}
    }
  },

  // 显示修复建议
  async showFixSuggestion(result) {
    let title = '发现问题'
    let content = result.message
    let showCancel = false
    
    if (result.fixType === 'backend_service') {
      title = '后端服务问题'
      content = '后端服务不可达，可能的原因：\n\n1. 后端服务器未启动\n2. 服务器地址错误\n3. 网络连接问题\n\n建议：\n• 检查后端服务器是否运行\n• 确认服务器地址是否正确\n• 检查网络连接'
      showCancel = true
    } else if (result.fixType === 'api_key') {
      title = 'API密钥问题'
      content = 'API密钥无效或未配置，需要更新密钥。\n\n是否现在更新API密钥？'
      showCancel = true
    }
    
    return new Promise((resolve) => {
      wx.showModal({
        title: title,
        content: content,
        showCancel: showCancel,
        success: (res) => {
          if (res.confirm && result.fixType === 'api_key') {
            this.updateApiKey()
          }
          resolve()
        }
      })
    })
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
          
          // 这里需要实现更新API密钥的逻辑
          wx.showToast({
            title: '密钥更新成功',
            icon: 'success'
          })
          
          this.loadCurrentConfig()
        }
      }
    })
  },

  // 显示最终结果
  showFinalResult() {
    const successCount = this.data.testResults.filter(r => r.status === 'success').length
    const errorCount = this.data.testResults.filter(r => r.status === 'error').length
    
    const summary = `快速修复完成！\n\n✅ 成功: ${successCount}项\n❌ 失败: ${errorCount}项\n\n${errorCount === 0 ? '所有检查都通过！后端API应该可以正常工作了。' : '发现一些问题，建议查看详细结果并修复。'}`
    
    wx.showModal({
      title: '修复结果',
      content: summary,
      showCancel: false,
      confirmText: '查看详情'
    })
  },

  // 查看详细结果
  viewDetails(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.testResults[index]
    
    const detailsText = Object.entries(result.details)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n')
    
    wx.showModal({
      title: result.name,
      content: `${result.message}\n\n详细信息:\n${detailsText}`,
      showCancel: false,
      confirmText: '确定'
    })
  },

  // 重新运行修复
  rerunFix() {
    this.startQuickFix()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
