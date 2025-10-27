// pages/ai-diagnostic/ai-diagnostic.js
const aiService = require('../../utils/aiService')
const unifiedAIService = require('../../utils/aiServiceUnified')
const secureConfig = require('../../utils/secureConfigSimple')
const authGuard = require('../../utils/authGuard')

Page({
  data: {
    diagnosticResults: [],
    isLoading: false,
    currentService: 'original', // 'original' 或 'unified'
    serviceStatus: null
  },

  onLoad() {
    console.log('AI服务诊断页面加载')
    this.runFullDiagnostic()
  },

  // 运行完整诊断
  async runFullDiagnostic() {
    this.setData({ isLoading: true })
    const results = []

    // 1. 检查API密钥状态
    results.push(await this.checkApiKeyStatus())
    
    // 2. 检查用户登录状态
    results.push(await this.checkUserStatus())
    
    // 3. 检查网络连接
    results.push(await this.checkNetworkConnection())
    
    // 4. 测试原始AI服务
    results.push(await this.testOriginalAIService())
    
    // 5. 测试统一AI服务
    results.push(await this.testUnifiedAIService())
    
    // 6. 检查后端服务
    results.push(await this.checkBackendService())

    this.setData({
      diagnosticResults: results,
      isLoading: false
    })

    // 显示诊断摘要
    this.showDiagnosticSummary(results)
  },

  // 检查API密钥状态
  async checkApiKeyStatus() {
    try {
      const status = secureConfig.checkApiKeyStatus('deepseek')
      const hasKey = secureConfig.getApiKey('deepseek')
      
      return {
        id: 'api_key',
        name: 'API密钥检查',
        status: status.hasKey && status.isValid ? 'success' : 'error',
        details: {
          hasKey: status.hasKey,
          isValid: status.isValid,
          isExpired: status.isExpired,
          keyPreview: hasKey ? hasKey.substring(0, 10) + '...' : '无'
        },
        message: status.hasKey && status.isValid ? 'API密钥有效' : 'API密钥无效或未配置',
        suggestions: status.hasKey && status.isValid ? [] : ['请检查API密钥配置', '确认密钥格式正确']
      }
    } catch (error) {
      return {
        id: 'api_key',
        name: 'API密钥检查',
        status: 'error',
        details: { error: error.message },
        message: 'API密钥检查失败',
        suggestions: ['检查secureConfig配置', '验证密钥格式']
      }
    }
  },

  // 检查用户登录状态
  async checkUserStatus() {
    try {
      const user = authGuard.getCurrentUser()
      
      return {
        id: 'user_status',
        name: '用户登录状态',
        status: user ? 'success' : 'warning',
        details: {
          isLoggedIn: !!user,
          username: user?.username || '未登录',
          userId: user?.userId || '无'
        },
        message: user ? `用户已登录: ${user.username}` : '用户未登录',
        suggestions: user ? [] : ['建议登录以获得完整功能', '某些AI功能可能需要登录']
      }
    } catch (error) {
      return {
        id: 'user_status',
        name: '用户登录状态',
        status: 'error',
        details: { error: error.message },
        message: '用户状态检查失败',
        suggestions: ['检查authGuard配置']
      }
    }
  },

  // 检查网络连接
  async checkNetworkConnection() {
    try {
      const startTime = Date.now()
      const response = await this.pingTest()
      const responseTime = Date.now() - startTime
      
      return {
        id: 'network',
        name: '网络连接检查',
        status: response.success ? 'success' : 'error',
        details: {
          responseTime: responseTime,
          statusCode: response.status,
          error: response.error
        },
        message: response.success ? `网络连接正常 (${responseTime}ms)` : '网络连接失败',
        suggestions: response.success ? [] : ['检查网络连接', '确认服务器地址正确']
      }
    } catch (error) {
      return {
        id: 'network',
        name: '网络连接检查',
        status: 'error',
        details: { error: error.message },
        message: '网络检查异常',
        suggestions: ['检查网络配置', '确认防火墙设置']
      }
    }
  },

  // 测试原始AI服务
  async testOriginalAIService() {
    try {
      const testContent = '这是一个测试内容，用于验证AI服务是否正常工作。'
      const result = await aiService.generateTags(testContent, 'thinking')
      
      return {
        id: 'original_ai',
        name: '原始AI服务测试',
        status: result.success ? 'success' : 'error',
        details: {
          success: result.success,
          source: result.source,
          tagsCount: result.tags?.length || 0,
          error: result.error
        },
        message: result.success ? `原始AI服务正常 (${result.source})` : `原始AI服务失败: ${result.error}`,
        suggestions: result.success ? [] : ['检查原始AI服务配置', '验证API密钥', '检查网络连接']
      }
    } catch (error) {
      return {
        id: 'original_ai',
        name: '原始AI服务测试',
        status: 'error',
        details: { error: error.message },
        message: '原始AI服务测试异常',
        suggestions: ['检查aiService配置', '查看控制台错误日志']
      }
    }
  },

  // 测试统一AI服务
  async testUnifiedAIService() {
    try {
      const testContent = '这是一个测试内容，用于验证统一AI服务是否正常工作。'
      const result = await unifiedAIService.generateTags(testContent, 'thinking')
      
      return {
        id: 'unified_ai',
        name: '统一AI服务测试',
        status: result.success ? 'success' : 'error',
        details: {
          success: result.success,
          source: result.source,
          tagsCount: result.tags?.length || 0,
          error: result.error
        },
        message: result.success ? `统一AI服务正常 (${result.source})` : `统一AI服务失败: ${result.error}`,
        suggestions: result.success ? [] : ['检查统一AI服务配置', '验证后端服务状态']
      }
    } catch (error) {
      return {
        id: 'unified_ai',
        name: '统一AI服务测试',
        status: 'error',
        details: { error: error.message },
        message: '统一AI服务测试异常',
        suggestions: ['检查aiServiceUnified配置', '查看控制台错误日志']
      }
    }
  },

  // 检查后端服务
  async checkBackendService() {
    try {
      const status = await unifiedAIService.checkBackendAvailability()
      
      return {
        id: 'backend',
        name: '后端服务检查',
        status: status ? 'success' : 'warning',
        details: {
          available: status,
          baseURL: unifiedAIService.baseURL
        },
        message: status ? '后端服务可用' : '后端服务不可用，将使用本地方案',
        suggestions: status ? [] : ['检查后端服务器状态', '确认服务器地址正确', '检查网络连接']
      }
    } catch (error) {
      return {
        id: 'backend',
        name: '后端服务检查',
        status: 'error',
        details: { error: error.message },
        message: '后端服务检查异常',
        suggestions: ['检查后端服务器配置', '查看服务器日志']
      }
    }
  },

  // 网络ping测试
  async pingTest() {
    return new Promise((resolve) => {
      wx.request({
        url: 'https://www.baidu.com',
        method: 'GET',
        timeout: 5000,
        success: (response) => {
          resolve({
            success: true,
            status: response.statusCode
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            error: error.errMsg
          })
        }
      })
    })
  },

  // 显示诊断摘要
  showDiagnosticSummary(results) {
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    const warningCount = results.filter(r => r.status === 'warning').length
    
    const summary = `诊断完成！\n\n✅ 正常: ${successCount}项\n⚠️ 警告: ${warningCount}项\n❌ 错误: ${errorCount}项\n\n${errorCount > 0 ? '发现一些问题，建议查看详细结果并修复。' : '所有检查项都正常！'}`
    
    wx.showModal({
      title: '诊断摘要',
      content: summary,
      showCancel: false,
      confirmText: '查看详情'
    })
  },

  // 切换AI服务
  switchAIService(e) {
    const service = e.currentTarget.dataset.service
    this.setData({
      currentService: service
    })
    
    wx.showToast({
      title: `已切换到${service === 'original' ? '原始' : '统一'}AI服务`,
      icon: 'success'
    })
  },

  // 重新运行诊断
  rerunDiagnostic() {
    this.runFullDiagnostic()
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

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
