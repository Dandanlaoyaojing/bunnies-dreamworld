// pages/ai-response-inspector/ai-response-inspector.js
const aiService = require('../../utils/aiService.js')
const apiConfig = require('../../utils/apiConfig.js')
const authGuard = require('../../utils/authGuard.js')

Page({
  data: {
    testContent: '当前地方财政状况呈现双重困境：在国家强力干预下，地方政府不仅过度依赖中央拨款，甚至在政策制定等环节也严重依赖中央，导致中央与地方都背负巨额债务。这种中央集权体制早己暴露出矛盾，说它己濒临崩溃绝非夸大',
    testCategory: 'knowledge',
    rawResponse: null,
    processedResponse: null,
    errorMessage: '',
    isLoading: false
  },

  onLoad() {
    console.log('AI响应检查器页面加载')
  },

  async inspectResponse() {
    this.setData({ isLoading: true, errorMessage: '', rawResponse: null, processedResponse: null })
    
    try {
      console.log('开始检查AI响应...')
      
      // 直接调用sendRequest获取原始响应
      const rawResult = await aiService.sendRequest({
        content: this.data.testContent,
        category: this.data.testCategory
      }, {
        endpoint: apiConfig.API_ENDPOINTS.AI_GENERATE_TAGS
      })
      
      console.log('原始响应:', rawResult)
      
      // 调用generateSmartTags获取处理后的响应
      const processedResult = await aiService.generateSmartTags(this.data.testContent, this.data.testCategory)
      
      console.log('处理后的响应:', processedResult)
      
      this.setData({
        rawResponse: rawResult,
        processedResponse: processedResult,
        isLoading: false
      })
      
      wx.showToast({
        title: '检查完成',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('检查异常:', error)
      this.setData({
        errorMessage: error.message || '检查异常',
        isLoading: false
      })
      
      wx.showToast({
        title: '检查异常',
        icon: 'error'
      })
    }
  },

  async inspectTestResponse() {
    this.setData({ isLoading: true, errorMessage: '', rawResponse: null, processedResponse: null })
    
    try {
      console.log('开始检查测试接口响应...')
      
      // 直接调用sendRequest获取原始响应
      const rawResult = await aiService.sendRequest({
        content: this.data.testContent,
        category: this.data.testCategory
      }, {
        endpoint: apiConfig.API_ENDPOINTS.AI_TEST_GENERATE_TAGS
      })
      
      console.log('测试接口原始响应:', rawResult)
      
      // 调用generateTagsWithTestAPI获取处理后的响应
      const processedResult = await aiService.generateTagsWithTestAPI(this.data.testContent, this.data.testCategory)
      
      console.log('测试接口处理后的响应:', processedResult)
      
      this.setData({
        rawResponse: rawResult,
        processedResponse: processedResult,
        isLoading: false
      })
      
      wx.showToast({
        title: '检查完成',
        icon: 'success'
      })
      
    } catch (error) {
      console.error('检查异常:', error)
      this.setData({
        errorMessage: error.message || '检查异常',
        isLoading: false
      })
      
      wx.showToast({
        title: '检查异常',
        icon: 'error'
      })
    }
  },

  copyRawResponse() {
    if (this.data.rawResponse) {
      wx.setClipboardData({
        data: JSON.stringify(this.data.rawResponse, null, 2),
        success: () => {
          wx.showToast({
            title: '原始响应已复制',
            icon: 'success'
          })
        }
      })
    }
  },

  copyProcessedResponse() {
    if (this.data.processedResponse) {
      wx.setClipboardData({
        data: JSON.stringify(this.data.processedResponse, null, 2),
        success: () => {
          wx.showToast({
            title: '处理后响应已复制',
            icon: 'success'
          })
        }
      })
    }
  },

  clearResponses() {
    this.setData({
      rawResponse: null,
      processedResponse: null,
      errorMessage: ''
    })
  },

  onTestContentInput(e) {
    this.setData({
      testContent: e.detail.value
    })
  }
})
