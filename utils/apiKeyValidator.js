// utils/apiKeyValidator.js - API密钥验证工具
class ApiKeyValidator {
  constructor() {
    this.validationCache = new Map()
  }

  /**
   * 验证DeepSeek API密钥格式
   */
  validateDeepSeekKey(apiKey) {
    if (!apiKey) {
      return { valid: false, reason: 'API密钥为空' }
    }

    if (typeof apiKey !== 'string') {
      return { valid: false, reason: 'API密钥必须是字符串' }
    }

    if (!apiKey.startsWith('sk-')) {
      return { valid: false, reason: 'DeepSeek API密钥必须以"sk-"开头' }
    }

    if (apiKey.length < 20) {
      return { valid: false, reason: 'API密钥长度太短' }
    }

    if (apiKey.length > 100) {
      return { valid: false, reason: 'API密钥长度太长' }
    }

    // 检查是否包含有效字符
    const validChars = /^[a-zA-Z0-9\-_]+$/
    if (!validChars.test(apiKey)) {
      return { valid: false, reason: 'API密钥包含无效字符' }
    }

    return { valid: true, reason: '格式正确' }
  }

  /**
   * 测试API密钥是否有效（通过实际API调用）
   */
  async testApiKeyValidity(apiKey, service = 'deepseek') {
    if (!this.validateDeepSeekKey(apiKey).valid) {
      return { valid: false, reason: 'API密钥格式无效' }
    }

    // 检查缓存
    const cacheKey = `${service}-${apiKey.substring(0, 10)}`
    if (this.validationCache.has(cacheKey)) {
      return this.validationCache.get(cacheKey)
    }

    try {
      const result = await this.makeTestRequest(apiKey, service)
      this.validationCache.set(cacheKey, result)
      return result
    } catch (error) {
      const result = { valid: false, reason: `测试请求失败: ${error.message}` }
      this.validationCache.set(cacheKey, result)
      return result
    }
  }

  /**
   * 发送测试请求验证API密钥
   */
  async makeTestRequest(apiKey, service) {
    return new Promise((resolve) => {
      // 使用DeepSeek API进行测试
      const testUrl = 'https://api.deepseek.com/v1/chat/completions'
      
      wx.request({
        url: testUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        data: {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: 'Hello, this is a test message.'
            }
          ],
          max_tokens: 10,
          temperature: 0.1
        },
        timeout: 10000,
        success: (response) => {
          if (response.statusCode === 200) {
            resolve({ valid: true, reason: 'API密钥有效' })
          } else if (response.statusCode === 401) {
            resolve({ valid: false, reason: 'API密钥无效或已过期' })
          } else if (response.statusCode === 403) {
            resolve({ valid: false, reason: 'API密钥权限不足' })
          } else if (response.statusCode === 429) {
            resolve({ valid: false, reason: 'API调用频率限制' })
          } else {
            resolve({ valid: false, reason: `API返回错误: ${response.statusCode}` })
          }
        },
        fail: (error) => {
          if (error.errMsg.includes('timeout')) {
            resolve({ valid: false, reason: '请求超时，请检查网络连接' })
          } else if (error.errMsg.includes('fail')) {
            resolve({ valid: false, reason: '网络请求失败' })
          } else {
            resolve({ valid: false, reason: `网络错误: ${error.errMsg}` })
          }
        }
      })
    })
  }

  /**
   * 测试后端API认证
   */
  async testBackendAuth(apiKey, backendUrl = 'http://10.10.12.20:3000/api/v1') {
    return new Promise((resolve) => {
      wx.request({
        url: `${backendUrl}/ai/generate-tags`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`
        },
        data: {
          content: '测试内容',
          category: 'thinking',
          type: 'smart_tags'
        },
        timeout: 15000,
        success: (response) => {
          if (response.statusCode === 200) {
            resolve({ valid: true, reason: '后端API认证成功' })
          } else if (response.statusCode === 401) {
            resolve({ valid: false, reason: '后端API认证失败，密钥可能无效' })
          } else if (response.statusCode === 403) {
            resolve({ valid: false, reason: '后端API权限不足' })
          } else {
            resolve({ valid: false, reason: `后端API错误: ${response.statusCode}` })
          }
        },
        fail: (error) => {
          resolve({ valid: false, reason: `后端API请求失败: ${error.errMsg}` })
        }
      })
    })
  }

  /**
   * 清除验证缓存
   */
  clearCache() {
    this.validationCache.clear()
  }

  /**
   * 获取验证统计
   */
  getValidationStats() {
    return {
      cacheSize: this.validationCache.size,
      cacheKeys: Array.from(this.validationCache.keys())
    }
  }
}

// 创建单例实例
const apiKeyValidator = new ApiKeyValidator()

module.exports = apiKeyValidator
