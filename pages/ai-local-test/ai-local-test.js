// pages/ai-local-test/ai-local-test.js
const localAIService = require('../../utils/aiServiceLocal')

Page({
  data: {
    testResults: [],
    isLoading: false,
    testContent: '今天天气很好，我去公园散步，看到了很多美丽的花朵，心情非常愉快。'
  },

  onLoad() {
    console.log('本地AI服务测试页面加载')
  },

  // 运行所有测试
  async runAllTests() {
    this.setData({ isLoading: true })
    const results = []

    // 1. 测试智能标签生成
    results.push(await this.testGenerateTags())
    
    // 2. 测试分类建议
    results.push(await this.testSuggestCategory())
    
    // 3. 测试额外标签生成
    results.push(await this.testGenerateAdditionalTags())
    
    // 4. 测试服务状态检查
    results.push(this.testCheckStatus())

    this.setData({
      testResults: results,
      isLoading: false
    })

    this.showTestSummary(results)
  },

  // 测试智能标签生成
  async testGenerateTags() {
    try {
      const result = await localAIService.generateTags(this.data.testContent, 'thinking')
      
      return {
        id: 'generate_tags',
        name: '智能标签生成测试',
        status: result.success ? 'success' : 'error',
        details: {
          success: result.success,
          tagsCount: result.tags?.length || 0,
          tags: result.tags || [],
          source: result.source,
          error: result.error
        },
        message: result.success ? `成功生成${result.tags?.length || 0}个标签` : `生成失败: ${result.error}`,
        suggestions: result.success ? [] : ['检查内容格式', '确认服务配置']
      }
    } catch (error) {
      return {
        id: 'generate_tags',
        name: '智能标签生成测试',
        status: 'error',
        details: { error: error.message },
        message: '测试异常',
        suggestions: ['检查服务配置', '查看控制台错误']
      }
    }
  },

  // 测试分类建议
  async testSuggestCategory() {
    try {
      const result = await localAIService.suggestCategory(this.data.testContent)
      
      return {
        id: 'suggest_category',
        name: '分类建议测试',
        status: result.success ? 'success' : 'error',
        details: {
          success: result.success,
          category: result.category,
          confidence: result.confidence,
          source: result.source,
          error: result.error
        },
        message: result.success ? `建议分类: ${result.category} (置信度: ${result.confidence})` : `建议失败: ${result.error}`,
        suggestions: result.success ? [] : ['检查内容格式', '确认分类逻辑']
      }
    } catch (error) {
      return {
        id: 'suggest_category',
        name: '分类建议测试',
        status: 'error',
        details: { error: error.message },
        message: '测试异常',
        suggestions: ['检查服务配置', '查看控制台错误']
      }
    }
  },

  // 测试额外标签生成
  async testGenerateAdditionalTags() {
    try {
      const existingTags = ['天气', '公园']
      const result = await localAIService.generateAdditionalTags(this.data.testContent, 'thinking', existingTags)
      
      return {
        id: 'generate_additional_tags',
        name: '额外标签生成测试',
        status: result.success ? 'success' : 'error',
        details: {
          success: result.success,
          tagsCount: result.tags?.length || 0,
          tags: result.tags || [],
          existingTags: existingTags,
          source: result.source,
          error: result.error
        },
        message: result.success ? `生成${result.tags?.length || 0}个额外标签` : `生成失败: ${result.error}`,
        suggestions: result.success ? [] : ['检查现有标签', '确认内容格式']
      }
    } catch (error) {
      return {
        id: 'generate_additional_tags',
        name: '额外标签生成测试',
        status: 'error',
        details: { error: error.message },
        message: '测试异常',
        suggestions: ['检查服务配置', '查看控制台错误']
      }
    }
  },

  // 测试服务状态检查
  testCheckStatus() {
    try {
      const status = localAIService.checkApiStatus()
      
      return {
        id: 'check_status',
        name: '服务状态检查测试',
        status: 'success',
        details: {
          apiKey: status.apiKey,
          user: status.user,
          service: status.service
        },
        message: '本地AI服务状态正常',
        suggestions: []
      }
    } catch (error) {
      return {
        id: 'check_status',
        name: '服务状态检查测试',
        status: 'error',
        details: { error: error.message },
        message: '状态检查异常',
        suggestions: ['检查服务配置', '查看控制台错误']
      }
    }
  },

  // 显示测试摘要
  showTestSummary(results) {
    const successCount = results.filter(r => r.status === 'success').length
    const errorCount = results.filter(r => r.status === 'error').length
    
    const summary = `本地AI服务测试完成！\n\n✅ 成功: ${successCount}项\n❌ 失败: ${errorCount}项\n\n${errorCount === 0 ? '所有测试都通过！本地AI服务工作正常。' : '发现一些问题，建议查看详细结果。'}`
    
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
    this.runAllTests()
  },

  // 测试自定义内容
  testCustomContent() {
    wx.showModal({
      title: '测试自定义内容',
      content: '请输入要测试的内容：',
      editable: true,
      placeholderText: this.data.testContent,
      success: (res) => {
        if (res.confirm && res.content) {
          this.setData({
            testContent: res.content.trim()
          })
          this.runAllTests()
        }
      }
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  }
})
