// utils/compatibilityChecker.js - 微信小程序兼容性检查工具
class CompatibilityChecker {
  constructor() {
    this.checkResults = {}
  }

  /**
   * 检查微信开发者工具版本兼容性
   */
  checkDevToolsCompatibility() {
    const results = {
      isCompatible: true,
      issues: [],
      recommendations: []
    }

    try {
      // 检查基础库版本
      const systemInfo = wx.getSystemInfoSync()
      const SDKVersion = systemInfo.SDKVersion || 'unknown'
      
      console.log('📱 当前基础库版本:', SDKVersion)
      
      // 检查是否使用了新版本API
      const newAPIs = [
        'wx.cloud',
        'wx.createSelectorQuery',
        'wx.createIntersectionObserver',
        'wx.createMediaQueryObserver'
      ]

      for (const api of newAPIs) {
        if (typeof wx[api] === 'undefined') {
          results.issues.push(`API ${api} 不可用`)
        }
      }

      // 检查云开发支持
      if (typeof wx.cloud === 'undefined') {
        results.issues.push('云开发API不可用')
        results.recommendations.push('请更新基础库版本到2.2.3或以上')
      }

      // 检查ES6支持
      try {
        const testArrow = () => {}
        const testClass = class TestClass {}
        const testAsync = async () => {}
      } catch (e) {
        results.issues.push('ES6语法支持不完整')
        results.recommendations.push('请在开发者工具中启用ES6转ES5')
      }

      // 检查Promise支持
      if (typeof Promise === 'undefined') {
        results.issues.push('Promise API不可用')
        results.recommendations.push('请更新基础库版本')
      }

      results.isCompatible = results.issues.length === 0

    } catch (error) {
      results.issues.push(`兼容性检查失败: ${error.message}`)
      results.isCompatible = false
    }

    this.checkResults.devTools = results
    return results
  }

  /**
   * 检查网络环境
   */
  checkNetworkEnvironment() {
    const results = {
      isOnline: false,
      networkType: 'unknown',
      issues: [],
      recommendations: []
    }

    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          results.isOnline = res.networkType !== 'none'
          results.networkType = res.networkType
          
          if (!results.isOnline) {
            results.issues.push('网络未连接')
            results.recommendations.push('请检查网络连接')
          }
          
          resolve(results)
        },
        fail: () => {
          results.issues.push('无法获取网络状态')
          results.recommendations.push('请检查网络权限')
          resolve(results)
        }
      })
    })
  }

  /**
   * 检查存储权限
   */
  checkStoragePermissions() {
    const results = {
      hasStorage: true,
      issues: [],
      recommendations: []
    }

    try {
      // 测试写入存储
      wx.setStorageSync('test_key', 'test_value')
      const value = wx.getStorageSync('test_key')
      
      if (value !== 'test_value') {
        results.issues.push('存储读写异常')
        results.hasStorage = false
      }
      
      // 清理测试数据
      wx.removeStorageSync('test_key')
      
    } catch (error) {
      results.issues.push(`存储权限检查失败: ${error.message}`)
      results.hasStorage = false
      results.recommendations.push('请检查存储权限设置')
    }

    this.checkResults.storage = results
    return results
  }

  /**
   * 检查API服务可用性
   */
  async checkAPIService() {
    const results = {
      isAvailable: false,
      issues: [],
      recommendations: []
    }

    try {
      // 这里可以添加实际的API测试
      // 暂时模拟检查
      results.isAvailable = true
      
    } catch (error) {
      results.issues.push(`API服务检查失败: ${error.message}`)
      results.recommendations.push('请检查API服务配置')
    }

    this.checkResults.api = results
    return results
  }

  /**
   * 执行完整兼容性检查
   */
  async runFullCheck() {
    console.log('🔍 开始兼容性检查...')
    
    const devToolsResult = this.checkDevToolsCompatibility()
    const networkResult = await this.checkNetworkEnvironment()
    const storageResult = this.checkStoragePermissions()
    const apiResult = await this.checkAPIService()

    const summary = {
      overallCompatible: devToolsResult.isCompatible && 
                        networkResult.isOnline && 
                        storageResult.hasStorage && 
                        apiResult.isAvailable,
      results: {
        devTools: devToolsResult,
        network: networkResult,
        storage: storageResult,
        api: apiResult
      },
      recommendations: [
        ...devToolsResult.recommendations,
        ...networkResult.recommendations,
        ...storageResult.recommendations,
        ...apiResult.recommendations
      ]
    }

    console.log('📊 兼容性检查完成:', summary)
    return summary
  }

  /**
   * 生成兼容性报告
   */
  generateReport() {
    const report = {
      timestamp: new Date().toISOString(),
      summary: this.checkResults,
      suggestions: []
    }

    // 根据检查结果生成建议
    if (this.checkResults.devTools && !this.checkResults.devTools.isCompatible) {
      report.suggestions.push({
        type: 'critical',
        message: '开发者工具版本过旧，建议更新到最新版本',
        action: 'update_devtools'
      })
    }

    if (this.checkResults.network && !this.checkResults.network.isOnline) {
      report.suggestions.push({
        type: 'warning',
        message: '网络连接异常，可能影响云同步功能',
        action: 'check_network'
      })
    }

    return report
  }
}

// 创建单例实例
const compatibilityChecker = new CompatibilityChecker()

module.exports = compatibilityChecker
