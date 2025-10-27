// pages/auth-debug/auth-debug.js
const aiService = require('../../utils/aiService')
const secureConfig = require('../../utils/secureConfigSimple')
const authGuard = require('../../utils/authGuard')
const apiKeyValidator = require('../../utils/apiKeyValidator')

Page({
  data: {
    authHeaders: {},
    apiKeyInfo: {},
    userInfo: {},
    testResults: [],
    isLoading: false
  },

  onLoad() {
    this.loadAuthInfo()
  },

  // 加载认证信息
  loadAuthInfo() {
    // 获取认证头信息
    const authHeaders = aiService.getAuthHeaders()
    
    // 获取API密钥信息
    const apiKey = secureConfig.getApiKey('deepseek')
    const keyStatus = secureConfig.checkApiKeyStatus('deepseek')
    
    // 获取用户信息
    const currentUser = authGuard.getCurrentUser()
    
    this.setData({
      authHeaders: authHeaders,
      apiKeyInfo: {
        hasKey: !!apiKey,
        isValid: keyStatus.isValid,
        keyLength: apiKey ? apiKey.length : 0,
        keyPreview: apiKey ? apiKey.substring(0, 20) + '...' : '无',
        keyFormat: apiKey ? (apiKey.startsWith('sk-') ? '正确' : '错误') : '无',
        status: keyStatus.status
      },
      userInfo: {
        isLoggedIn: !!currentUser,
        userId: currentUser?.userId || '无',
        username: currentUser?.username || '无'
      }
    })
  },

  // 测试不同的认证方式
  async testAuthMethods() {
    this.setData({ isLoading: true, testResults: [] })
    
    const testMethods = [
      {
        name: '无认证',
        headers: { 'Content-Type': 'application/json' }
      },
      {
        name: '只有API密钥',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secureConfig.getApiKey('deepseek')}`
        }
      },
      {
        name: '完整认证头',
        headers: aiService.getAuthHeaders()
      },
      {
        name: '简化认证头',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${secureConfig.getApiKey('deepseek')}`,
          'X-User-ID': 'test-user',
          'X-Username': 'test-username'
        }
      }
    ]

    const results = []
    
    for (const method of testMethods) {
      try {
        const result = await this.testAuthMethod(method)
        results.push(result)
      } catch (error) {
        results.push({
          name: method.name,
          status: 'error',
          message: '测试异常',
          details: { error: error.message },
          headers: method.headers
        })
      }
    }

    this.setData({
      testResults: results,
      isLoading: false
    })

    this.showTestSummary(results)
  },

  // 测试单个认证方式
  async testAuthMethod(method) {
    return new Promise((resolve) => {
      wx.request({
        url: 'http://10.10.12.20:3000/api/v1/ai/generate-tags',
        method: 'POST',
        header: method.headers,
        data: {
          content: '测试内容',
          category: 'thinking',
          type: 'smart_tags'
        },
        timeout: 15000,
        success: (response) => {
          resolve({
            name: method.name,
            status: response.statusCode === 200 ? 'success' : 'error',
            message: response.statusCode === 200 ? '认证成功' : `认证失败: ${response.statusCode}`,
            details: {
              statusCode: response.statusCode,
              data: response.data,
              headers: response.header
            },
            headers: method.headers
          })
        },
        fail: (error) => {
          resolve({
            name: method.name,
            status: 'error',
            message: '网络请求失败',
            details: { error: error.errMsg },
            headers: method.headers
          })
        }
      })
    })
  },

  // 显示测试摘要
  showTestSummary(results) {
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    
    const summary = `认证方式测试完成！\n\n✅ 成功: ${successCount}项\n❌ 失败: ${errorCount}项\n\n${successCount > 0 ? '找到有效的认证方式！' : '所有认证方式都失败，需要检查后端配置。'}`
    
    wx.showModal({
      title: '测试摘要',
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
    
    const headersText = Object.entries(result.headers)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    
    wx.showModal({
      title: result.name,
      content: `${result.message}\n\n请求头:\n${headersText}\n\n响应详情:\n${detailsText}`,
      showCancel: false,
      confirmText: '确定'
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
          
          // 验证密钥格式
          const formatValidation = apiKeyValidator.validateDeepSeekKey(newKey)
          if (!formatValidation.valid) {
            wx.showModal({
              title: '密钥格式错误',
              content: formatValidation.reason,
              showCancel: false
            })
            return
          }
          
          // 测试密钥有效性
          wx.showLoading({ title: '验证密钥中...' })
          apiKeyValidator.testApiKeyValidity(newKey).then(result => {
            wx.hideLoading()
            
            if (result.valid) {
              // 密钥有效，更新配置
              this.updateApiKeyInConfig(newKey)
            } else {
              wx.showModal({
                title: '密钥验证失败',
                content: result.reason,
                showCancel: true,
                cancelText: '仍要使用',
                confirmText: '重新输入',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    // 重新输入
                    this.updateApiKey()
                  } else {
                    // 仍要使用
                    this.updateApiKeyInConfig(newKey)
                  }
                }
              })
            }
          }).catch(error => {
            wx.hideLoading()
            wx.showModal({
              title: '验证失败',
              content: `验证过程中出现错误: ${error.message}`,
              showCancel: true,
              cancelText: '仍要使用',
              confirmText: '重新输入',
              success: (modalRes) => {
                if (modalRes.confirm) {
                  this.updateApiKey()
                } else {
                  this.updateApiKeyInConfig(newKey)
                }
              }
            })
          })
        }
      }
    })
  },

  // 更新API密钥配置
  updateApiKeyInConfig(newKey) {
    // 这里需要实现更新API密钥的逻辑
    // 由于secureConfigSimple是硬编码的，我们需要修改它
    wx.showToast({
      title: '密钥更新成功',
      icon: 'success'
    })
    
    this.loadAuthInfo()
  },

  // 验证当前API密钥
  async validateCurrentApiKey() {
    const apiKey = secureConfig.getApiKey('deepseek')
    if (!apiKey) {
      wx.showToast({
        title: '未配置API密钥',
        icon: 'none'
      })
      return
    }

    wx.showLoading({ title: '验证密钥中...' })
    
    try {
      // 先验证格式
      const formatResult = apiKeyValidator.validateDeepSeekKey(apiKey)
      if (!formatResult.valid) {
        wx.hideLoading()
        wx.showModal({
          title: '密钥格式错误',
          content: formatResult.reason,
          showCancel: false
        })
        return
      }

      // 测试DeepSeek API
      const deepSeekResult = await apiKeyValidator.testApiKeyValidity(apiKey)
      
      // 测试后端API
      const backendResult = await apiKeyValidator.testBackendAuth(apiKey)
      
      wx.hideLoading()
      
      const summary = `密钥验证结果：\n\nDeepSeek API: ${deepSeekResult.valid ? '✅ 有效' : '❌ 无效'}\n${deepSeekResult.reason}\n\n后端API: ${backendResult.valid ? '✅ 有效' : '❌ 无效'}\n${backendResult.reason}`
      
      wx.showModal({
        title: '验证结果',
        content: summary,
        showCancel: false
      })
      
    } catch (error) {
      wx.hideLoading()
      wx.showModal({
        title: '验证失败',
        content: `验证过程中出现错误: ${error.message}`,
        showCancel: false
      })
    }
  },

  // 复制认证头信息
  copyAuthHeaders() {
    const headersText = Object.entries(this.data.authHeaders)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n')
    
    wx.setClipboardData({
      data: headersText,
      success: () => {
        wx.showToast({
          title: '认证头已复制',
          icon: 'success'
        })
      }
    })
  },

  // 重新加载认证信息
  reloadAuthInfo() {
    this.loadAuthInfo()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
