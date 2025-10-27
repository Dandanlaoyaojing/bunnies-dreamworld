// pages/secure-config-test/secure-config-test.js
const secureConfig = require('../../utils/secureConfigSimple')

Page({
  data: {
    testResults: [],
    isLoading: false
  },

  onLoad() {
    console.log('安全配置测试页面加载')
    this.runTests()
  },

  // 运行所有测试
  runTests() {
    this.setData({ isLoading: true })
    const results = []

    // 1. 测试API密钥获取
    results.push(this.testGetApiKey())
    
    // 2. 测试API密钥验证
    results.push(this.testValidateApiKey())
    
    // 3. 测试API密钥状态检查
    results.push(this.testCheckApiKeyStatus())
    
    // 4. 测试密钥更新
    results.push(this.testUpdateApiKey())
    
    // 5. 测试简单混淆/反混淆
    results.push(this.testSimpleObfuscation())

    this.setData({
      testResults: results,
      isLoading: false
    })

    this.showTestSummary(results)
  },

  // 测试API密钥获取
  testGetApiKey() {
    try {
      const key = secureConfig.getApiKey('deepseek')
      return {
        id: 'get_api_key',
        name: 'API密钥获取测试',
        status: key ? 'success' : 'error',
        details: {
          hasKey: !!key,
          keyLength: key ? key.length : 0,
          keyPreview: key ? key.substring(0, 10) + '...' : '无'
        },
        message: key ? 'API密钥获取成功' : 'API密钥获取失败',
        suggestions: key ? [] : ['检查API密钥配置', '确认密钥格式正确']
      }
    } catch (error) {
      return {
        id: 'get_api_key',
        name: 'API密钥获取测试',
        status: 'error',
        details: { error: error.message },
        message: 'API密钥获取异常',
        suggestions: ['检查secureConfig配置', '查看控制台错误']
      }
    }
  },

  // 测试API密钥验证
  testValidateApiKey() {
    try {
      const validKey = 'sk-1234567890abcdef1234567890abcdef'
      const invalidKey = 'invalid-key'
      
      const validResult = secureConfig.validateApiKey(validKey, 'deepseek')
      const invalidResult = secureConfig.validateApiKey(invalidKey, 'deepseek')
      
      return {
        id: 'validate_api_key',
        name: 'API密钥验证测试',
        status: validResult && !invalidResult ? 'success' : 'error',
        details: {
          validKeyTest: validResult,
          invalidKeyTest: invalidResult,
          testKey: validKey.substring(0, 10) + '...'
        },
        message: validResult && !invalidResult ? 'API密钥验证正常' : 'API密钥验证异常',
        suggestions: validResult && !invalidResult ? [] : ['检查验证逻辑', '确认密钥格式要求']
      }
    } catch (error) {
      return {
        id: 'validate_api_key',
        name: 'API密钥验证测试',
        status: 'error',
        details: { error: error.message },
        message: 'API密钥验证异常',
        suggestions: ['检查验证函数', '查看控制台错误']
      }
    }
  },

  // 测试API密钥状态检查
  testCheckApiKeyStatus() {
    try {
      const status = secureConfig.checkApiKeyStatus('deepseek')
      
      return {
        id: 'check_api_key_status',
        name: 'API密钥状态检查测试',
        status: status.hasKey ? 'success' : 'warning',
        details: {
          hasKey: status.hasKey,
          isValid: status.isValid,
          isExpired: status.isExpired,
          status: status.status
        },
        message: status.hasKey ? `API密钥状态: ${status.status}` : 'API密钥未配置',
        suggestions: status.hasKey ? [] : ['配置API密钥', '检查密钥格式']
      }
    } catch (error) {
      return {
        id: 'check_api_key_status',
        name: 'API密钥状态检查测试',
        status: 'error',
        details: { error: error.message },
        message: 'API密钥状态检查异常',
        suggestions: ['检查状态检查函数', '查看控制台错误']
      }
    }
  },

  // 测试密钥更新
  testUpdateApiKey() {
    try {
      const testKey = 'sk-test1234567890abcdef1234567890'
      const originalKey = secureConfig.getApiKey('deepseek')
      
      const updateResult = secureConfig.updateApiKey('deepseek', testKey)
      const newKey = secureConfig.getApiKey('deepseek')
      
      // 恢复原始密钥
      if (originalKey) {
        secureConfig.updateApiKey('deepseek', originalKey)
      }
      
      return {
        id: 'update_api_key',
        name: 'API密钥更新测试',
        status: updateResult && newKey === testKey ? 'success' : 'error',
        details: {
          updateSuccess: updateResult,
          keyMatch: newKey === testKey,
          testKey: testKey.substring(0, 10) + '...'
        },
        message: updateResult && newKey === testKey ? 'API密钥更新成功' : 'API密钥更新失败',
        suggestions: updateResult && newKey === testKey ? [] : ['检查更新函数', '确认密钥格式']
      }
    } catch (error) {
      return {
        id: 'update_api_key',
        name: 'API密钥更新测试',
        status: 'error',
        details: { error: error.message },
        message: 'API密钥更新异常',
        suggestions: ['检查更新函数', '查看控制台错误']
      }
    }
  },

  // 测试简单混淆/反混淆
  testSimpleObfuscation() {
    try {
      const originalText = 'sk-1234567890abcdef1234567890abcdef'
      const obfuscated = secureConfig.simpleObfuscate(originalText)
      const deobfuscated = secureConfig.simpleDeobfuscate(obfuscated)
      
      return {
        id: 'simple_obfuscation',
        name: '简单混淆/反混淆测试',
        status: deobfuscated === originalText ? 'success' : 'error',
        details: {
          original: originalText.substring(0, 10) + '...',
          obfuscated: obfuscated.substring(0, 10) + '...',
          deobfuscated: deobfuscated.substring(0, 10) + '...',
          match: deobfuscated === originalText
        },
        message: deobfuscated === originalText ? '混淆/反混淆正常' : '混淆/反混淆异常',
        suggestions: deobfuscated === originalText ? [] : ['检查混淆算法', '确认字符编码']
      }
    } catch (error) {
      return {
        id: 'simple_obfuscation',
        name: '简单混淆/反混淆测试',
        status: 'error',
        details: { error: error.message },
        message: '混淆/反混淆异常',
        suggestions: ['检查混淆函数', '查看控制台错误']
      }
    }
  },

  // 显示测试摘要
  showTestSummary(results) {
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    const warningCount = results.filter(r => r.status === 'warning').length
    
    const summary = `安全配置测试完成！\n\n✅ 成功: ${successCount}项\n⚠️ 警告: ${warningCount}项\n❌ 失败: ${errorCount}项\n\n${errorCount === 0 ? '所有测试都通过！安全配置工作正常。' : '发现一些问题，建议查看详细结果。'}`
    
    wx.showModal({
      title: '测试摘要',
      content: summary,
      showCancel: false,
      confirmText: '查看详情'
    })
  },

  // 查看详细结果
  viewDetails(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.testResults[index]
    
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

  // 重新运行测试
  rerunTests() {
    this.runTests()
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
