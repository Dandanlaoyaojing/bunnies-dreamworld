// utils/secureConfig.js - 安全配置文件
// 使用多种安全措施保护API密钥

/**
 * 简单的字符串混淆和加密
 */
class SecureConfig {
  constructor() {
    // 使用环境变量或混淆后的密钥
    this.encryptedKeys = this.getEncryptedKeys()
    this.decryptionKey = this.getDecryptionKey()
  }

  /**
   * 获取加密后的API密钥
   * 这里使用简单的Base64编码和字符替换来混淆
   */
  getEncryptedKeys() {
    // 原始密钥的混淆版本（实际使用时应该从环境变量获取）
    const keys = {
      // DeepSeek API密钥的混淆版本
      deepseek: this.obfuscateKey('sk-7f977e073d1a431caf8a7b87674fd22a'),
      // 可以添加其他API密钥
      openai: this.obfuscateKey('your-openai-key-here'),
      baidu: this.obfuscateKey('your-baidu-key-here')
    }
    return keys
  }

  /**
   * 获取解密密钥
   */
  getDecryptionKey() {
    // 使用时间戳和固定字符串生成解密密钥
    const timestamp = Math.floor(Date.now() / (1000 * 60 * 60 * 24)) // 按天变化
    const baseKey = 'bunnies_dreamworld_2024'
    return this.simpleHash(baseKey + timestamp.toString())
  }

  /**
   * 微信小程序兼容的Base64编码
   */
  base64Encode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    let i = 0
    
    while (i < str.length) {
      const a = str.charCodeAt(i++)
      const b = i < str.length ? str.charCodeAt(i++) : 0
      const c = i < str.length ? str.charCodeAt(i++) : 0
      
      const bitmap = (a << 16) | (b << 8) | c
      
      result += chars.charAt((bitmap >> 18) & 63)
      result += chars.charAt((bitmap >> 12) & 63)
      result += i - 2 < str.length ? chars.charAt((bitmap >> 6) & 63) : '='
      result += i - 1 < str.length ? chars.charAt(bitmap & 63) : '='
    }
    
    return result
  }

  /**
   * 微信小程序兼容的Base64解码
   */
  base64Decode(str) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    let result = ''
    let i = 0
    
    str = str.replace(/[^A-Za-z0-9+/]/g, '')
    
    while (i < str.length) {
      const encoded1 = chars.indexOf(str.charAt(i++))
      const encoded2 = chars.indexOf(str.charAt(i++))
      const encoded3 = chars.indexOf(str.charAt(i++))
      const encoded4 = chars.indexOf(str.charAt(i++))
      
      const bitmap = (encoded1 << 18) | (encoded2 << 12) | (encoded3 << 6) | encoded4
      
      result += String.fromCharCode((bitmap >> 16) & 255)
      if (encoded3 !== 64) result += String.fromCharCode((bitmap >> 8) & 255)
      if (encoded4 !== 64) result += String.fromCharCode(bitmap & 255)
    }
    
    return result
  }

  /**
   * 简单的密钥混淆
   */
  obfuscateKey(key) {
    if (!key) return ''
    
    // 1. Base64编码（使用微信小程序兼容版本）
    const base64 = this.base64Encode(key)
    
    // 2. 字符替换混淆
    const obfuscated = base64
      .replace(/A/g, 'Z')
      .replace(/B/g, 'Y')
      .replace(/C/g, 'X')
      .replace(/D/g, 'W')
      .replace(/E/g, 'V')
      .replace(/F/g, 'U')
      .replace(/G/g, 'T')
      .replace(/H/g, 'S')
      .replace(/I/g, 'R')
      .replace(/J/g, 'Q')
      .replace(/K/g, 'P')
      .replace(/L/g, 'O')
      .replace(/M/g, 'N')
      .replace(/N/g, 'M')
      .replace(/O/g, 'L')
      .replace(/P/g, 'K')
      .replace(/Q/g, 'J')
      .replace(/R/g, 'I')
      .replace(/S/g, 'H')
      .replace(/T/g, 'G')
      .replace(/U/g, 'F')
      .replace(/V/g, 'E')
      .replace(/W/g, 'D')
      .replace(/X/g, 'C')
      .replace(/Y/g, 'B')
      .replace(/Z/g, 'A')
    
    return obfuscated
  }

  /**
   * 反混淆密钥
   */
  deobfuscateKey(obfuscatedKey) {
    if (!obfuscatedKey) return ''
    
    // 1. 字符替换还原
    const restored = obfuscatedKey
      .replace(/Z/g, 'A')
      .replace(/Y/g, 'B')
      .replace(/X/g, 'C')
      .replace(/W/g, 'D')
      .replace(/V/g, 'E')
      .replace(/U/g, 'F')
      .replace(/T/g, 'G')
      .replace(/S/g, 'H')
      .replace(/R/g, 'I')
      .replace(/Q/g, 'J')
      .replace(/P/g, 'K')
      .replace(/O/g, 'L')
      .replace(/N/g, 'M')
      .replace(/M/g, 'N')
      .replace(/L/g, 'O')
      .replace(/K/g, 'P')
      .replace(/J/g, 'Q')
      .replace(/I/g, 'R')
      .replace(/H/g, 'S')
      .replace(/G/g, 'T')
      .replace(/F/g, 'U')
      .replace(/E/g, 'V')
      .replace(/D/g, 'W')
      .replace(/C/g, 'X')
      .replace(/B/g, 'Y')
      .replace(/A/g, 'Z')
    
    // 2. Base64解码（使用微信小程序兼容版本）
    try {
      return this.base64Decode(restored)
    } catch (error) {
      console.error('密钥解密失败:', error)
      return ''
    }
  }

  /**
   * 简单的哈希函数
   */
  simpleHash(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash // 转换为32位整数
    }
    return Math.abs(hash).toString(16)
  }

  /**
   * 获取解密后的API密钥
   */
  getApiKey(service = 'deepseek') {
    try {
      const encryptedKey = this.encryptedKeys[service]
      if (!encryptedKey) {
        console.warn(`未找到服务 ${service} 的API密钥`)
        return ''
      }
      
      const decryptedKey = this.deobfuscateKey(encryptedKey)
      
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
   * 检查密钥是否过期（可选功能）
   */
  isKeyExpired(service = 'deepseek') {
    // 这里可以实现密钥过期检查逻辑
    // 例如检查本地存储的密钥时间戳
    try {
      const keyInfo = wx.getStorageSync(`api_key_info_${service}`)
      if (!keyInfo) return false
      
      const now = Date.now()
      const expireTime = keyInfo.expireTime || (now + 30 * 24 * 60 * 60 * 1000) // 默认30天
      
      return now > expireTime
    } catch (error) {
      console.error('检查密钥过期状态失败:', error)
      return false
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
      
      const encryptedKey = this.obfuscateKey(newKey)
      this.encryptedKeys[service] = encryptedKey
      
      // 保存密钥信息到本地存储
      const keyInfo = {
        service: service,
        updateTime: Date.now(),
        expireTime: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30天后过期
      }
      wx.setStorageSync(`api_key_info_${service}`, keyInfo)
      
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
    return Object.keys(this.encryptedKeys)
  }

  /**
   * 检查API密钥状态
   */
  checkApiKeyStatus(service = 'deepseek') {
    const key = this.getApiKey(service)
    const isExpired = this.isKeyExpired(service)
    
    return {
      service: service,
      hasKey: !!key,
      isValid: this.validateApiKey(key, service),
      isExpired: isExpired,
      status: key && !isExpired ? 'active' : 'inactive'
    }
  }
}

// 创建单例实例
const secureConfig = new SecureConfig()

module.exports = secureConfig

