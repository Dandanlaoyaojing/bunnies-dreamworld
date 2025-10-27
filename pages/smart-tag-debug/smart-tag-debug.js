// pages/smart-tag-debug/smart-tag-debug.js - 智能标签调试工具
const aiService = require('../../utils/aiService')
const authGuard = require('../../utils/authGuard')

Page({
  data: {
    testResult: '',
    isLoading: false,
    testData: {
      content: '当前地方财政状况呈现双重困境：在国家强力干预下，地方政府不仅过度依赖中央拨款，甚至在政策制定等环节也严重依赖中央，导致中央与地方都背负巨额债务。这种中央集权体制早己暴露出矛盾，说它己濒临崩溃绝非夸大',
      category: 'knowledge'
    },
    debugInfo: {
      userStatus: null,
      apiResponse: null,
      testApiResponse: null,
      localResponse: null
    }
  },

  onLoad() {
    console.log('智能标签调试工具加载')
    this.checkUserStatus()
  },

  // 检查用户登录状态
  checkUserStatus() {
    const user = authGuard.getCurrentUser()
    this.setData({
      'debugInfo.userStatus': {
        isLoggedIn: !!user,
        username: user?.username || '未登录',
        hasToken: !!user?.token,
        tokenLength: user?.token?.length || 0
      }
    })
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

  // 测试主接口（需要认证）
  async testMainAPI() {
    this.setData({ isLoading: true, testResult: '正在测试主接口（需要认证）...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('测试主接口:', { content: content.substring(0, 50), category })
      
      const result = await aiService.generateSmartTags(content, category)
      
      console.log('主接口结果:', result)
      
      let resultText = `✅ 主接口测试结果：\n\n`
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
      } else {
        resultText += `❌ 主接口失败，可能的原因：\n`
        resultText += `• 用户未登录或Token无效\n`
        resultText += `• 后端API返回格式不正确\n`
        resultText += `• 网络请求失败\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.apiResponse': result
      })
      
    } catch (error) {
      console.error('主接口测试失败:', error)
      
      this.setData({
        testResult: `❌ 主接口测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试原始HTTP请求（主接口）
  async testRawMainAPI() {
    this.setData({ isLoading: true, testResult: '正在测试原始HTTP请求（主接口）...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('测试原始HTTP请求（主接口）:', { content: content.substring(0, 50), category })
      
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
            console.log('原始HTTP响应（主接口）:', response)
            resolve({
              success: true,
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('原始HTTP请求失败（主接口）:', error)
            resolve({
              success: false,
              error: error.errMsg || '请求失败'
            })
          }
        })
      })
      
      let resultText = `✅ 原始HTTP请求测试结果（主接口）：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `状态码: ${result.statusCode || '无'}\n`
      resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n\n`
      
      if (result.success && result.data) {
        if (result.data.success) {
          resultText += `✅ 后端响应成功\n`
          resultText += `消息: ${result.data.message || '无'}\n`
          
          if (result.data.data) {
            resultText += `数据字段: ${Object.keys(result.data.data).join(', ')}\n`
            
            // 检查可能的标签字段
            const possibleFields = ['tags', 'tagList', 'labels', 'keywords', 'suggestions', 'result', 'output']
            for (const field of possibleFields) {
              if (result.data.data[field]) {
                resultText += `找到字段 ${field}: ${JSON.stringify(result.data.data[field])}\n`
              }
            }
          }
        } else {
          resultText += `❌ 后端响应失败: ${result.data.message || '未知错误'}\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false
      })
      
    } catch (error) {
      console.error('原始HTTP请求测试失败（主接口）:', error)
      
      this.setData({
        testResult: `❌ 原始HTTP请求测试失败（主接口）：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试原始HTTP请求（测试接口）
  async testRawTestAPI() {
    this.setData({ isLoading: true, testResult: '正在测试原始HTTP请求（测试接口）...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('测试原始HTTP请求（测试接口）:', { content: content.substring(0, 50), category })
      
      const result = await new Promise((resolve) => {
        wx.request({
          url: 'http://10.10.12.20:3000/api/v1/ai/test-generate-tags',
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            content: content,
            category: category
          },
          timeout: 30000,
          success: (response) => {
            console.log('原始HTTP响应（测试接口）:', response)
            resolve({
              success: true,
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('原始HTTP请求失败（测试接口）:', error)
            resolve({
              success: false,
              error: error.errMsg || '请求失败'
            })
          }
        })
      })
      
      let resultText = `✅ 原始HTTP请求测试结果（测试接口）：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `状态码: ${result.statusCode || '无'}\n`
      resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n\n`
      
      if (result.success && result.data) {
        if (result.data.success) {
          resultText += `✅ 后端响应成功\n`
          resultText += `消息: ${result.data.message || '无'}\n`
          
          if (result.data.data) {
            resultText += `数据字段: ${Object.keys(result.data.data).join(', ')}\n`
            
            // 检查可能的标签字段
            const possibleFields = ['tags', 'tagList', 'labels', 'keywords', 'suggestions', 'result', 'output']
            for (const field of possibleFields) {
              if (result.data.data[field]) {
                resultText += `找到字段 ${field}: ${JSON.stringify(result.data.data[field])}\n`
              }
            }
          }
        } else {
          resultText += `❌ 后端响应失败: ${result.data.message || '未知错误'}\n`
        }
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.testApiResponse': result
      })
      
    } catch (error) {
      console.error('原始HTTP请求测试失败（测试接口）:', error)
      
      this.setData({
        testResult: `❌ 原始HTTP请求测试失败（测试接口）：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试本地备用方案
  async testLocalFallback() {
    this.setData({ isLoading: true, testResult: '正在测试本地备用方案...' })
    
    try {
      const { content, category } = this.data.testData
      
      console.log('测试本地备用方案:', { content: content.substring(0, 50), category })
      
      // 直接调用本地备用方案
      const result = aiService.generateLocalTags(content, category)
      
      console.log('本地备用方案结果:', result)
      
      let resultText = `✅ 本地备用方案测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `标签数量: ${result.tags ? result.tags.length : 0}\n`
      resultText += `标签内容: ${result.tags ? JSON.stringify(result.tags) : '无'}\n`
      resultText += `数据源: ${result.source || '未知'}\n\n`
      
      if (result.success && result.tags) {
        resultText += `生成的标签：\n`
        result.tags.forEach((tag, index) => {
          resultText += `${index + 1}. ${tag}\n`
        })
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.localResponse': result
      })
      
    } catch (error) {
      console.error('本地备用方案测试失败:', error)
      
      this.setData({
        testResult: `❌ 本地备用方案测试失败：\n\n${error.message}`,
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

  // 清空结果
  clearResult() {
    this.setData({ 
      testResult: '',
      debugInfo: {
        userStatus: this.data.debugInfo.userStatus,
        apiResponse: null,
        testApiResponse: null,
        localResponse: null
      }
    })
  }
})
