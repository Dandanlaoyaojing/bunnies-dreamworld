// utils/envConfig.js - 环境配置文件
// 管理不同环境的API配置

/**
 * 环境配置管理
 */
class EnvConfig {
  constructor() {
    this.currentEnv = this.detectEnvironment()
    this.configs = this.loadConfigs()
  }

  /**
   * 检测当前环境
   */
  detectEnvironment() {
    // 在微信小程序中，可以通过以下方式检测环境
    const accountInfo = wx.getAccountInfoSync()
    const envVersion = accountInfo.miniProgram.envVersion
    
    switch (envVersion) {
      case 'develop': // 开发版
        return 'development'
      case 'trial': // 体验版
        return 'staging'
      case 'release': // 正式版
        return 'production'
      default:
        return 'development'
    }
  }

  /**
   * 加载不同环境的配置
   */
  loadConfigs() {
    return {
      development: {
        // 开发环境配置
        apiKeys: {
          deepseek: 'sk-7f977e073d1a431caf8a7b87674fd22a', // 开发用密钥
          openai: 'sk-dev-openai-key-here',
          baidu: 'dev-baidu-key-here'
        },
        apiUrls: {
          deepseek: 'https://api.deepseek.com/v1/chat/completions',
          openai: 'https://api.openai.com/v1/chat/completions',
          baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro'
        },
        timeout: 15000,
        retryCount: 3,
        enableLogging: true,
        enableCache: true
      },
      
      staging: {
        // 测试环境配置
        apiKeys: {
          deepseek: 'sk-staging-deepseek-key-here',
          openai: 'sk-staging-openai-key-here',
          baidu: 'staging-baidu-key-here'
        },
        apiUrls: {
          deepseek: 'https://api.deepseek.com/v1/chat/completions',
          openai: 'https://api.openai.com/v1/chat/completions',
          baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro'
        },
        timeout: 20000,
        retryCount: 2,
        enableLogging: true,
        enableCache: true
      },
      
      production: {
        // 生产环境配置
        apiKeys: {
          deepseek: 'sk-prod-deepseek-key-here',
          openai: 'sk-prod-openai-key-here',
          baidu: 'prod-baidu-key-here'
        },
        apiUrls: {
          deepseek: 'https://api.deepseek.com/v1/chat/completions',
          openai: 'https://api.openai.com/v1/chat/completions',
          baidu: 'https://aip.baidubce.com/rpc/2.0/ai_custom/v1/wenxinworkshop/chat/completions_pro'
        },
        timeout: 30000,
        retryCount: 1,
        enableLogging: false,
        enableCache: true
      }
    }
  }

  /**
   * 获取当前环境配置
   */
  getCurrentConfig() {
    return this.configs[this.currentEnv] || this.configs.development
  }

  /**
   * 获取指定服务的API密钥
   */
  getApiKey(service = 'deepseek') {
    const config = this.getCurrentConfig()
    return config.apiKeys[service] || ''
  }

  /**
   * 获取指定服务的API URL
   */
  getApiUrl(service = 'deepseek') {
    const config = this.getCurrentConfig()
    return config.apiUrls[service] || ''
  }

  /**
   * 获取配置值
   */
  getConfig(key) {
    const config = this.getCurrentConfig()
    return config[key]
  }

  /**
   * 检查是否为生产环境
   */
  isProduction() {
    return this.currentEnv === 'production'
  }

  /**
   * 检查是否为开发环境
   */
  isDevelopment() {
    return this.currentEnv === 'development'
  }

  /**
   * 获取环境信息
   */
  getEnvironmentInfo() {
    return {
      current: this.currentEnv,
      available: Object.keys(this.configs),
      config: this.getCurrentConfig()
    }
  }
}

// 创建单例实例
const envConfig = new EnvConfig()

module.exports = envConfig

