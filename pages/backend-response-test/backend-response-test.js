// pages/backend-response-test/backend-response-test.js
const apiConfig = require('../../utils/apiConfig.js')
const authGuard = require('../../utils/authGuard.js')

Page({
  data: {
    testContent: '当前地方财政状况呈现双重困境：在国家强力干预下，地方政府不仅过度依赖中央拨款，甚至在政策制定等环节也严重依赖中央，导致中央与地方都背负巨额债务。这种中央集权体制早己暴露出矛盾，说它己濒临崩溃绝非夸大',
    testCategory: 'knowledge',
    responseData: null,
    errorMessage: '',
    isLoading: false,
    apiStatus: null
  },

  onLoad() {
    console.log('后端响应测试页面加载')
    this.checkAPIStatus()
  },

  async checkAPIStatus() {
    try {
      const currentUser = authGuard.getCurrentUser()
      console.log('当前用户状态:', currentUser)
      
      this.setData({
        apiStatus: {
          user: currentUser ? {
            isLoggedIn: true,
            username: currentUser.username,
            hasToken: !!currentUser.token
          } : {
            isLoggedIn: false,
            hasToken: false
          },
          baseURL: apiConfig.API_BASE_URL,
          endpoints: apiConfig.API_ENDPOINTS
        }
      })
    } catch (error) {
      console.error('检查API状态失败:', error)
    }
  },

  async testGenerateTags() {
    this.setData({ isLoading: true, errorMessage: '', responseData: null })
    
    try {
      console.log('开始测试生成标签接口...')
      
      const currentUser = authGuard.getCurrentUser()
      if (!currentUser || !currentUser.token) {
        throw new Error('用户未登录或Token无效')
      }
      
      const url = `${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.AI_GENERATE_TAGS}`
      console.log('请求URL:', url)
      
      const result = await new Promise((resolve, reject) => {
        wx.request({
          url: url,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${currentUser.token}`,
            'X-App-Version': '1.0.0',
            'X-Client-Type': 'miniprogram'
          },
          data: {
            content: this.data.testContent,
            category: this.data.testCategory
          },
          timeout: 30000,
          success: (response) => {
            console.log('原始响应:', response)
            resolve({
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('请求失败:', error)
            reject(error)
          }
        })
      })
      
      console.log('处理后的响应:', result)
      
      this.setData({
        responseData: result,
        isLoading: false
      })
      
      if (result.statusCode === 200) {
        wx.showToast({
          title: '请求成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '请求失败',
          icon: 'error'
        })
      }
      
    } catch (error) {
      console.error('测试异常:', error)
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

  async testTestGenerateTags() {
    this.setData({ isLoading: true, errorMessage: '', responseData: null })
    
    try {
      console.log('开始测试测试接口...')
      
      const url = `${apiConfig.API_BASE_URL}${apiConfig.API_ENDPOINTS.AI_TEST_GENERATE_TAGS}`
      console.log('请求URL:', url)
      
      const result = await new Promise((resolve, reject) => {
        wx.request({
          url: url,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'X-App-Version': '1.0.0',
            'X-Client-Type': 'miniprogram'
          },
          data: {
            content: this.data.testContent,
            category: this.data.testCategory
          },
          timeout: 30000,
          success: (response) => {
            console.log('原始响应:', response)
            resolve({
              statusCode: response.statusCode,
              data: response.data,
              header: response.header
            })
          },
          fail: (error) => {
            console.error('请求失败:', error)
            reject(error)
          }
        })
      })
      
      console.log('处理后的响应:', result)
      
      this.setData({
        responseData: result,
        isLoading: false
      })
      
      if (result.statusCode === 200) {
        wx.showToast({
          title: '请求成功',
          icon: 'success'
        })
      } else {
        wx.showToast({
          title: '请求失败',
          icon: 'error'
        })
      }
      
    } catch (error) {
      console.error('测试异常:', error)
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
  }
})
