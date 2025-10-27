// utils/secureConfigSimple.js - 简化的安全配置文件
// 专门为微信小程序环境优化，避免使用btoa/atob

/**
 * 简化的安全配置类
 * 使用简单的字符串混淆，避免复杂的Base64编码
 */
class SimpleSecureConfig {
  constructor() {
    this.apiKeys = this.getSimpleApiKeys()
  }

  /**
   * 获取简单的API密钥配置
   */
  getSimpleApiKeys() {
    // 直接存储API密钥，使用简单的字符替换混淆
    const keys = {
      // DeepSeek API密钥（简单混淆）
      deepseek: this.simpleObfuscate('sk-7f977e073d1a431caf8a7b87674fd22a'),
      // 可以添加其他API密钥
      openai: this.simpleObfuscate('your-openai-key-here'),
      baidu: this.simpleObfuscate('your-baidu-key-here')
    }
    return keys
  }

  /**
   * 简单的字符串混淆（不使用Base64）
   */
  simpleObfuscate(str) {
    if (!str) return ''
    
    // 使用简单的字符替换和位移
    let obfuscated = ''
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      // 简单的字符位移和替换
      obfuscated += String.fromCharCode(char + 1)
    }
    
    return obfuscated
  }

  /**
   * 简单的字符串反混淆
   */
  simpleDeobfuscate(obfuscatedStr) {
    if (!obfuscatedStr) return ''
    
    let original = ''
    for (let i = 0; i < obfuscatedStr.length; i++) {
      const char = obfuscatedStr.charCodeAt(i)
      // 还原字符位移
      original += String.fromCharCode(char - 1)
    }
    
    return original
  }

  /**
   * 获取解密后的API密钥
   */
  getApiKey(service = 'deepseek') {
    try {
      const obfuscatedKey = this.apiKeys[service]
      if (!obfuscatedKey) {
        console.warn(`未找到服务 ${service} 的API密钥`)
        return ''
      }
      
      const decryptedKey = this.simpleDeobfuscate(obfuscatedKey)
      
      // 验证密钥格式
      if (this.validateApiKey(decryptedKey, service)) {
        return decryptedKey
      } else {
        console.error(`服务 ${service} 的API密钥格式无效`)
        return ''
      }
    } catch (error) {
      console.error('获取API密钥失败:', error)
      return ''
    }
  }

  /**
   * 验证API密钥格式
   */
  validateApiKey(key, service) {
    if (!key || typeof key !== 'string') return false
    
    switch (service) {
      case 'deepseek':
        return key.startsWith('sk-') && key.length > 20
      case 'openai':
        return key.startsWith('sk-') && key.length > 20
      case 'baidu':
        return key.length > 10
      default:
        return key.length > 5
    }
  }

  /**
   * 检查API密钥状态
   */
  checkApiKeyStatus(service = 'deepseek') {
    const key = this.getApiKey(service)
    
    return {
      service: service,
      hasKey: !!key,
      isValid: this.validateApiKey(key, service),
      isExpired: false, // 简化版本不检查过期
      status: key && this.validateApiKey(key, service) ? 'active' : 'inactive'
    }
  }

  /**
   * 更新API密钥
   */
  updateApiKey(service, newKey) {
    try {
      if (!this.validateApiKey(newKey, service)) {
        throw new Error('API密钥格式无效')
      }
      
      const obfuscatedKey = this.simpleObfuscate(newKey)
      this.apiKeys[service] = obfuscatedKey
      
      console.log(`✅ ${service} API密钥已更新`)
      return true
    } catch (error) {
      console.error('更新API密钥失败:', error)
      return false
    }
  }

  /**
   * 获取所有可用的API服务
   */
  getAvailableServices() {
    return Object.keys(this.apiKeys)
  }
}

// 创建单例实例
const simpleSecureConfig = new SimpleSecureConfig()

module.exports = simpleSecureConfig
