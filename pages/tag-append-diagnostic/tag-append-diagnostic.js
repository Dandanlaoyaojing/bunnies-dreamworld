// pages/tag-append-diagnostic/tag-append-diagnostic.js
const aiService = require('../../utils/aiService.js')
const apiConfig = require('../../utils/apiConfig.js')
const authGuard = require('../../utils/authGuard.js')

Page({
  data: {
    testContent: '当前地方财政状况呈现双重困境：在国家强力干预下，地方政府不仅过度依赖中央拨款，甚至在政策制定等环节也严重依赖中央，导致中央与地方都背负巨额债务。这种中央集权体制早己暴露出矛盾，说它己濒临崩溃绝非夸大',
    testCategory: 'knowledge',
    existingTags: ['财政', '政府', '债务'],
    testResults: [],
    isLoading: false,
    currentTest: '',
    apiStatus: null
  },

  onLoad() {
    console.log('标签追加诊断页面加载')
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

  async testBasicTagGeneration() {
    this.addTestResult('开始测试基础标签生成...')
    this.setData({ isLoading: true, currentTest: '基础标签生成' })
    
    try {
      const result = await aiService.generateSmartTags(this.data.testContent, this.data.testCategory)
      
      this.addTestResult(`基础标签生成结果: ${JSON.stringify(result, null, 2)}`)
      
      if (result.success) {
        this.addTestResult(`✅ 基础标签生成成功，获得 ${result.tags.length} 个标签: ${result.tags.join(', ')}`)
      } else {
        this.addTestResult(`❌ 基础标签生成失败: ${result.error}`)
      }
      
    } catch (error) {
      this.addTestResult(`❌ 基础标签生成异常: ${error.message}`)
    } finally {
      this.setData({ isLoading: false, currentTest: '' })
    }
  },

  async testAdditionalTagGeneration() {
    this.addTestResult('开始测试追加标签生成...')
    this.setData({ isLoading: true, currentTest: '追加标签生成' })
    
    try {
      const result = await aiService.generateAdditionalTags(
        this.data.testContent, 
        this.data.testCategory, 
        this.data.existingTags
      )
      
      this.addTestResult(`追加标签生成结果: ${JSON.stringify(result, null, 2)}`)
      
      if (result.success) {
        this.addTestResult(`✅ 追加标签生成成功，获得 ${result.tags.length} 个新标签: ${result.tags.join(', ')}`)
        
        // 检查是否有重复标签
        const duplicates = result.tags.filter(tag => this.data.existingTags.includes(tag))
        if (duplicates.length > 0) {
          this.addTestResult(`⚠️ 发现重复标签: ${duplicates.join(', ')}`)
        }
      } else {
        this.addTestResult(`❌ 追加标签生成失败: ${result.error}`)
      }
      
    } catch (error) {
      this.addTestResult(`❌ 追加标签生成异常: ${error.message}`)
    } finally {
      this.setData({ isLoading: false, currentTest: '' })
    }
  },

  async testDirectAPI() {
    this.addTestResult('开始测试直接API调用...')
    this.setData({ isLoading: true, currentTest: '直接API调用' })
    
    try {
      const currentUser = authGuard.getCurrentUser()
      if (!currentUser || !currentUser.token) {
        this.addTestResult('❌ 用户未登录或Token无效')
        return
      }

      // 测试正式接口
      const formalResult = await aiService.sendRequest({
        content: this.data.testContent,
        category: this.data.testCategory,
        existingTags: this.data.existingTags,
        type: 'additional_tags'
      }, {
        endpoint: apiConfig.API_ENDPOINTS.AI_GENERATE_TAGS
      })

      this.addTestResult(`正式接口响应: ${JSON.stringify(formalResult, null, 2)}`)

      // 测试测试接口
      const testResult = await aiService.sendRequest({
        content: this.data.testContent,
        category: this.data.testCategory,
        existingTags: this.data.existingTags
      }, {
        endpoint: apiConfig.API_ENDPOINTS.AI_TEST_GENERATE_TAGS
      })

      this.addTestResult(`测试接口响应: ${JSON.stringify(testResult, null, 2)}`)
      
    } catch (error) {
      this.addTestResult(`❌ 直接API调用异常: ${error.message}`)
    } finally {
      this.setData({ isLoading: false, currentTest: '' })
    }
  },

  async testLocalFallback() {
    this.addTestResult('开始测试本地备用方案...')
    this.setData({ isLoading: true, currentTest: '本地备用方案' })
    
    try {
      const result = aiService.generateLocalTags(this.data.testContent, this.data.testCategory)
      
      this.addTestResult(`本地备用方案结果: ${JSON.stringify(result, null, 2)}`)
      
      if (result.success) {
        this.addTestResult(`✅ 本地备用方案成功，获得 ${result.tags.length} 个标签: ${result.tags.join(', ')}`)
      } else {
        this.addTestResult(`❌ 本地备用方案失败: ${result.error}`)
      }
      
    } catch (error) {
      this.addTestResult(`❌ 本地备用方案异常: ${error.message}`)
    } finally {
      this.setData({ isLoading: false, currentTest: '' })
    }
  },

  async runFullDiagnostic() {
    this.setData({ testResults: [], isLoading: true })
    this.addTestResult('=== 开始完整诊断 ===')
    
    try {
      // 1. 检查API状态
      this.addTestResult('1. 检查API状态...')
      const apiStatus = await aiService.checkAPIStatus()
      this.addTestResult(`API状态: ${JSON.stringify(apiStatus, null, 2)}`)
      
      // 2. 测试基础标签生成
      await this.testBasicTagGeneration()
      
      // 3. 测试追加标签生成
      await this.testAdditionalTagGeneration()
      
      // 4. 测试直接API调用
      await this.testDirectAPI()
      
      // 5. 测试本地备用方案
      await this.testLocalFallback()
      
      this.addTestResult('=== 诊断完成 ===')
      
    } catch (error) {
      this.addTestResult(`❌ 完整诊断异常: ${error.message}`)
    } finally {
      this.setData({ isLoading: false })
    }
  },

  addTestResult(message) {
    const timestamp = new Date().toLocaleTimeString()
    const result = {
      time: timestamp,
      message: message
    }
    
    this.setData({
      testResults: [...this.data.testResults, result]
    })
    
    console.log(`[${timestamp}] ${message}`)
  },

  clearResults() {
    this.setData({
      testResults: []
    })
  },

  copyResults() {
    const resultsText = this.data.testResults.map(r => `[${r.time}] ${r.message}`).join('\n')
    wx.setClipboardData({
      data: resultsText,
      success: () => {
        wx.showToast({
          title: '结果已复制',
          icon: 'success'
        })
      }
    })
  },

  onTestContentInput(e) {
    this.setData({
      testContent: e.detail.value
    })
  },

  onExistingTagsInput(e) {
    const tags = e.detail.value.split(',').map(tag => tag.trim()).filter(tag => tag)
    this.setData({
      existingTags: tags
    })
  }
})
