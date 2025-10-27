// utils/backendApiTester.js - 后端API测试工具
const apiConfig = require('./apiConfig')
const secureConfig = require('./secureConfigSimple')
const authGuard = require('./authGuard')

class BackendApiTester {
  constructor() {
    this.baseURL = apiConfig.API_BASE_URL
    this.endpoints = apiConfig.API_ENDPOINTS
  }

  /**
   * 测试后端服务是否可达
   */
  async testBackendReachability() {
    console.log('测试后端服务可达性:', this.baseURL)
    
    return new Promise((resolve) => {
      wx.request({
        url: `${this.baseURL}/health`,
        method: 'GET',
        timeout: 10000,
        success: (response) => {
          console.log('后端服务响应:', response)
          resolve({
            success: true,
            status: response.statusCode,
            data: response.data,
            message: '后端服务可达'
          })
        },
        fail: (error) => {
          console.error('后端服务不可达:', error)
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败',
            message: '后端服务不可达'
          })
        }
      })
    })
  }

  /**
   * 测试API端点是否存在
   */
  async testApiEndpoint(endpoint = '/ai/generate-tags') {
    console.log('测试API端点:', endpoint)
    
    const url = `${this.baseURL}${endpoint}`
    const headers = this.getTestHeaders()
    
    return new Promise((resolve) => {
      wx.request({
        url: url,
        method: 'POST',
        header: headers,
        data: {
          content: '测试内容',
          category: 'thinking',
          type: 'smart_tags'
        },
        timeout: 15000,
        success: (response) => {
          console.log('API端点响应:', response)
          resolve({
            success: response.statusCode === 200,
            status: response.statusCode,
            data: response.data,
            message: `API端点响应: ${response.statusCode}`
          })
        },
        fail: (error) => {
          console.error('API端点请求失败:', error)
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败',
            message: 'API端点请求失败'
          })
        }
      })
    })
  }

  /**
   * 测试不同的认证方式
   */
  async testDifferentAuthMethods() {
    const results = []
    
    // 1. 无认证
    results.push(await this.testWithAuth({}))
    
    // 2. 只有API密钥
    const apiKey = secureConfig.getApiKey('deepseek')
    if (apiKey) {
      results.push(await this.testWithAuth({
        'Authorization': `Bearer ${apiKey}`
      }))
    }
    
    // 3. 完整认证头
    results.push(await this.testWithAuth(this.getTestHeaders()))
    
    return results
  }

  /**
   * 使用指定认证头测试
   */
  async testWithAuth(headers) {
    const url = `${this.baseURL}/ai/generate-tags`
    const testHeaders = {
      'Content-Type': 'application/json',
      ...headers
    }
    
    console.log('测试认证头:', testHeaders)
    
    return new Promise((resolve) => {
      wx.request({
        url: url,
        method: 'POST',
        header: testHeaders,
        data: {
          content: '测试内容',
          category: 'thinking',
          type: 'smart_tags'
        },
        timeout: 15000,
        success: (response) => {
          resolve({
            success: response.statusCode === 200,
            status: response.statusCode,
            data: response.data,
            headers: testHeaders,
            message: `认证测试: ${response.statusCode}`
          })
        },
        fail: (error) => {
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败',
            headers: testHeaders,
            message: '认证测试失败'
          })
        }
      })
    })
  }

  /**
   * 获取测试用的认证头
   */
  getTestHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // 添加API密钥认证
    const apiKey = secureConfig.getApiKey('deepseek')
    if (apiKey) {
      headers['Authorization'] = `Bearer ${apiKey}`
    }
    
    // 添加用户认证（如果已登录）
    const currentUser = authGuard.getCurrentUser()
    if (currentUser && currentUser.userId) {
      headers['X-User-ID'] = currentUser.userId
      headers['X-Username'] = currentUser.username
    }
    
    // 添加应用标识
    headers['X-App-Version'] = '1.0.0'
    headers['X-Client-Type'] = 'miniprogram'
    
    return headers
  }

  /**
   * 检查API密钥状态
   */
  checkApiKeyStatus() {
    const apiKey = secureConfig.getApiKey('deepseek')
    const keyStatus = secureConfig.checkApiKeyStatus('deepseek')
    
    return {
      hasKey: !!apiKey,
      isValid: keyStatus.isValid,
      keyLength: apiKey ? apiKey.length : 0,
      keyPreview: apiKey ? apiKey.substring(0, 15) + '...' : '无',
      keyFormat: apiKey ? (apiKey.startsWith('sk-') ? '正确' : '错误') : '无',
      status: keyStatus.status
    }
  }

  /**
   * 运行完整诊断
   */
  async runFullDiagnostic() {
    console.log('开始后端API完整诊断')
    
    const results = {
      backendReachability: await this.testBackendReachability(),
      apiEndpoint: await this.testApiEndpoint(),
      authMethods: await this.testDifferentAuthMethods(),
      apiKeyStatus: this.checkApiKeyStatus()
    }
    
    console.log('诊断结果:', results)
    return results
  }

  /**
   * 生成诊断报告
   */
  generateDiagnosticReport(results) {
    const report = {
      timestamp: new Date().toISOString(),
      baseURL: this.baseURL,
      summary: {
        backendReachable: results.backendReachability.success,
        apiEndpointWorking: results.apiEndpoint.success,
        apiKeyValid: results.apiKeyStatus.isValid,
        authWorking: results.authMethods.some(method => method.success)
      },
      details: results,
      recommendations: []
    }
    
    // 生成建议
    if (!results.backendReachability.success) {
      report.recommendations.push('检查后端服务器是否启动')
      report.recommendations.push('确认服务器地址是否正确')
      report.recommendations.push('检查网络连接')
    }
    
    if (!results.apiKeyStatus.isValid) {
      report.recommendations.push('检查API密钥配置')
      report.recommendations.push('确认密钥格式正确')
      report.recommendations.push('验证密钥是否有效')
    }
    
    if (!results.apiEndpoint.success) {
      report.recommendations.push('检查API端点路径')
      report.recommendations.push('确认后端服务支持该端点')
      report.recommendations.push('验证请求方法')
    }
    
    if (!results.authMethods.some(method => method.success)) {
      report.recommendations.push('检查认证头格式')
      report.recommendations.push('确认后端期望的认证方式')
      report.recommendations.push('验证API密钥有效性')
    }
    
    return report
  }
}

// 创建单例实例
const backendApiTester = new BackendApiTester()

module.exports = backendApiTester
