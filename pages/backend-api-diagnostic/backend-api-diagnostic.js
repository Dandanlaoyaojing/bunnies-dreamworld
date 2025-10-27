// pages/backend-api-diagnostic/backend-api-diagnostic.js
const aiService = require('../../utils/aiService')
const secureConfig = require('../../utils/secureConfigSimple')
const authGuard = require('../../utils/authGuard')
const apiConfig = require('../../utils/apiConfig')
const backendApiTester = require('../../utils/backendApiTester')

Page({
  data: {
    diagnosticResults: [],
    isLoading: false,
    apiKey: '',
    backendUrl: '',
    testContent: '这是一个测试内容，用于验证后端API是否正常工作。'
  },

  onLoad() {
    console.log('后端API诊断页面加载')
    this.loadCurrentConfig()
  },

  // 加载当前配置
  loadCurrentConfig() {
    const apiKey = secureConfig.getApiKey('deepseek')
    const backendUrl = apiConfig.API_BASE_URL
    
    this.setData({
      apiKey: apiKey ? apiKey.substring(0, 10) + '...' : '未配置',
      backendUrl: backendUrl
    })
  },

  // 运行完整诊断
  async runFullDiagnostic() {
    this.setData({ isLoading: true })
    
    try {
      // 使用新的测试工具进行完整诊断
      const diagnosticResults = await backendApiTester.runFullDiagnostic()
      const report = backendApiTester.generateDiagnosticReport(diagnosticResults)
      
      // 转换为页面显示格式
      const results = [
        {
          id: 'backend_reachability',
          name: '后端服务可达性',
          status: diagnosticResults.backendReachability.success ? 'success' : 'error',
          details: diagnosticResults.backendReachability,
          message: diagnosticResults.backendReachability.message,
          suggestions: diagnosticResults.backendReachability.success ? [] : [
            '检查后端服务器是否启动',
            '确认服务器地址是否正确',
            '检查网络连接'
          ]
        },
        {
          id: 'api_endpoint',
          name: 'API端点测试',
          status: diagnosticResults.apiEndpoint.success ? 'success' : 'error',
          details: diagnosticResults.apiEndpoint,
          message: diagnosticResults.apiEndpoint.message,
          suggestions: diagnosticResults.apiEndpoint.success ? [] : [
            '检查API端点路径',
            '确认后端服务支持该端点',
            '验证请求方法'
          ]
        },
        {
          id: 'api_key_status',
          name: 'API密钥状态',
          status: diagnosticResults.apiKeyStatus.isValid ? 'success' : 'error',
          details: diagnosticResults.apiKeyStatus,
          message: diagnosticResults.apiKeyStatus.isValid ? 'API密钥有效' : 'API密钥无效',
          suggestions: diagnosticResults.apiKeyStatus.isValid ? [] : [
            '检查API密钥配置',
            '确认密钥格式正确',
            '验证密钥是否有效'
          ]
        },
        {
          id: 'auth_methods',
          name: '认证方式测试',
          status: diagnosticResults.authMethods.some(method => method.success) ? 'success' : 'error',
          details: { methods: diagnosticResults.authMethods },
          message: diagnosticResults.authMethods.some(method => method.success) ? '至少一种认证方式有效' : '所有认证方式都失败',
          suggestions: diagnosticResults.authMethods.some(method => method.success) ? [] : [
            '检查认证头格式',
            '确认后端期望的认证方式',
            '验证API密钥有效性'
          ]
        }
      ]

      this.setData({
        diagnosticResults: results,
        isLoading: false
      })

      this.showDiagnosticSummary(results)
      
      // 在控制台输出详细报告
      console.log('后端API诊断报告:', report)
      
    } catch (error) {
      console.error('诊断过程出错:', error)
      this.setData({
        diagnosticResults: [{
          id: 'diagnostic_error',
          name: '诊断过程错误',
          status: 'error',
          details: { error: error.message },
          message: '诊断过程出现异常',
          suggestions: ['检查网络连接', '查看控制台错误']
        }],
        isLoading: false
      })
    }
  },

  // 检查API密钥配置
  async checkApiKeyConfig() {
    try {
      const apiKey = secureConfig.getApiKey('deepseek')
      const keyStatus = secureConfig.checkApiKeyStatus('deepseek')
      
      return {
        id: 'api_key_config',
        name: 'API密钥配置检查',
        status: keyStatus.hasKey && keyStatus.isValid ? 'success' : 'error',
        details: {
          hasKey: keyStatus.hasKey,
          isValid: keyStatus.isValid,
          keyLength: apiKey ? apiKey.length : 0,
          keyPreview: apiKey ? apiKey.substring(0, 15) + '...' : '无',
          keyFormat: apiKey ? (apiKey.startsWith('sk-') ? '正确' : '错误') : '无'
        },
        message: keyStatus.hasKey && keyStatus.isValid ? 'API密钥配置正确' : 'API密钥配置有问题',
        suggestions: keyStatus.hasKey && keyStatus.isValid ? [] : [
          '检查API密钥是否正确',
          '确认密钥格式为sk-开头',
          '验证密钥是否有效'
        ]
      }
    } catch (error) {
      return {
        id: 'api_key_config',
        name: 'API密钥配置检查',
        status: 'error',
        details: { error: error.message },
        message: 'API密钥配置检查失败',
        suggestions: ['检查secureConfig配置', '查看控制台错误']
      }
    }
  },

  // 检查后端服务连接
  async checkBackendConnection() {
    try {
      const startTime = Date.now()
      const response = await this.pingBackend()
      const responseTime = Date.now() - startTime
      
      return {
        id: 'backend_connection',
        name: '后端服务连接检查',
        status: response.success ? 'success' : 'error',
        details: {
          success: response.success,
          responseTime: responseTime,
          statusCode: response.status,
          url: this.data.backendUrl,
          error: response.error
        },
        message: response.success ? `后端服务连接正常 (${responseTime}ms)` : `后端服务连接失败: ${response.error}`,
        suggestions: response.success ? [] : [
          '检查后端服务器是否启动',
          '确认服务器地址是否正确',
          '检查网络连接',
          '验证防火墙设置'
        ]
      }
    } catch (error) {
      return {
        id: 'backend_connection',
        name: '后端服务连接检查',
        status: 'error',
        details: { error: error.message },
        message: '后端服务连接检查异常',
        suggestions: ['检查网络配置', '查看控制台错误']
      }
    }
  },

  // 检查认证头信息
  async checkAuthHeaders() {
    try {
      const headers = aiService.getAuthHeaders()
      const hasAuth = !!headers['Authorization']
      const hasUser = !!headers['X-User-ID']
      
      return {
        id: 'auth_headers',
        name: '认证头信息检查',
        status: hasAuth ? 'success' : 'error',
        details: {
          hasAuthorization: hasAuth,
          hasUserInfo: hasUser,
          headers: Object.keys(headers),
          authPreview: hasAuth ? headers['Authorization'].substring(0, 20) + '...' : '无',
          userInfo: hasUser ? `${headers['X-User-ID']} (${headers['X-Username']})` : '无'
        },
        message: hasAuth ? '认证头信息配置正确' : '认证头信息配置有问题',
        suggestions: hasAuth ? [] : [
          '检查API密钥是否正确配置',
          '确认secureConfig工作正常',
          '验证密钥获取逻辑'
        ]
      }
    } catch (error) {
      return {
        id: 'auth_headers',
        name: '认证头信息检查',
        status: 'error',
        details: { error: error.message },
        message: '认证头信息检查失败',
        suggestions: ['检查getAuthHeaders方法', '查看控制台错误']
      }
    }
  },

  // 测试API端点
  async testApiEndpoint() {
    try {
      const endpoint = '/ai/generate-tags'
      const url = `${this.data.backendUrl}${endpoint}`
      
      const response = await this.testEndpoint(url)
      
      return {
        id: 'api_endpoint',
        name: 'API端点测试',
        status: response.success ? 'success' : 'error',
        details: {
          endpoint: endpoint,
          url: url,
          statusCode: response.status,
          response: response.data,
          error: response.error
        },
        message: response.success ? 'API端点可访问' : `API端点访问失败: ${response.error}`,
        suggestions: response.success ? [] : [
          '检查API端点路径是否正确',
          '确认后端服务是否支持该端点',
          '验证请求方法是否正确'
        ]
      }
    } catch (error) {
      return {
        id: 'api_endpoint',
        name: 'API端点测试',
        status: 'error',
        details: { error: error.message },
        message: 'API端点测试异常',
        suggestions: ['检查网络配置', '查看控制台错误']
      }
    }
  },

  // 测试完整AI请求
  async testFullAIRequest() {
    try {
      const result = await aiService.generateTags(this.data.testContent, 'thinking')
      
      return {
        id: 'full_ai_request',
        name: '完整AI请求测试',
        status: result.success ? 'success' : 'error',
        details: {
          success: result.success,
          source: result.source,
          tagsCount: result.tags?.length || 0,
          tags: result.tags || [],
          error: result.error,
          code: result.code
        },
        message: result.success ? `AI请求成功，生成${result.tags?.length || 0}个标签` : `AI请求失败: ${result.error}`,
        suggestions: result.success ? [] : [
          '检查后端API认证配置',
          '验证请求数据格式',
          '确认后端服务状态',
          '查看后端服务日志'
        ]
      }
    } catch (error) {
      return {
        id: 'full_ai_request',
        name: '完整AI请求测试',
        status: 'error',
        details: { error: error.message },
        message: 'AI请求测试异常',
        suggestions: ['检查AI服务配置', '查看控制台错误']
      }
    }
  },

  // 后端服务ping测试
  async pingBackend() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.data.backendUrl}/health`,
        method: 'GET',
        timeout: 10000,
        success: (response) => {
          resolve({
            success: response.statusCode === 200,
            status: response.statusCode,
            data: response.data
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败'
          })
        }
      })
    })
  },

  // 测试API端点
  async testEndpoint(url) {
    return new Promise((resolve) => {
      const headers = aiService.getAuthHeaders()
      
      wx.request({
        url: url,
        method: 'POST',
        header: headers,
        data: {
          content: this.data.testContent,
          category: 'thinking',
          type: 'smart_tags'
        },
        timeout: 15000,
        success: (response) => {
          resolve({
            success: response.statusCode === 200,
            status: response.statusCode,
            data: response.data
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败'
          })
        }
      })
    })
  },

  // 显示诊断摘要
  showDiagnosticSummary(results) {
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    
    const summary = `后端API诊断完成！\n\n✅ 成功: ${successCount}项\n❌ 失败: ${errorCount}项\n\n${errorCount === 0 ? '所有检查都通过！后端API工作正常。' : '发现一些问题，建议查看详细结果并修复。'}`
    
    wx.showModal({
      title: '诊断摘要',
      content: summary,
      showCancel: false,
      confirmText: '查看详情'
    })
  },

  // 查看详细结果
  viewDetails(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.diagnosticResults[index]
    
    const detailsText = Object.entries(result.details)
      .map(([key, value]) => `${key}: ${JSON.stringify(value)}`)
      .join('\n')
    
    const suggestionsText = result.suggestions.length > 0 
      ? '\n\n建议解决方案:\n' + result.suggestions.map(s => `• ${s}`).join('\n')
      : ''
    
    wx.showModal({
      title: result.name,
      content: `${result.message}\n\n详细信息:\n${detailsText}${suggestionsText}`,
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
            this.loadCurrentConfig()
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

  // 重新运行诊断
  rerunDiagnostic() {
    this.runFullDiagnostic()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
