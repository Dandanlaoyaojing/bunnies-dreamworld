// utils/aiService.js - AI服务模块（通过后端API）
const apiConfig = require('./apiConfig.js')
const secureConfig = require('./secureConfigSimple.js')
const authGuard = require('./authGuard.js')

// 导入百度云OCR配置
let baiduOCRConfig = null
try {
  baiduOCRConfig = require('./baiduOCRConfig.js')
} catch (error) {
  console.warn('百度云OCR配置文件未找到，将使用默认配置')
}

class AIService {
  constructor() {
    this.baseURL = apiConfig.API_BASE_URL
    this.endpoints = apiConfig.API_ENDPOINTS
  }

  /**
   * 获取认证头信息
   */
  getAuthHeaders() {
    const headers = {
      'Content-Type': 'application/json'
    }
    
    // 添加用户认证Token（如果已登录）
    const currentUser = authGuard.getCurrentUser()
    if (currentUser && currentUser.token) {
      headers['Authorization'] = `Bearer ${currentUser.token}`
    }
    
    // 添加应用标识
    headers['X-App-Version'] = '1.0.0'
    headers['X-Client-Type'] = 'miniprogram'
    
    return headers
  }

  /**
   * 发送请求到后端AI API
   */
  async sendRequest(data, options = {}) {
    return new Promise((resolve) => {
      console.log('发送后端AI请求:', { data, options })
      
      const endpoint = options.endpoint || this.endpoints.AI_GENERATE_TAGS
      const url = `${this.baseURL}${endpoint}`
      
      wx.request({
        url: url,
        method: 'POST',
        header: this.getAuthHeaders(),
        data: data,
        timeout: 30000,
        success: (response) => {
          console.log('后端AI响应:', response)
          if (response.statusCode === 200) {
            resolve({
              success: true,
              data: response.data
            })
          } else if (response.statusCode === 401) {
            console.warn('后端API认证失败，将使用本地方案')
            resolve({
              success: false,
              error: 'API认证失败，使用本地方案',
              code: response.statusCode,
              useLocal: true
            })
          } else {
            console.error('后端AI请求失败:', response)
            resolve({
              success: false,
              error: response.data?.error?.message || `后端AI请求失败 (${response.statusCode})`,
              code: response.statusCode
            })
          }
        },
        fail: (error) => {
          console.error('网络请求失败:', error)
          resolve({
            success: false,
            error: error.errMsg || '网络请求失败',
            code: 'NETWORK_ERROR'
          })
        }
      })
    })
  }

  /**
   * 检查API服务状态
   */
  checkApiStatus() {
    const currentUser = authGuard.getCurrentUser()
    
    return {
      user: currentUser ? {
        isLoggedIn: true,
        username: currentUser.username,
        userId: currentUser.userId,
        hasToken: !!currentUser.token
      } : {
        isLoggedIn: false,
        hasToken: false
      },
      service: {
        baseURL: this.baseURL,
        endpoints: this.endpoints
      }
    }
  }

  /**
   * 检查API状态（异步版本，用于测试后端连接）
   */
  async checkAPIStatus() {
    try {
      console.log('检查API状态...')
      
      const currentUser = authGuard.getCurrentUser()
      if (!currentUser || !currentUser.token) {
        return {
          success: false,
          error: '用户未登录',
          code: 'UNAUTHORIZED'
        }
      }

      // 尝试调用一个简单的API来检查状态
      const result = await this.sendRequest({
        content: '测试',
        category: 'test'
      }, {
        endpoint: this.endpoints.AI_TEST_GENERATE_TAGS
      })

      if (result.success) {
        return {
          success: true,
          message: 'API状态正常',
          user: {
            isLoggedIn: true,
            username: currentUser.username,
            hasToken: true
          },
          service: {
            baseURL: this.baseURL,
            endpoints: this.endpoints
          }
        }
      } else {
        return {
          success: false,
          error: result.error || 'API响应异常',
          code: result.code || 'API_ERROR'
        }
      }
    } catch (error) {
      console.error('API状态检查失败:', error)
      return {
        success: false,
        error: error.message || 'API连接失败',
        code: 'NETWORK_ERROR'
      }
    }
  }

  /**
   * 智能标签生成（通过后端API）
   */
  async generateSmartTags(content, category = '') {
    // 更宽松的内容验证，允许基于分类生成标签
    if (!content || content.trim().length === 0) {
      // 如果完全没有内容，但选择了分类，可以基于分类生成标签
      if (category) {
        console.log('内容为空，基于分类生成标签:', category)
        return this.generateTagsByCategory(category)
      }
      return {
        success: false,
        error: '请先输入笔记内容或选择分类'
      }
    }

    // 检查用户登录状态
    const currentUser = authGuard.getCurrentUser()
    if (!currentUser || !currentUser.token) {
      console.warn('用户未登录或Token无效，尝试使用测试接口')
      return this.generateTagsWithTestAPI(content, category)
    }

    try {
      // 使用后端API生成标签
      const result = await this.sendRequest({
        content: content,
        category: category
      }, {
        endpoint: this.endpoints.AI_GENERATE_TAGS
      })

      console.log('后端API响应处理:', {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        hasTags: result.data && result.data.tags,
        tagsValue: result.data && result.data.tags,
        fullData: result.data  // 添加完整数据查看
      })

      if (result.success && result.data && result.data.tags) {
        console.log('✅ 后端API标签生成成功:', result.data.tags)
        return {
          success: true,
          tags: result.data.tags,
          source: 'backend_api'
        }
      } else if (result.success && result.data) {
        // 后端成功但数据格式不匹配，尝试其他可能的字段名
        console.log('⚠️ 后端API成功但tags字段缺失，尝试其他字段:', result.data)
        
        // 尝试不同的可能字段名
        const possibleTagFields = ['tags', 'tagList', 'labels', 'keywords', 'suggestions']
        for (const field of possibleTagFields) {
          if (result.data[field] && Array.isArray(result.data[field])) {
            console.log(`✅ 找到标签字段 ${field}:`, result.data[field])
            return {
              success: true,
              tags: result.data[field],
              source: 'backend_api',
              fieldUsed: field
            }
          }
        }
        
        // 如果都没有找到，返回错误信息
        console.error('❌ 后端API响应中没有找到标签字段')
        return {
          success: false,
          error: '后端API响应格式不正确，缺少标签数据',
          debugInfo: {
            availableFields: Object.keys(result.data),
            responseData: result.data
          }
        }
      } else if (result.useLocal) {
        // 401认证失败时自动使用测试接口
        console.log('后端API认证失败，尝试使用测试接口')
        return this.generateTagsWithTestAPI(content, category)
      } else {
        // 其他错误时使用测试接口
        console.log('后端API失败，尝试使用测试接口')
        return this.generateTagsWithTestAPI(content, category)
      }
    } catch (error) {
      console.error('智能标签生成失败:', error)
      // 使用测试接口
      return this.generateTagsWithTestAPI(content, category)
    }
  }

  /**
   * 使用测试接口生成标签（不需要认证）
   */
  async generateTagsWithTestAPI(content, category = '') {
    try {
      console.log('尝试使用测试接口生成标签')
      
      const result = await this.sendRequest({
        content: content,
        category: category
      }, {
        endpoint: this.endpoints.AI_TEST_GENERATE_TAGS
      })

      console.log('测试接口响应处理:', {
        success: result.success,
        hasData: !!result.data,
        dataKeys: result.data ? Object.keys(result.data) : [],
        hasTags: result.data && result.data.tags,
        tagsValue: result.data && result.data.tags,
        fullData: result.data  // 添加完整数据查看
      })

      if (result.success && result.data && result.data.tags) {
        console.log('✅ 测试接口标签生成成功:', result.data.tags)
        return {
          success: true,
          tags: result.data.tags,
          source: 'test_api'
        }
      } else if (result.success && result.data) {
        // 测试接口成功但数据格式不匹配
        console.log('⚠️ 测试接口成功但tags字段缺失，尝试其他字段:', result.data)
        
        // 尝试不同的可能字段名
        const possibleTagFields = ['tags', 'tagList', 'labels', 'keywords', 'suggestions']
        for (const field of possibleTagFields) {
          if (result.data[field] && Array.isArray(result.data[field])) {
            console.log(`✅ 找到标签字段 ${field}:`, result.data[field])
            return {
              success: true,
              tags: result.data[field],
              source: 'test_api',
              fieldUsed: field
            }
          }
        }
        
        console.log('测试接口失败，使用本地备用方案')
        return this.generateLocalTags(content, category)
      } else {
        // 测试接口也失败时使用本地备用方案
        console.log('测试接口失败，使用本地备用方案')
        return this.generateLocalTags(content, category)
      }
    } catch (error) {
      console.error('测试接口调用失败:', error)
      // 使用本地备用方案
      return this.generateLocalTags(content, category)
    }
  }

  /**
   * 生成初始标签（通过后端API）
   */
  async generateInitialTags(content, category = '') {
    // 更宽松的内容验证，允许基于分类生成标签
    if (!content || content.trim().length === 0) {
      if (category) {
        console.log('内容为空，基于分类生成初始标签:', category)
        return this.generateTagsByCategory(category)
      }
      return {
        success: false,
        error: '请先输入笔记内容或选择分类'
      }
    }

    // 检查用户登录状态
    const currentUser = authGuard.getCurrentUser()
    if (!currentUser || !currentUser.token) {
      console.warn('用户未登录或Token无效，使用本地备用方案')
      return this.generateLocalTags(content, category)
    }

    try {
      // 使用后端API生成初始标签
      const result = await this.sendRequest({
        content: content,
        category: category,
        type: 'initial_tags'
      }, {
        endpoint: this.endpoints.AI_GENERATE_TAGS
      })

      if (result.success && result.data && result.data.tags) {
        return {
          success: true,
          tags: result.data.tags,
          source: 'backend_api'
        }
      } else {
        // 后端API失败时使用本地备用方案
        console.log('后端API失败，使用本地备用方案')
        return this.generateLocalTags(content, category)
      }
    } catch (error) {
      console.error('初始标签生成失败:', error)
      // 使用本地备用方案
      return this.generateLocalTags(content, category)
    }
  }

  /**
   * 生成额外标签（通过后端API）
   */
  async generateAdditionalTags(content, category = '', existingTags = []) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    // 检查用户登录状态
    const currentUser = authGuard.getCurrentUser()
    if (!currentUser || !currentUser.token) {
      console.warn('用户未登录或Token无效，使用本地备用方案')
      return this.generateLocalTags(content, category)
    }

    try {
      // 使用后端API生成额外标签
      const result = await this.sendRequest({
        content: content,
        category: category,
        existingTags: existingTags,
        type: 'additional_tags'
      }, {
        endpoint: this.endpoints.AI_GENERATE_TAGS
      })

      if (result.success && result.data && result.data.tags) {
        return {
          success: true,
          tags: result.data.tags,
          source: 'backend_api'
        }
      } else {
        // 后端API失败时使用本地备用方案
        console.log('后端API失败，使用本地备用方案')
        return this.generateLocalTags(content, category)
      }
    } catch (error) {
      console.error('额外标签生成失败:', error)
      // 使用本地备用方案
      return this.generateLocalTags(content, category)
    }
  }

  /**
   * 生成额外标签（带重试机制）
   */
  async generateAdditionalTagsWithRetry(content, category = '', existingTags = []) {
    return this.generateAdditionalTags(content, category, existingTags)
  }

  /**
   * 建议分类（通过后端API）
   */
  async suggestCategory(content) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法建议分类'
      }
    }

    // 检查用户登录状态
    const currentUser = authGuard.getCurrentUser()
    if (!currentUser || !currentUser.token) {
      console.warn('用户未登录或Token无效，使用本地备用方案')
      return this.getDefaultCategory(content)
    }

    try {
      // 使用后端API建议分类
      const result = await this.sendRequest({
        content: content
      }, {
        endpoint: this.endpoints.AI_SUGGEST_CATEGORY
      })

      if (result.success && result.data && result.data.suggestedCategory) {
        return {
          success: true,
          category: result.data.suggestedCategory,
          confidence: result.data.confidence || 0.8,
          source: 'backend_api'
        }
      } else {
        // 后端API失败时使用本地备用方案
        console.log('后端API失败，使用本地备用方案')
        return this.getDefaultCategory(content)
      }
    } catch (error) {
      console.error('分类建议失败:', error)
      // 使用本地备用方案
      return this.getDefaultCategory(content)
    }
  }

  /**
   * 图片转文字（通过后端API）
   */
  async imageToText(imagePath) {
    try {
      console.log('开始OCR识别:', imagePath)
      
      // 检查用户登录状态
      const currentUser = authGuard.getCurrentUser()
      if (!currentUser || !currentUser.token) {
        console.warn('用户未登录或Token无效，使用百度云OCR备用方案')
        return this.callBaiduOCR(imagePath)
      }
      
      // 优先使用后端API进行OCR
      const result = await this.sendRequest({
        imagePath: imagePath,
        type: 'ocr'
      }, {
        endpoint: this.endpoints.AI_ANALYZE_CONTENT
      })

      if (result.success && result.data && result.data.text) {
        console.log('后端OCR识别成功:', result.data.text)
        return {
          success: true,
          text: result.data.text,
          confidence: result.data.confidence || 0.9,
          source: 'backend_api'
        }
      } else {
        // 后端API失败时使用本地百度云OCR备用方案
        console.log('后端OCR失败，使用百度云OCR备用方案')
        return this.callBaiduOCR(imagePath)
      }
    } catch (error) {
      console.error('OCR识别失败:', error)
      // 使用本地百度云OCR备用方案
      return this.callBaiduOCR(imagePath)
    }
  }

  /**
   * 调用百度云OCR（通过后端代理）
   */
  async callBaiduOCR(imagePath, retryCount = 0) {
    const maxRetries = 2
    const retryDelay = 1000 // 1秒
    
    try {
      console.log(`通过后端调用百度云OCR (第${retryCount + 1}次):`, imagePath)
      
      // 读取图片文件并转换为base64
      const fileRes = await new Promise((resolve, reject) => {
        wx.getFileSystemManager().readFile({
          filePath: imagePath,
          encoding: 'base64',
          success: resolve,
          fail: reject
        })
      })
      
      // 调用后端OCR接口（不需要认证）
      const ocrResult = await new Promise((resolve) => {
        wx.request({
          url: `${this.baseURL}/images/upload`,
          method: 'POST',
          header: {
            'Content-Type': 'application/json',
            'X-App-Version': '1.0.0',
            'X-Client-Type': 'miniprogram'
            // 不发送认证Token，因为OCR接口已经不需要认证
          },
          data: {
            image: `data:image/jpeg;base64,${fileRes.data}`,
            doOCR: true
          },
          timeout: 30000,
          success: (res) => {
            console.log('后端OCR响应:', res.data)
            if (res.statusCode === 200 && res.data.success) {
              if (res.data.data && res.data.data.ocrResult && res.data.data.ocrResult.text) {
                resolve({
                  success: true,
                  text: res.data.data.ocrResult.text,
                  confidence: 0.9,
                  source: 'backend-baidu'
                })
              } else {
                resolve({
                  success: false,
                  error: 'OCR识别结果为空'
                })
              }
            } else {
              resolve({
                success: false,
                error: res.data.message || '后端OCR调用失败'
              })
            }
          },
          fail: (error) => {
            console.error('后端OCR请求失败:', error)
            resolve({
              success: false,
              error: error.errMsg || '网络请求失败'
            })
          }
        })
      })
      
      if (ocrResult.success) {
        console.log('✅ 后端OCR识别成功')
        return ocrResult
      } else {
        // 网络错误时重试
        if (retryCount < maxRetries && (ocrResult.error.includes('网络') || ocrResult.error.includes('timeout'))) {
          console.log(`OCR失败，${retryDelay}ms后重试 (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return this.callBaiduOCR(imagePath, retryCount + 1)
        }
        
        return {
          success: false,
          error: ocrResult.error || '后端OCR识别失败',
          text: ''
        }
      }
    } catch (error) {
      console.error('后端OCR失败:', error)
      
      // 网络错误时重试
      if (retryCount < maxRetries && (error.message.includes('网络') || error.message.includes('timeout'))) {
        console.log(`OCR异常，${retryDelay}ms后重试 (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return this.callBaiduOCR(imagePath, retryCount + 1)
      }
      
      return {
        success: false,
        error: error.message || '后端OCR调用失败',
        text: ''
      }
    }
  }

  /**
   * 获取百度云access_token
   */
  async getBaiduAccessToken(config) {
    return new Promise((resolve) => {
      const tokenUrl = `${config.baseUrl}/oauth/2.0/token`
      
      // 手动构建URL编码的参数
      const params = `grant_type=client_credentials&client_id=${config.apiKey}&client_secret=${config.secretKey}`
      
      wx.request({
        url: tokenUrl,
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: params,
        success: (res) => {
          console.log('百度云token响应:', res.data)
          if (res.data && res.data.access_token) {
            console.log('✅ 百度云access_token获取成功')
            resolve(res.data.access_token)
          } else {
            console.error('❌ 百度云access_token获取失败:', res.data)
            resolve(null)
          }
        },
        fail: (error) => {
          console.error('❌ 百度云access_token请求失败:', error)
          resolve(null)
        }
      })
    })
  }

  /**
   * 调用百度云OCR API
   */
  async callBaiduOCRAPI(imagePath, accessToken, baseUrl) {
    return new Promise((resolve) => {
      const ocrEndpoint = baiduOCRConfig ? baiduOCRConfig.baiduOCR.ocrEndpoint : '/rest/2.0/ocr/v1/general_basic'
      const ocrUrl = `${baseUrl}${ocrEndpoint}?access_token=${accessToken}`
      
      // 将图片转换为base64
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (fileRes) => {
          const imageData = fileRes.data
          
          wx.request({
            url: ocrUrl,
            method: 'POST',
            header: {
              'Content-Type': 'application/x-www-form-urlencoded'
            },
            data: {
              image: imageData,
              ...(baiduOCRConfig ? baiduOCRConfig.baiduOCR.ocrParams : {
                language_type: 'CHN_ENG',
                detect_direction: 'true',
                paragraph: 'true',
                probability: 'true'
              })
            },
            success: (res) => {
              console.log('百度云OCR API响应:', res.data)
              
              if (res.data && res.data.words_result && res.data.words_result.length > 0) {
                // 提取识别文字
                const textArray = res.data.words_result.map(item => item.words)
                const text = textArray.join('\n')
                
                // 计算平均置信度
                const confidences = res.data.words_result.map(item => item.probability?.average || 0.9)
                const avgConfidence = confidences.reduce((sum, conf) => sum + conf, 0) / confidences.length
                
                resolve({
                  success: true,
                  text: text,
                  confidence: avgConfidence
                })
              } else {
                resolve({
                  success: false,
                  error: '未识别到文字内容',
                  text: ''
                })
              }
            },
            fail: (error) => {
              console.error('百度云OCR API调用失败:', error)
              resolve({
                success: false,
                error: error.errMsg || 'OCR API调用失败',
                text: ''
              })
            }
          })
        },
        fail: (error) => {
          console.error('读取图片文件失败:', error)
          resolve({
            success: false,
            error: '读取图片文件失败',
            text: ''
          })
        }
      })
    })
  }

  /**
   * 生成标签（统一接口）
   */
  async generateTags(content, category = '') {
    return this.generateSmartTags(content, category)
  }

  // ========== 本地备用方案 ==========

  /**
   * 本地标签生成（备用方案）
   */
  generateLocalTags(content, category = '') {
    console.log('使用本地标签生成备用方案')
    
    // 简单的关键词提取
    const keywords = this.extractKeywords(content)
    const categoryTags = this.getDefaultTagsByCategory(category)
    
    // 合并关键词和分类标签
    const allTags = [...keywords, ...categoryTags]
    const uniqueTags = [...new Set(allTags)].slice(0, 5)
    
    return {
      success: true,
      tags: uniqueTags,
      source: 'local_fallback'
    }
  }

  /**
   * 提取关键词
   */
  extractKeywords(content) {
    // 简单的关键词提取逻辑
    const words = content.match(/[\u4e00-\u9fa5a-zA-Z0-9]+/g) || []
    return words.filter(word => word.length >= 2 && word.length <= 6).slice(0, 3)
  }

  /**
   * 根据分类获取默认标签
   */
  getDefaultTagsByCategory(category) {
    const categoryTags = {
      'knowledge': ['学习', '知识', '笔记'],
      'art': ['艺术', '创作', '美学'],
      'cute': ['可爱', '萌宠', '温馨'],
      'dreams': ['梦想', '未来', '希望'],
      'foods': ['美食', '料理', '味道'],
      'happiness': ['快乐', '幸福', '美好'],
      'sights': ['风景', '旅行', '自然'],
      'thinking': ['思考', '感悟', '人生']
    }
    return categoryTags[category] || []
  }

  /**
   * 获取默认分类
   */
  getDefaultCategory(content) {
    // 简单的分类逻辑
    if (content.includes('学习') || content.includes('知识')) return 'knowledge'
    if (content.includes('艺术') || content.includes('创作')) return 'art'
    if (content.includes('美食') || content.includes('料理')) return 'foods'
    if (content.includes('旅行') || content.includes('风景')) return 'sights'
    return 'thinking'
  }

  /**
   * 基于分类生成标签
   */
  generateTagsByCategory(category) {
    console.log('基于分类生成标签:', category)
    
    const categoryTags = this.getDefaultTagsByCategory(category)
    
    if (categoryTags.length > 0) {
      return {
        success: true,
        tags: categoryTags,
        source: 'category_based'
      }
    } else {
      return {
        success: false,
        error: '无法为该分类生成标签'
      }
    }
  }
}

// 创建单例实例
const aiService = new AIService()

module.exports = aiService