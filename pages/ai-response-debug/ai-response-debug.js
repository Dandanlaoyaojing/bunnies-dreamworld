// pages/ai-response-debug/ai-response-debug.js
const aiService = require('../../utils/aiService.js')

Page({
  data: {
    testContent: '当前地方财政状况呈现双重困境：在国家强力干预下，地方政府不仅过度依赖中央拨款，甚至在政策制定等环节也严重依赖中央，导致中央与地方都背负巨额债务。这种中央集权体制早己暴露出矛盾，说它己濒临崩溃绝非夸大',
    testCategory: 'knowledge',
    categories: ['knowledge', 'art', 'cute', 'dreams', 'foods', 'happiness', 'sights', 'thinking'],
    categoryIndex: 0,
    responseData: null,
    errorMessage: '',
    isLoading: false
  },

  onLoad() {
    console.log('AI响应调试页面加载')
  },

  async testAIResponse() {
    this.setData({ isLoading: true, errorMessage: '', responseData: null })
    
    try {
      console.log('开始测试AI响应...')
      
      // 测试正式接口
      const result = await aiService.generateSmartTags(this.data.testContent, this.data.testCategory)
      
      console.log('AI响应测试结果:', result)
      
      this.setData({
        responseData: result,
        isLoading: false
      })
      
      if (result.success) {
        wx.showToast({
          title: '测试成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '测试失败',
          icon: 'error'
        })
      }
      
    } catch (error) {
      console.error('AI响应测试异常:', error)
      this.setData({
        errorMessage: error.message || '测试异常',
        isLoading: false
      })
      
      wx.showToast({
        title: '测试异常',
        icon: 'error'
      })
    }
  },

  async testTestAPI() {
    this.setData({ isLoading: true, errorMessage: '', responseData: null })
    
    try {
      console.log('开始测试测试接口...')
      
      // 测试测试接口
      const result = await aiService.generateTagsWithTestAPI(this.data.testContent, this.data.testCategory)
      
      console.log('测试接口响应结果:', result)
      
      this.setData({
        responseData: result,
        isLoading: false
      })
      
      if (result.success) {
        wx.showToast({
          title: '测试成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '测试失败',
          icon: 'error'
        })
      }
      
    } catch (error) {
      console.error('测试接口异常:', error)
      this.setData({
        errorMessage: error.message || '测试异常',
        isLoading: false
      })
      
      wx.showToast({
        title: '测试异常',
        icon: 'error'
      })
    }
  },

  async testDirectAPI() {
    this.setData({ isLoading: true, errorMessage: '', responseData: null })
    
    try {
      console.log('开始直接测试API...')
      
      // 直接调用sendRequest方法
      const result = await aiService.sendRequest({
        content: this.data.testContent,
        category: this.data.testCategory
      }, {
        endpoint: '/ai/generate-tags'
      })
      
      console.log('直接API调用结果:', result)
      
      this.setData({
        responseData: result,
        isLoading: false
      })
      
      if (result.success) {
        wx.showToast({
          title: '测试成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '测试失败',
          icon: 'error'
        })
      }
      
    } catch (error) {
      console.error('直接API调用异常:', error)
      this.setData({
        errorMessage: error.message || '测试异常',
        isLoading: false
      })
      
      wx.showToast({
        title: '测试异常',
        icon: 'error'
      })
    }
  },

  copyResponse() {
    if (this.data.responseData) {
      wx.setClipboardData({
        data: JSON.stringify(this.data.responseData, null, 2),
        success: () => {
          wx.showToast({
            title: '已复制到剪贴板',
            icon: 'success'
          })
        }
      })
    }
  },

  clearResponse() {
    this.setData({
      responseData: null,
      errorMessage: ''
    })
  },

  onTestContentInput(e) {
    this.setData({
      testContent: e.detail.value
    })
  },

  onCategoryChange(e) {
    this.setData({
      categoryIndex: e.detail.value,
      testCategory: this.data.categories[e.detail.value]
    })
  }
})
