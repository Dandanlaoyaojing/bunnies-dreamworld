// pages/ai-tag-debug/ai-tag-debug.js - 智能标签调试工具
const aiService = require('../../utils/aiService')
const apiService = require('../../utils/apiService')

Page({
  data: {
    testResult: '',
    isLoading: false,
    testData: {
      content: '今天学习了人工智能的基础知识，包括机器学习、深度学习和自然语言处理。这些技术正在改变我们的生活方式。',
      category: 'knowledge'
    },
    apiResponse: null,
    processedResult: null
  },

  onLoad() {
    console.log('智能标签调试工具加载')
  },

  // 更新测试数据
  onContentInput(e) {
    this.setData({
      'testData.content': e.detail.value
    })
  },

  onCategoryChange(e) {
    this.setData({
      'testData.category': e.detail.value
    })
  },

  // 测试AI服务标签生成
  async testAIServiceTags() {
    this.setData({ isLoading: true, testResult: '正在测试AI服务标签生成...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('测试AI服务:', { content: content.substring(0, 50), category })
      
      const result = await aiService.generateTags(content, category)
      
      console.log('AI服务结果:', result)
      
      let resultText = `✅ AI服务标签生成测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `标签数量: ${result.tags ? result.tags.length : 0}\n`
      resultText += `标签内容: ${result.tags ? JSON.stringify(result.tags) : '无'}\n`
      resultText += `数据源: ${result.source || '未知'}\n`
      resultText += `错误信息: ${result.error || '无'}\n\n`
      
      if (result.success && result.tags) {
        resultText += `生成的标签：\n`
        result.tags.forEach((tag, index) => {
          resultText += `${index + 1}. ${tag}\n`
        })
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        processedResult: result
      })
      
    } catch (error) {
      console.error('AI服务测试失败:', error)
      
      this.setData({
        testResult: `❌ AI服务测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试后端API直接调用
  async testBackendAPI() {
    this.setData({ isLoading: true, testResult: '正在测试后端API直接调用...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('测试后端API:', { content: content.substring(0, 50), category })
      
      const result = await apiService.generateTags(content, category)
      
      console.log('后端API结果:', result)
      
      let resultText = `✅ 后端API直接调用测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `消息: ${result.message || '无'}\n`
      resultText += `数据: ${JSON.stringify(result.data, null, 2)}\n\n`
      
      if (result.success && result.data) {
        if (result.data.tags) {
          resultText += `生成的标签：\n`
          result.data.tags.forEach((tag, index) => {
            resultText += `${index + 1}. ${tag}\n`
          })
        } else {
          resultText += `⚠️ 注意：响应中没有tags字段\n`
          resultText += `可用字段: ${Object.keys(result.data).join(', ')}\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        apiResponse: result
      })
      
    } catch (error) {
      console.error('后端API测试失败:', error)
      
      let errorText = `❌ 后端API测试失败：\n\n`
      errorText += `错误代码: ${error.code || 'UNKNOWN'}\n`
      errorText += `错误消息: ${error.message || '未知错误'}\n`
      
      if (error.code === 'UNAUTHORIZED') {
        errorText += `\n🔍 分析：认证失败\n`
        errorText += `建议：检查用户是否已登录\n`
      } else if (error.code === 'NETWORK_ERROR') {
        errorText += `\n🔍 分析：网络连接失败\n`
        errorText += `建议：检查后端服务器是否启动\n`
      }
      
      this.setData({
        testResult: errorText,
        isLoading: false
      })
    }
  },

  // 测试原始HTTP请求
  async testRawHTTPRequest() {
    this.setData({ isLoading: true, testResult: '正在测试原始HTTP请求...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('测试原始HTTP请求:', { content: content.substring(0, 50), category })
      
      const result = await new Promise((resolve) => {
        wx.request({
          url: 'http://10.10.12.20:3000/api/v1/ai/generate-tags',
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
          },
          data: {
            content: content,
            category: category
          },
          timeout: 30000,
          success: (response) => {
            console.log('原始HTTP响应:', response)
            resolve({
              success: true,
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('原始HTTP请求失败:', error)
            resolve({
              success: false,
              error: error.errMsg || '请求失败'
            })
          }
        })
      })
      
      let resultText = `✅ 原始HTTP请求测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `状态码: ${result.statusCode || '无'}\n`
      resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n\n`
      
      if (result.success && result.data) {
        if (result.data.tags) {
          resultText += `生成的标签：\n`
          result.data.tags.forEach((tag, index) => {
            resultText += `${index + 1}. ${tag}\n`
          })
        } else {
          resultText += `⚠️ 注意：响应中没有tags字段\n`
          resultText += `可用字段: ${Object.keys(result.data).join(', ')}\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('原始HTTP请求测试失败:', error)
      
      this.setData({
        testResult: `❌ 原始HTTP请求测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 获取用户Token
  getToken() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      return userInfo?.token || ''
    } catch (error) {
      console.error('获取Token失败:', error)
      return ''
    }
  },

  // 模拟笔记编辑器标签生成
  async simulateNoteEditorTags() {
    this.setData({ isLoading: true, testResult: '正在模拟笔记编辑器标签生成...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('模拟笔记编辑器:', { content: content.substring(0, 50), category })
      
      // 模拟笔记编辑器的逻辑
      const textForTags = content
      const result = await aiService.generateTags(textForTags, category)
      
      let resultText = `✅ 笔记编辑器模拟测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `标签数量: ${result.tags ? result.tags.length : 0}\n`
      resultText += `标签内容: ${result.tags ? JSON.stringify(result.tags) : '无'}\n`
      resultText += `数据源: ${result.source || '未知'}\n\n`
      
      if (result.success && result.tags && result.tags.length > 0) {
        resultText += `模拟页面更新：\n`
        resultText += `this.setData({\n`
        resultText += `  tags: ${JSON.stringify(result.tags)},\n`
        resultText += `  isSynced: false\n`
        resultText += `})\n\n`
        
        resultText += `生成的标签：\n`
        result.tags.forEach((tag, index) => {
          resultText += `${index + 1}. ${tag}\n`
        })
      } else {
        resultText += `❌ 没有生成标签，可能的原因：\n`
        resultText += `• 后端API返回格式不正确\n`
        resultText += `• 标签数据为空\n`
        resultText += `• 网络请求失败\n`
        resultText += `• 认证失败\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('笔记编辑器模拟测试失败:', error)
      
      this.setData({
        testResult: `❌ 笔记编辑器模拟测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 清空结果
  clearResult() {
    this.setData({ 
      testResult: '',
      apiResponse: null,
      processedResult: null
    })
  }
})
