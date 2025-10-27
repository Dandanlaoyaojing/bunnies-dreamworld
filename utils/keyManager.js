// utils/keyManager.js - API密钥管理服务
// 提供安全的密钥存储、轮换和验证功能

const secureConfig = require('./secureConfig.js')
const envConfig = require('./envConfig.js')

/**
 * API密钥管理器
 */
class KeyManager {
  constructor() {
    this.cache = new Map()
    this.lastUpdateTime = new Map()
    this.updateInterval = 24 * 60 * 60 * 1000 // 24小时更新一次
  }

  /**
   * 获取API密钥（带缓存和验证）
   */
  async getApiKey(service = 'deepseek', forceRefresh = false) {
    try {
      // 检查缓存
      if (!forceRefresh && this.isCacheValid(service)) {
        const cachedKey = this.cache.get(service)
        if (cachedKey && this.validateKey(cachedKey, service)) {
          return cachedKey
        }
      }

      // 从安全配置获取密钥
      let apiKey = secureConfig.getApiKey(service)
      
      // 如果安全配置中没有，尝试从环境配置获取
      if (!apiKey) {
        apiKey = envConfig.getApiKey(service)
      }

      // 验证密钥
      if (!this.validateKey(apiKey, service)) {
        console.warn(`服务 ${service} 的API密钥无效`)
        return this.getFallbackKey(service)
      }

      // 缓存密钥
      this.cache.set(service, apiKey)
      this.lastUpdateTime.set(service, Date.now())

      return apiKey
    } catch (error) {
      console.error(`获取 ${service} API密钥失败:`, error)
      return this.getFallbackKey(service)
    }
  }

  /**
   * 验证密钥格式
   */
  validateKey(key, service) {
    if (!key || typeof key !== 'string') return false
    
    switch (service) {
      case 'deepseek':
        return key.startsWith('sk-') && key.length >= 20
      case 'openai':
        return key.startsWith('sk-') && key.length >= 20
      case 'baidu':
        return key.length >= 10
      default:
        return key.length >= 5
    }
  }

  /**
   * 检查缓存是否有效
   */
  isCacheValid(service) {
    const lastUpdate = this.lastUpdateTime.get(service)
    if (!lastUpdate) return false
    
    return (Date.now() - lastUpdate) < this.updateInterval
  }

  /**
   * 获取备用密钥
   */
  getFallbackKey(service) {
    // 这里可以实现备用密钥逻辑
    // 例如从本地存储获取用户自定义密钥
    try {
      const userKey = wx.getStorageSync(`user_${service}_key`)
      if (userKey && this.validateKey(userKey, service)) {
        return userKey
      }
    } catch (error) {
      console.error('获取用户自定义密钥失败:', error)
    }
    
    return ''
  }

  /**
   * 更新API密钥
   */
  async updateApiKey(service, newKey) {
    try {
      if (!this.validateKey(newKey, service)) {
        throw new Error('API密钥格式无效')
      }

      // 更新安全配置
      const success = secureConfig.updateApiKey(service, newKey)
      if (!success) {
        throw new Error('更新安全配置失败')
      }

      // 更新缓存
      this.cache.set(service, newKey)
      this.lastUpdateTime.set(service, Date.now())

      // 保存到本地存储（用户自定义密钥）
      wx.setStorageSync(`user_${service}_key`, newKey)

      console.log(`✅ ${service} API密钥已更新`)
      return true
    } catch (error) {
      console.error(`更新 ${service} API密钥失败:`, error)
      return false
    }
  }

  /**
   * 清除密钥缓存
   */
  clearCache(service = null) {
    if (service) {
      this.cache.delete(service)
      this.lastUpdateTime.delete(service)
    } else {
      this.cache.clear()
      this.lastUpdateTime.clear()
    }
    console.log('密钥缓存已清除')
  }

  /**
   * 检查密钥状态
   */
  async checkKeyStatus(service = 'deepseek') {
    try {
      const key = await this.getApiKey(service)
      const status = secureConfig.checkApiKeyStatus(service)
      
      return {
        service: service,
        hasKey: !!key,
        isValid: this.validateKey(key, service),
        isExpired: status.isExpired,
        status: status.status,
        lastUpdate: this.lastUpdateTime.get(service),
        cacheValid: this.isCacheValid(service)
      }
    } catch (error) {
      console.error(`检查 ${service} 密钥状态失败:`, error)
      return {
        service: service,
        hasKey: false,
        isValid: false,
        isExpired: true,
        status: 'error',
        error: error.message
      }
    }
  }

  /**
   * 获取所有服务的密钥状态
   */
  async getAllKeyStatus() {
    const services = ['deepseek', 'openai', 'baidu']
    const statuses = []
    
    for (const service of services) {
      const status = await this.checkKeyStatus(service)
      statuses.push(status)
    }
    
    return statuses
  }

  /**
   * 自动轮换密钥（如果支持）
   */
  async rotateKey(service = 'deepseek') {
    try {
      // 这里可以实现自动密钥轮换逻辑
      // 例如从服务器获取新的密钥
      console.log(`开始轮换 ${service} 密钥...`)
      
      // 清除当前缓存
      this.clearCache(service)
      
      // 尝试获取新密钥
      const newKey = await this.getApiKey(service, true)
      
      if (newKey) {
        console.log(`✅ ${service} 密钥轮换成功`)
        return true
      } else {
        console.warn(`⚠️ ${service} 密钥轮换失败，使用当前密钥`)
        return false
      }
    } catch (error) {
      console.error(`轮换 ${service} 密钥失败:`, error)
      return false
    }
  }

  /**
   * 导出密钥信息（用于调试，生产环境应禁用）
   */
  exportKeyInfo() {
    if (envConfig.isProduction()) {
      console.warn('生产环境不允许导出密钥信息')
      return null
    }

    const info = {
      environment: envConfig.getEnvironmentInfo(),
      cache: Object.fromEntries(this.cache),
      lastUpdate: Object.fromEntries(this.lastUpdateTime),
      timestamp: Date.now()
    }
    
    return info
  }
}

// 创建单例实例
const keyManager = new KeyManager()

module.exports = keyManager

