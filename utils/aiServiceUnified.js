// utils/aiServiceUnified.js - 统一AI服务模块
// 解决前后端AI调用冲突问题

const apiConfig = require('./apiConfig.js')
const secureConfig = require('./secureConfigSimple.js')
const authGuard = require('./authGuard.js')

class UnifiedAIService {
  constructor() {
    this.baseURL = apiConfig.API_BASE_URL
    this.endpoints = apiConfig.API_ENDPOINTS
    this.isBackendAvailable = false
    this.fallbackMode = false
  }

  /**
   * 检查后端服务可用性
   */
  async checkBackendAvailability() {
    try {
      const response = await this.pingBackend()
      this.isBackendAvailable = response.success
      console.log('后端服务状态:', this.isBackendAvailable ? '可用' : '不可用')
      return this.isBackendAvailable
    } catch (error) {
      console.warn('后端服务检查失败:', error)
      this.isBackendAvailable = false
      return false
    }
  }

  /**
   * 后端服务健康检查
   */
  async pingBackend() {
    return new Promise((resolve) => {
      wx.request({
        url: `${this.baseURL}/health`,
        method: 'GET',
        timeout: 5000,
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
  }

  /**
   * 获取统一的认证头信息
   */
  getUnifiedAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    }
    
    // 添加API密钥认证（统一格式）
    const apiKey = secureConfig.getApiKey('deepseek')
    if (apiKey) {
      // 使用标准的Bearer token格式
      headers['Authorization'] = `Bearer ${apiKey}`
      // 同时添加自定义头（兼容后端）
      headers['X-API-Key'] = apiKey
    }
    
    // 添加用户认证信息
    const currentUser = authGuard.getCurrentUser()
    if (currentUser && currentUser.userId) {
      headers['X-User-ID'] = currentUser.userId
      headers['X-Username'] = currentUser.username
    }
    
    // 添加请求标识
    headers['X-Request-ID'] = this.generateRequestId()
    headers['X-Client-Version'] = '1.0.0'
    headers['X-Client-Type'] = 'miniprogram'
    
    return headers
  }

  /**
   * 生成请求ID
   */
  generateRequestId() {
    return `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  /**
   * 统一请求方法
   */
  async sendUnifiedRequest(endpoint, data, options = {}) {
    // 首先检查后端可用性
    if (!this.isBackendAvailable) {
      await this.checkBackendAvailability()
    }

    // 如果后端不可用，直接使用本地方案
    if (!this.isBackendAvailable || this.fallbackMode) {
      console.log('后端不可用，使用本地AI方案')
      return this.useLocalAIService(data, options)
    }

    // 尝试后端请求
    try {
      const result = await this.sendBackendRequest(endpoint, data, options)
      if (result.success) {
        return result
      } else {
        // 后端失败，切换到本地方案
        console.log('后端请求失败，切换到本地方案:', result.error)
        this.fallbackMode = true
        return this.useLocalAIService(data, options)
      }
    } catch (error) {
      console.error('后端请求异常，切换到本地方案:', error)
      this.fallbackMode = true
      return this.useLocalAIService(data, options)
    }
  }

  /**
   * 发送后端请求
   */
  async sendBackendRequest(endpoint, data, options = {}) {
    return new Promise((resolve) => {
      const url = `${this.baseURL}${endpoint}`
      const requestData = {
        ...data,
        timestamp: Date.now(),
        requestId: this.generateRequestId()
      }

      console.log('发送后端AI请求:', { url, data: requestData })

      wx.request({
        url: url,
        method: 'POST',
        header: this.getUnifiedAuthHeaders(),
        data: requestData,
        timeout: 30000,
        success: (response) => {
          console.log('后端AI响应:', response)
          
          if (response.statusCode === 200) {
            resolve({
              success: true,
              data: response.data,
              source: 'backend'
            })
          } else if (response.statusCode === 401) {
            console.error('认证失败，API密钥可能无效')
            resolve({
              success: false,
              error: 'API认证失败，请检查密钥配置',
              code: 401,
              source: 'backend'
            })
          } else {
            resolve({
              success: false,
              error: response.data?.error?.message || `后端请求失败 (${response.statusCode})`,
              code: response.statusCode,
              source: 'backend'
            })
          }
        },
        fail: (error) => {
          console.error('后端请求失败:', error)
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败',
            code: 'NETWORK_ERROR',
            source: 'backend'
          })
        }
      })
    })
  }

  /**
   * 使用本地AI服务（备用方案）
   */
  useLocalAIService(data, options = {}) {
    console.log('使用本地AI服务:', data)
    
    // 根据请求类型调用不同的本地方法
    if (options.type === 'smart_tags' || options.type === 'initial_tags' || options.type === 'additional_tags') {
      return this.generateLocalTags(data.content, data.category)
    } else if (options.type === 'category_suggestion') {
      return this.suggestLocalCategory(data.content)
    } else if (options.type === 'ocr') {
      return this.performLocalOCR(data.imagePath)
    }
    
    // 默认返回标签生成
    return this.generateLocalTags(data.content, data.category)
  }

  /**
   * 智能标签生成（统一接口）
   */
  async generateSmartTags(content, category = '') {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    return await this.sendUnifiedRequest(
      this.endpoints.AI_GENERATE_TAGS,
      { content, category },
      { type: 'smart_tags' }
    )
  }

  /**
   * 生成初始标签
   */
  async generateInitialTags(content, category = '') {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    return await this.sendUnifiedRequest(
      this.endpoints.AI_GENERATE_TAGS,
      { content, category },
      { type: 'initial_tags' }
    )
  }

  /**
   * 生成额外标签
   */
  async generateAdditionalTags(content, category = '', existingTags = []) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    return await this.sendUnifiedRequest(
      this.endpoints.AI_GENERATE_TAGS,
      { content, category, existingTags },
      { type: 'additional_tags' }
    )
  }

  /**
   * 建议分类
   */
  async suggestCategory(content) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法建议分类'
      }
    }

    return await this.sendUnifiedRequest(
      this.endpoints.AI_SUGGEST_CATEGORY,
      { content },
      { type: 'category_suggestion' }
    )
  }

  /**
   * 图片转文字
   */
  async imageToText(imagePath) {
    return await this.sendUnifiedRequest(
      this.endpoints.AI_ANALYZE_CONTENT,
      { imagePath },
      { type: 'ocr' }
    )
  }

  /**
   * 生成标签（统一接口）
   */
  async generateTags(content, category = '') {
    return this.generateSmartTags(content, category)
  }

  // ========== 本地备用方案 ==========

  /**
   * 本地标签生成
   */
  generateLocalTags(content, category = '') {
    console.log('使用本地标签生成')
    
    const keywords = this.extractKeywords(content)
    const categoryTags = this.getDefaultTagsByCategory(category)
    
    const allTags = [...keywords, ...categoryTags]
    const uniqueTags = [...new Set(allTags)].slice(0, 5)
    
    return {
      success: true,
      tags: uniqueTags,
      source: 'local_fallback'
    }
  }

  /**
   * 本地分类建议
   */
  suggestLocalCategory(content) {
    if (content.includes('学习') || content.includes('知识')) return { success: true, category: 'knowledge', source: 'local' }
    if (content.includes('艺术') || content.includes('创作')) return { success: true, category: 'art', source: 'local' }
    if (content.includes('美食') || content.includes('料理')) return { success: true, category: 'foods', source: 'local' }
    if (content.includes('旅行') || content.includes('风景')) return { success: true, category: 'sights', source: 'local' }
    return { success: true, category: 'thinking', source: 'local' }
  }

  /**
   * 本地OCR（简单实现）
   */
  performLocalOCR(imagePath) {
    return {
      success: false,
      error: '本地OCR暂未实现，请使用百度云OCR',
      source: 'local'
    }
  }

  /**
   * 提取关键词
   */
  extractKeywords(content) {
    const words = content.match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) || []
    return words.filter(word => word.length >= 2 && word.length <= 6).slice(0, 3)
  }

  /**
   * 根据分类获取默认标签
   */
  getDefaultTagsByCategory(category) {
    const categoryTags = {
      'knowledge': ['学习', '知识', '笔记'],
      'art': ['艺术', '创作', '美学'],
      'cute': ['可爱', '萌宠', '温馨'],
      'dreams': ['梦想', '未来', '希望'],
      'foods': ['美食', '料理', '味道'],
      'happiness': ['快乐', '幸福', '美好'],
      'sights': ['风景', '旅行', '自然'],
      'thinking': ['思考', '感悟', '人生']
    }
    return categoryTags[category] || []
  }

  /**
   * 获取服务状态
   */
  getServiceStatus() {
    return {
      backendAvailable: this.isBackendAvailable,
      fallbackMode: this.fallbackMode,
      apiKeyStatus: secureConfig.checkApiKeyStatus('deepseek'),
      userStatus: authGuard.getCurrentUser()
    }
  }

  /**
   * 重置服务状态
   */
  resetServiceStatus() {
    this.fallbackMode = false
    this.isBackendAvailable = false
  }
}

// 创建单例实例
const unifiedAIService = new UnifiedAIService()

module.exports = unifiedAIService
