// pages/api-endpoint-debug/api-endpoint-debug.js - API端点调试工具
const apiConfig = require('../../utils/apiConfig')
const apiService = require('../../utils/apiService')
const aiService = require('../../utils/aiService')

Page({
  data: {
    testResult: '',
    isLoading: false,
    debugInfo: {
      baseURL: null,
      endpoints: null,
      testResults: {}
    }
  },

  onLoad() {
    console.log('API端点调试工具加载')
    this.checkAPIConfig()
  },

  // 检查API配置
  checkAPIConfig() {
    this.setData({ isLoading: true, testResult: '正在检查API配置...' })
    
    try {
      const baseURL = apiConfig.API_BASE_URL
      const endpoints = apiConfig.API_ENDPOINTS
      
      console.log('API配置:', { baseURL, endpoints })
      
      let resultText = `✅ API配置检查结果：\n\n`
      resultText += `基础URL: ${baseURL}\n`
      resultText += `端点数量: ${Object.keys(endpoints).length}\n\n`
      
      resultText += `AI相关端点：\n`
      const aiEndpoints = Object.keys(endpoints).filter(key => key.includes('AI'))
      aiEndpoints.forEach(key => {
        resultText += `${key}: ${baseURL}${endpoints[key]}\n`
      })
      
      resultText += `\n草稿相关端点：\n`
      const draftEndpoints = Object.keys(endpoints).filter(key => key.includes('DRAFT'))
      draftEndpoints.forEach(key => {
        resultText += `${key}: ${baseURL}${endpoints[key]}\n`
      })
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.baseURL': baseURL,
        'debugInfo.endpoints': endpoints
      })
      
    } catch (error) {
      console.error('API配置检查失败:', error)
      
      this.setData({
        testResult: `❌ API配置检查失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试AI生成标签端点
  async testAIGenerateTags() {
    this.setData({ isLoading: true, testResult: '正在测试AI生成标签端点...' })
    
    try {
      console.log('测试AI生成标签端点')
      
      const result = await new Promise((resolve) => {
        wx.request({
          url: `${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.AI_GENERATE_TAGS}`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
          },
          data: {
            content: '测试内容',
            category: 'knowledge'
          },
          timeout: 30000,
          success: (response) => {
            console.log('AI生成标签响应:', response)
            resolve({
              success: true,
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('AI生成标签请求失败:', error)
            resolve({
              success: false,
              error: error.errMsg || '请求失败'
            })
          }
        })
      })
      
      let resultText = `✅ AI生成标签端点测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `状态码: ${result.statusCode || '无'}\n`
      resultText += `URL: ${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.AI_GENERATE_TAGS}\n\n`
      
      if (result.success) {
        if (result.statusCode === 200) {
          resultText += `✅ 端点正常\n`
          resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n`
        } else if (result.statusCode === 404) {
          resultText += `❌ 端点不存在 (404)\n`
          resultText += `建议：检查后端是否实现了此端点\n`
        } else if (result.statusCode === 401) {
          resultText += `❌ 认证失败 (401)\n`
          resultText += `建议：检查用户登录状态和Token\n`
        } else if (result.statusCode === 500) {
          resultText += `❌ 服务器错误 (500)\n`
          resultText += `建议：检查后端服务器状态\n`
        } else {
          resultText += `⚠️ 其他状态码: ${result.statusCode}\n`
          resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n`
        }
      } else {
        resultText += `❌ 请求失败: ${result.error}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.testResults.aiGenerateTags': result
      })
      
    } catch (error) {
      console.error('AI生成标签端点测试失败:', error)
      
      this.setData({
        testResult: `❌ AI生成标签端点测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试AI测试生成标签端点
  async testAITestGenerateTags() {
    this.setData({ isLoading: true, testResult: '正在测试AI测试生成标签端点...' })
    
    try {
      console.log('测试AI测试生成标签端点')
      
      const result = await new Promise((resolve) => {
        wx.request({
          url: `${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.AI_TEST_GENERATE_TAGS}`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json'
          },
          data: {
            content: '测试内容',
            category: 'knowledge'
          },
          timeout: 30000,
          success: (response) => {
            console.log('AI测试生成标签响应:', response)
            resolve({
              success: true,
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('AI测试生成标签请求失败:', error)
            resolve({
              success: false,
              error: error.errMsg || '请求失败'
            })
          }
        })
      })
      
      let resultText = `✅ AI测试生成标签端点测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `状态码: ${result.statusCode || '无'}\n`
      resultText += `URL: ${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.AI_TEST_GENERATE_TAGS}\n\n`
      
      if (result.success) {
        if (result.statusCode === 200) {
          resultText += `✅ 端点正常\n`
          resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n`
        } else if (result.statusCode === 404) {
          resultText += `❌ 端点不存在 (404)\n`
          resultText += `建议：检查后端是否实现了此端点\n`
        } else if (result.statusCode === 500) {
          resultText += `❌ 服务器错误 (500)\n`
          resultText += `建议：检查后端服务器状态\n`
        } else {
          resultText += `⚠️ 其他状态码: ${result.statusCode}\n`
          resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n`
        }
      } else {
        resultText += `❌ 请求失败: ${result.error}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.testResults.aiTestGenerateTags': result
      })
      
    } catch (error) {
      console.error('AI测试生成标签端点测试失败:', error)
      
      this.setData({
        testResult: `❌ AI测试生成标签端点测试失败：\n\n${error.message}`,
        isLoading: false
      })
    }
  },

  // 测试草稿端点
  async testDraftEndpoint() {
    this.setData({ isLoading: true, testResult: '正在测试草稿端点...' })
    
    try {
      console.log('测试草稿端点')
      
      const result = await new Promise((resolve) => {
        wx.request({
          url: `${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.DRAFTS}`,
          method: 'GET',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${this.getToken()}`
          },
          timeout: 30000,
          success: (response) => {
            console.log('草稿端点响应:', response)
            resolve({
              success: true,
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('草稿端点请求失败:', error)
            resolve({
              success: false,
              error: error.errMsg || '请求失败'
            })
          }
        })
      })
      
      let resultText = `✅ 草稿端点测试结果：\n\n`
      resultText += `成功: ${result.success}\n`
      resultText += `状态码: ${result.statusCode || '无'}\n`
      resultText += `URL: ${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.DRAFTS}\n\n`
      
      if (result.success) {
        if (result.statusCode === 200) {
          resultText += `✅ 端点正常\n`
          resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n`
        } else if (result.statusCode === 404) {
          resultText += `❌ 端点不存在 (404)\n`
          resultText += `建议：检查后端是否实现了此端点\n`
        } else if (result.statusCode === 401) {
          resultText += `❌ 认证失败 (401)\n`
          resultText += `建议：检查用户登录状态和Token\n`
        } else if (result.statusCode === 500) {
          resultText += `❌ 服务器错误 (500)\n`
          resultText += `建议：检查后端服务器状态\n`
        } else {
          resultText += `⚠️ 其他状态码: ${result.statusCode}\n`
          resultText += `响应数据: ${JSON.stringify(result.data, null, 2)}\n`
        }
      } else {
        resultText += `❌ 请求失败: ${result.error}\n`
      }
      
      this.setData({
        testResult: resultText,
        isLoading: false,
        'debugInfo.testResults.draftEndpoint': result
      })
      
    } catch (error) {
      console.error('草稿端点测试失败:', error)
      
      this.setData({
        testResult: `❌ 草稿端点测试失败：\n\n${error.message}`,
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
        baseURL: this.data.debugInfo.baseURL,
        endpoints: this.data.debugInfo.endpoints,
        testResults: {}
      }
    })
  }
})
