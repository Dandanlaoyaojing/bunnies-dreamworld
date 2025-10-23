// AI智能标签测试页面
const aiService = require('../../utils/aiService.js')

Page({
  data: {
    testResults: [],
    loading: false,
    currentTest: null
  },

  onLoad() {
    console.log('AI智能标签测试页面加载')
  },

  /**
   * 测试智能标签生成（增强版）
   */
  async testSmartTags() {
    this.setData({ loading: true, currentTest: '智能标签生成' })
    
    try {
      const testContent = `今天去了美术馆，看到了很多美丽的油画作品。色彩搭配非常和谐，每一幅画都充满了艺术家的创意和灵感。特别喜欢那幅描绘夕阳的风景画，温暖的色调让人感到宁静和美好。`
      
      console.log('开始测试智能标签生成...')
      const result = await aiService.generateSmartTagsForNote('美术馆之旅', testContent, 'art')
      
      this.addTestResult('智能标签生成（优化版）', result, {
        content: testContent,
        category: 'art',
        expectedCount: '3-5个高质量标签',
        expectedFormat: '中文，每个不超过4个字，提取关键内容'
      })
      
    } catch (error) {
      this.addTestResult('智能标签生成', { success: false, error: error.message }, null)
    } finally {
      this.setData({ loading: false, currentTest: null })
    }
  },

  /**
   * 测试初始标签生成
   */
  async testInitialTags() {
    this.setData({ loading: true, currentTest: '初始标签生成' })
    
    try {
      const testContent = `这是一篇关于编程学习的笔记，主要介绍了JavaScript的基础语法和常用方法。`
      
      console.log('开始测试初始标签生成...')
      const result = await aiService.generateInitialTagsForOCR(testContent, 'knowledge')
      
      this.addTestResult('初始标签生成', result, {
        content: testContent,
        category: 'knowledge',
        expectedCount: '3-5个标签',
        expectedFormat: '中文，每个不超过4个字'
      })
      
    } catch (error) {
      this.addTestResult('初始标签生成', { success: false, error: error.message }, null)
    } finally {
      this.setData({ loading: false, currentTest: null })
    }
  },

  /**
   * 测试追加标签生成
   */
  async testAdditionalTags() {
    this.setData({ loading: true, currentTest: '追加标签生成' })
    
    try {
      const testContent = `今天天气很好，和朋友一起去公园散步。看到了很多可爱的小动物，心情特别愉快。`
      const existingTags = ['天气', '朋友', '公园']
      
      console.log('开始测试追加标签生成...')
      const result = await aiService.generateMoreTags(testContent, 'happiness', existingTags)
      
      this.addTestResult('追加标签生成', result, {
        content: testContent,
        category: 'happiness',
        existingTags: existingTags,
        expectedCount: '3个新标签',
        expectedFormat: '与已有标签不重复'
      })
      
    } catch (error) {
      this.addTestResult('追加标签生成', { success: false, error: error.message }, null)
    } finally {
      this.setData({ loading: false, currentTest: null })
    }
  },

  /**
   * 测试重试标签生成
   */
  async testRetryTags() {
    this.setData({ loading: true, currentTest: '重试标签生成' })
    
    try {
      const testContent = `这是一篇关于美食的笔记，记录了今天做的红烧肉。肉质鲜嫩，汤汁浓郁，家人都很喜欢。`
      const existingTags = ['美食', '红烧肉', '家庭']
      
      console.log('开始测试重试标签生成...')
      const result = await aiService.retryGenerateTags(testContent, 'foods', existingTags)
      
      this.addTestResult('重试标签生成', result, {
        content: testContent,
        category: 'foods',
        existingTags: existingTags,
        expectedCount: '3个新标签',
        expectedFormat: '更高创造性，与已有标签不重复'
      })
      
    } catch (error) {
      this.addTestResult('重试标签生成', { success: false, error: error.message }, null)
    } finally {
      this.setData({ loading: false, currentTest: null })
    }
  },

  /**
   * 测试分类上下文
   */
  async testCategoryContext() {
    this.setData({ loading: true, currentTest: '分类上下文测试' })
    
    try {
      const testCases = [
        { content: '今天画了一幅水彩画，色彩搭配很和谐', category: 'art' },
        { content: '看到一只可爱的小猫咪，毛茸茸的很治愈', category: 'cute' },
        { content: '昨晚做了一个奇怪的梦，梦见自己在天空中飞翔', category: 'dreams' },
        { content: '今天做了糖醋排骨，酸甜可口，家人都说好吃', category: 'foods' }
      ]
      
      const results = []
      for (const testCase of testCases) {
        const result = await aiService.generateSmartTagsForNote('测试', testCase.content, testCase.category)
        results.push({
          category: testCase.category,
          content: testCase.content,
          result: result
        })
      }
      
      this.addTestResult('分类上下文测试', { success: true, data: results }, {
        testCases: testCases.length,
        expectedBehavior: '不同分类应生成针对性标签'
      })
      
    } catch (error) {
      this.addTestResult('分类上下文测试', { success: false, error: error.message }, null)
    } finally {
      this.setData({ loading: false, currentTest: null })
    }
  },

  /**
   * 运行所有测试
   */
  async runAllTests() {
    this.setData({ testResults: [], loading: true })
    
    const tests = [
      () => this.testSmartTags(),
      () => this.testInitialTags(),
      () => this.testAdditionalTags(),
      () => this.testRetryTags(),
      () => this.testCategoryContext()
    ]
    
    for (const test of tests) {
      try {
        await test()
        // 添加延迟避免请求过于频繁
        await new Promise(resolve => setTimeout(resolve, 1000))
      } catch (error) {
        console.error('测试执行失败:', error)
      }
    }
    
    this.setData({ loading: false })
    wx.showToast({
      title: '所有测试完成',
      icon: 'success'
    })
  },

  /**
   * 添加测试结果
   */
  addTestResult(testName, result, testInfo) {
    const testResult = {
      name: testName,
      success: result.success,
      result: result,
      testInfo: testInfo,
      timestamp: new Date().toLocaleTimeString()
    }
    
    const newResults = [...this.data.testResults, testResult]
    this.setData({ testResults: newResults })
    
    console.log(`测试结果 [${testName}]:`, testResult)
  },

  /**
   * 清除测试结果
   */
  clearResults() {
    this.setData({ testResults: [] })
  },

  /**
   * 查看详细结果
   */
  viewDetail(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.testResults[index]
    
    wx.showModal({
      title: `测试详情 - ${result.name}`,
      content: JSON.stringify(result, null, 2),
      showCancel: false,
      confirmText: '确定'
    })
  },

  /**
   * 复制结果到剪贴板
   */
  copyResult(e) {
    const index = e.currentTarget.dataset.index
    const result = this.data.testResults[index]
    
    wx.setClipboardData({
      data: JSON.stringify(result, null, 2),
      success: () => {
        wx.showToast({
          title: '已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  }
})
