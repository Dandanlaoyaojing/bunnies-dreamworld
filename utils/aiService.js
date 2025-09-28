// utils/aiService.js
// 小程序使用 DeepSeek 模型
const API_KEY = 'sk-7f977e073d1a431caf8a7b87674fd22a'
const API_URL = 'https://api.deepseek.com/v1/chat/completions'

class AIService {
  constructor() {
    this.apiKey = API_KEY
    this.baseURL = API_URL
    this.currentModel = 'deepseek-chat' // DeepSeek 默认模型
  }

  setModel(modelName) {
    this.currentModel = modelName
    console.log('AI模型已切换为:', modelName)
  }

  getCurrentModel() {
    return this.currentModel
  }

  getAvailableModels() {
    return [
      'deepseek-chat',
      'deepseek-coder'
    ]
  }

  /**
   * 发送请求到AI API（带重试机制）
   */
  async sendRequest(messages, options = {}) {
    const maxRetries = 3 // 增加重试次数
    const baseDelay = 1000 // 基础延迟时间

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`尝试第 ${attempt} 次请求...`)
        const result = await this.makeRequest(messages, options)
        
        if (result.success) {
          console.log('请求成功')
          return result
        }

        if (attempt === maxRetries) {
          console.error('所有重试都失败了')
          return result
        }

        // 指数退避延迟
        const delay = baseDelay * Math.pow(2, attempt - 1)
        console.log(`第 ${attempt} 次请求失败，${delay}ms 后重试...`)
        await this.delay(delay)

      } catch (error) {
        console.error(`第 ${attempt} 次请求异常:`, error)
        if (attempt === maxRetries) {
          return {
            success: false,
            error: error.message || '请求异常'
          }
        }
        // 指数退避延迟
        const delay = baseDelay * Math.pow(2, attempt - 1)
        await this.delay(delay)
      }
    }
  }

  makeRequest(messages, options = {}) {
    return new Promise((resolve) => {
      wx.request({
        url: this.baseURL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        data: JSON.stringify({
          model: this.currentModel,
          messages: messages,
          max_tokens: options.max_tokens || 1000,
          temperature: options.temperature || 0.7
        }),
        timeout: 20000, // 20秒超时，给AI更多响应时间
        success: (response) => {
          console.log('请求成功:', response)
            resolve({
              success: true,
            data: response.data,
            statusCode: response.statusCode
          })
        },
        fail: (error) => {
          console.error('请求失败:', error)
          resolve({
            success: false,
            error: error.errMsg || '请求失败'
          })
        }
      })
    })
  }

  delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms))
  }

  /**
   * 生成智能标签（高质量版）
   */
  async generateSmartTags(content, category = '') {
    // 先检查网络状态
    const networkStatus = await this.checkNetworkStatus()
    if (!networkStatus.success || !networkStatus.isConnected) {
      console.log('网络不可用，跳过AI标签生成')
      return {
        success: false,
        error: '网络连接不可用'
      }
    }

    // 保持完整内容，确保标签质量
    const fullContent = content

    const result = await this.sendRequest([
      {
        role: 'system',
        content: '生成3-5个简洁标签，用逗号分隔，不要解释'
      },
      {
        role: 'user',
        content: `内容：${fullContent}${category ? ` [${category}]` : ''}`
      }
    ], {
      max_tokens: 100, // 减少token数量提高速度
      temperature: 0.3 // 适中的随机性
    })

    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      const rawTags = result.data.choices[0].message.content
      const tags = rawTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      
      // 过滤和优化标签
      const optimizedTags = this.optimizeTags(tags, category)
      
      return {
        success: true,
        tags: optimizedTags.slice(0, 5) // 最多返回5个标签
      }
    } else {
      return {
        success: false,
        error: result.error || 'AI服务响应格式错误'
      }
    }
  }

  /**
   * 优化标签质量
   */
  optimizeTags(tags, category = '') {
    const optimizedTags = []
    
    // 过滤无效标签
    const validTags = tags.filter(tag => {
      // 过滤掉太短或太长的标签
      if (tag.length < 1 || tag.length > 8) return false
      
      // 过滤掉纯数字或特殊字符
      if (/^[0-9\s\-_\.]+$/.test(tag)) return false
      
      // 过滤掉常见的无意义词汇
      const meaninglessWords = ['的', '了', '是', '在', '有', '和', '与', '或', '但', '然而', '因为', '所以']
      if (meaninglessWords.includes(tag)) return false
      
      return true
    })
    
    // 去重
    const uniqueTags = [...new Set(validTags)]
    
    // 根据分类优化标签
    if (category) {
      const categoryContext = this.getCategoryContext(category)
      // 优先保留与分类相关的标签
      const categoryRelatedTags = uniqueTags.filter(tag => 
        categoryContext.includes(tag) || tag.includes(category)
      )
      optimizedTags.push(...categoryRelatedTags)
    }
    
    // 添加其他高质量标签
    const otherTags = uniqueTags.filter(tag => !optimizedTags.includes(tag))
    optimizedTags.push(...otherTags)
    
    return optimizedTags
  }

  /**
   * 生成本地标签（当AI服务不可用时）
   */
  generateLocalTags(content, category = '') {
    const tags = []
    
    // 基于内容长度生成标签
    if (content.length > 200) {
      tags.push('长文')
    } else if (content.length < 50) {
      tags.push('短文')
    }
    
    // 基于分类生成高质量标签
    if (category) {
      const categoryTags = {
        'art': ['艺术', '创作', '美学'],
        'cute': ['可爱', '萌宠', '温馨'],
        'dreams': ['梦想', '目标', '未来'],
        'foods': ['美食', '烹饪', '料理'],
        'happiness': ['快乐', '幸福', '正能量'],
        'knowledge': ['学习', '知识', '成长'],
        'sights': ['风景', '旅行', '自然'],
        'thinking': ['思考', '哲学', '感悟']
      }
      
      if (categoryTags[category]) {
        tags.push(...categoryTags[category])
      } else {
        tags.push(category)
      }
    }
    
    // 基于内容关键词生成标签
    const keywords = this.extractKeywords(content)
    tags.push(...keywords.slice(0, 2)) // 最多添加2个关键词标签
    
    // 确保至少有1个标签
    if (tags.length === 0) {
      tags.push('笔记')
    }
    
    return {
          success: true,
      tags: [...new Set(tags)] // 去重
    }
  }

  /**
   * 从内容中提取关键词
   */
  extractKeywords(content) {
    const keywords = []
    
    // 常见关键词模式
    const patterns = [
      { pattern: /学习|知识|教育/g, tag: '学习' },
      { pattern: /工作|职业|事业/g, tag: '工作' },
      { pattern: /生活|日常|生活/g, tag: '生活' },
      { pattern: /旅行|旅游|出行/g, tag: '旅行' },
      { pattern: /美食|食物|吃/g, tag: '美食' },
      { pattern: /运动|健身|锻炼/g, tag: '运动' },
      { pattern: /读书|阅读|书籍/g, tag: '阅读' },
      { pattern: /音乐|歌曲|听歌/g, tag: '音乐' },
      { pattern: /电影|影片|观影/g, tag: '电影' },
      { pattern: /朋友|友谊|社交/g, tag: '社交' }
    ]
    
    patterns.forEach(({ pattern, tag }) => {
      if (pattern.test(content) && !keywords.includes(tag)) {
        keywords.push(tag)
      }
    })
    
    return keywords
  }

  /**
   * 获取分类上下文
   */
  getCategoryContext(category) {
    const contexts = {
      'art': '艺术创作、绘画、设计、美学',
      'cute': '可爱、萌宠、温馨、治愈',
      'dreams': '梦想、目标、未来、理想',
      'foods': '美食、烹饪、餐厅、料理',
      'happiness': '快乐、幸福、喜悦、正能量',
      'knowledge': '学习、知识、教育、成长',
      'sights': '风景、旅行、自然、美景',
      'thinking': '思考、哲学、感悟、反思'
    }
    return contexts[category] || '通用内容'
  }

  /**
   * 智能标签生成（带本地备用）
   */
  async generateTags(content, category = '') {
    try {
      // 先尝试AI生成
      const aiResult = await this.generateSmartTags(content, category)
      
      if (aiResult.success) {
        console.log('AI标签生成成功:', aiResult.tags)
        return aiResult
      }
      
      // AI失败时使用本地生成
      console.log('AI标签生成失败，使用本地标签生成')
      const localTags = this.generateLocalTags(content, category)
      
      if (localTags.success) {
        console.log('本地标签生成成功:', localTags.tags)
        return {
          ...localTags,
          isLocal: true, // 标记为本地生成
          message: 'AI服务暂时不可用，已使用本地智能标签'
        }
      }
      
      return {
        success: false,
        error: '标签生成失败'
      }
    } catch (error) {
      console.error('标签生成异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 开始录音
   */
  startRecording() {
    return new Promise((resolve, reject) => {
      const recorderManager = wx.getRecorderManager()
      
      // 获取最佳录音配置
      const options = this.getOptimalRecordOptions(wx.getSystemInfoSync())
      
      recorderManager.start(options)
      
        recorderManager.onStart(() => {
        console.log('录音开始')
        resolve({
          success: true,
          message: '录音开始'
        })
      })
      
      recorderManager.onError((error) => {
        console.error('录音错误:', error)
        const handledError = this.handleRecordError(error)
        reject(handledError)
      })
    })
  }

  /**
   * 停止录音
   */
  stopRecording() {
    return new Promise((resolve, reject) => {
    const recorderManager = wx.getRecorderManager()
        
    recorderManager.onStop((res) => {
        console.log('录音结束:', res)
          if (res.tempFilePath) {
        resolve({
          success: true,
            tempFilePath: res.tempFilePath,
            duration: res.duration
        })
      } else {
          reject({
          success: false,
            error: '录音文件生成失败'
        })
      }
    })

      recorderManager.onError((error) => {
        console.error('停止录音错误:', error)
        reject(this.handleRecordError(error))
      })
      
          recorderManager.stop()
    })
  }

  /**
   * 处理录音错误
   */
  handleRecordError(res) {
    console.error('录音错误详情:', res)
    
    if (!res.errMsg) {
      return { success: false, error: '未知录音错误' }
    }
    
    switch (res.errMsg) {
      case 'auth deny':
        return { success: false, error: '录音权限被拒绝，请在设置中开启录音权限' }
      case 'system permission denied':
        return { success: false, error: '系统录音权限被拒绝' }
      case 'getRecorderManager:fail auth deny':
        return { success: false, error: '录音权限被拒绝' }
      case 'start:fail':
        return { success: false, error: '录音启动失败' }
      case 'stop:fail':
        return { success: false, error: '录音停止失败' }
      default:
        return { success: false, error: `录音错误: ${res.errMsg}` }
    }
  }

  /**
   * 调试录音器
   */
  debugRecorder() {
    const recorderManager = wx.getRecorderManager()
    
    recorderManager.onStart(() => {
      console.log('调试: 录音开始')
    })
    
    recorderManager.onStop((res) => {
      console.log('调试: 录音结束', res)
    })
    
    recorderManager.onError((error) => {
      console.error('调试: 录音错误', error)
    })
    
    recorderManager.onFrameRecorded((res) => {
      console.log('调试: 录音帧', res)
    })
  }

  /**
   * 获取最佳录音配置
   */
  getOptimalRecordOptions(systemInfo) {
    const baseOptions = {
      duration: 60000, // 60秒
      sampleRate: 16000, // 16kHz，适合语音识别
      numberOfChannels: 1, // 单声道
      encodeBitRate: 96000, // 96kbps
      format: 'mp3', // MP3格式
      frameSize: 50 // 50ms帧大小
    }
    
    // 根据系统信息调整配置
    if (systemInfo.platform === 'ios') {
      baseOptions.sampleRate = 44100 // iOS推荐采样率
    }
    
    return baseOptions
  }

  /**
   * 语音转文字
   */
  async speechToText(audioPath) {
    try {
      console.log('开始语音转文字:', audioPath)
      
      // 百度云语音识别配置
      const BAIDU_API_KEY = 'h4JOBUWiwPk9x1MXMWyuehsI'
      const BAIDU_SECRET_KEY = 'rCRT64loL5kDZtsKyZHiXrl3NseADgaF'
      
      // 1. 获取access_token
      const tokenResult = await this.getBaiduAccessToken(BAIDU_API_KEY, BAIDU_SECRET_KEY)
      
      if (!tokenResult.success) {
        return {
          success: false,
          error: '获取百度云访问令牌失败'
        }
      }

      // 2. 转换音频文件为base64
      const base64Audio = await this.audioToBase64(audioPath)
      
      // 3. 调用百度云语音识别API
      const result = await this.callBaiduSpeechAPI(tokenResult.access_token, base64Audio)
      
      if (result.success) {
        return {
          success: true,
          text: result.text
        }
      } else {
        return result
      }
    } catch (error) {
      console.error('语音转文字异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 调用百度云语音识别API
   */
  async callBaiduSpeechAPI(accessToken, base64Audio) {
    return new Promise((resolve) => {
        wx.request({
        url: `https://vop.baidu.com/server_api?access_token=${accessToken}`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: JSON.stringify({
          format: 'mp3',
          rate: 16000,
          channel: 1,
          cuid: this.generateCuid(),
          token: accessToken,
          speech: base64Audio,
          len: base64Audio.length
        }),
          timeout: 30000, // 30秒超时
        success: (response) => {
          console.log('语音识别请求成功:', response)
      if (response.statusCode === 200 && response.data) {
        if (response.data.err_no === 0 && response.data.result) {
              resolve({
            success: true,
                text: response.data.result[0]
              })
        } else {
              resolve({
            success: false,
                error: `语音识别失败: ${response.data.err_msg || '未知错误'}`
              })
        }
      } else {
            resolve({
          success: false,
              error: '语音识别请求失败'
            })
          }
        },
        fail: (error) => {
          console.error('语音识别请求失败:', error)
          resolve({
        success: false,
            error: error.errMsg || '语音识别请求失败'
          })
      }
      })
    })
  }

  /**
   * 获取百度云访问令牌
   */
  async getBaiduAccessToken(apiKey, secretKey) {
    return new Promise((resolve) => {
      wx.request({
        url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30秒超时
        success: (response) => {
          console.log('获取访问令牌请求成功:', response)
          if (response.statusCode === 200 && response.data && response.data.access_token) {
            resolve({
          success: true,
          access_token: response.data.access_token
            })
          } else {
            resolve({
        success: false,
              error: '获取访问令牌失败'
            })
          }
        },
        fail: (error) => {
          console.error('获取百度云访问令牌请求失败:', error)
          resolve({
        success: false,
            error: error.errMsg || '获取访问令牌请求失败'
          })
      }
      })
    })
  }

  /**
   * 将音频文件转换为base64
   */
  audioToBase64(audioPath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: audioPath,
        encoding: 'base64',
        success: (res) => {
          console.log('音频文件转换为base64成功')
          resolve(res.data)
        },
        fail: (error) => {
          console.error('音频文件转换失败:', error)
          reject(error)
        }
      })
    })
  }

  /**
   * 生成唯一的设备标识符
   */
  generateCuid() {
    // 百度云API要求cuid必须是纯数字或字母，长度不超过64位
    // 使用官方推荐的格式
    const cuid = 'wx_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    
    console.log('生成的cuid:', cuid)
    return cuid
  }

  /**
   * 使用模拟语音识别数据（当百度云API不可用时）
   */
  useMockSpeechRecognition(resolve) {
    console.log('使用模拟语音识别数据')
    setTimeout(() => {
      resolve({
        success: true,
        text: '这是一段模拟的语音识别结果，请检查网络连接或API配置。'
      })
    }, 1000)
  }

  /**
   * 格式化时间
   */
  formatTime(date) {
    const year = date.getFullYear()
    const month = (date.getMonth() + 1).toString().padStart(2, '0')
    const day = date.getDate().toString().padStart(2, '0')
    const hour = date.getHours().toString().padStart(2, '0')
    const minute = date.getMinutes().toString().padStart(2, '0')
    const second = date.getSeconds().toString().padStart(2, '0')
    
    return `${year}-${month}-${day} ${hour}:${minute}:${second}`
  }

  /**
   * 格式化录音时长
   */
  formatDuration(duration) {
    const seconds = Math.floor(duration / 1000)
    const minutes = Math.floor(seconds / 60)
    const remainingSeconds = seconds % 60
    
    if (minutes > 0) {
      return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`
    } else {
      return `0:${remainingSeconds.toString().padStart(2, '0')}`
    }
  }

  /**
   * 检查网络状态
   */
  checkNetworkStatus() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          console.log('网络类型:', res.networkType)
          resolve({
            success: true,
            networkType: res.networkType,
            isConnected: res.networkType !== 'none'
          })
        },
        fail: (error) => {
          console.error('获取网络状态失败:', error)
          resolve({
            success: false,
            error: error.errMsg || '获取网络状态失败'
          })
        }
      })
    })
  }

  /**
   * 检查API状态
   */
  async checkAPIStatus() {
    // 先检查网络状态
    const networkStatus = await this.checkNetworkStatus()
    if (!networkStatus.success || !networkStatus.isConnected) {
      return {
        success: false,
        error: '网络连接不可用，请检查网络设置'
      }
    }

    const testMessages = [
      {
        role: 'user',
        content: '测试'
      }
    ]
    
    const result = await this.sendRequest(testMessages, { 
      max_tokens: 5,
      timeout: 10000 // 测试请求使用较短超时
    })
    return result
  }

  /**
   * 快速测试API连接
   */
  async quickAPITest() {
    try {
      console.log('开始快速API测试...')
      const startTime = Date.now()
      
      const result = await this.sendRequest([
        { role: 'user', content: '你好' }
      ], {
        max_tokens: 5,
        timeout: 10000
      })
      
      const endTime = Date.now()
      const duration = endTime - startTime
      
      console.log(`API测试完成，耗时: ${duration}ms`)
      console.log('测试结果:', result)
      
      return {
        success: result.success,
        duration: duration,
        error: result.error
      }
    } catch (error) {
      console.error('API测试异常:', error)
      return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 获取网络状态信息
   */
  getNetworkInfo() {
    return new Promise((resolve) => {
      wx.getNetworkType({
        success: (res) => {
          const networkInfo = {
            networkType: res.networkType,
            isConnected: res.networkType !== 'none',
            isWifi: res.networkType === 'wifi',
            isCellular: res.networkType === '2g' || res.networkType === '3g' || res.networkType === '4g' || res.networkType === '5g'
          }
          resolve(networkInfo)
        },
        fail: (error) => {
          resolve({
            networkType: 'unknown',
            isConnected: false,
            isWifi: false,
            isCellular: false,
            error: error.errMsg
          })
        }
      })
    })
  }

  /**
   * 图片OCR文字识别（使用百度云OCR API）
   */
  async imageToText(imagePath) {
    try {
      console.log('开始图片OCR识别:', imagePath)
      
      // 百度云OCR配置
      const BAIDU_API_KEY = 'h4JOBUWiwPk9x1MXMWyuehsI'
      const BAIDU_SECRET_KEY = 'rCRT64loL5kDZtsKyZHiXrl3NseADgaF'
      
      // 1. 获取access_token
      const tokenResult = await this.getBaiduAccessToken(BAIDU_API_KEY, BAIDU_SECRET_KEY)
      
      if (!tokenResult.success) {
    return {
      success: false,
          error: '获取百度云访问令牌失败'
        }
      }
      
      // 2. 转换图片文件为base64
      const base64Image = await this.imageToBase64(imagePath)
      
      // 3. 调用百度云OCR API
      const result = await this.callBaiduOCRAPI(tokenResult.access_token, base64Image)
      
      if (result.success) {
          return {
            success: true,
          text: result.text
          }
        } else {
        return result
      }
    } catch (error) {
      console.error('图片OCR识别异常:', error)
        return {
        success: false,
        error: error.message
      }
    }
  }

  /**
   * 调用百度云OCR API
   */
  async callBaiduOCRAPI(accessToken, base64Image) {
    return new Promise((resolve) => {
      wx.request({
        url: `https://aip.baidubce.com/rest/2.0/ocr/v1/general_basic?access_token=${accessToken}`,
        method: 'POST',
        header: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        data: {
          image: base64Image
        },
        timeout: 30000, // 30秒超时
        success: (response) => {
          console.log('OCR请求成功:', response)
          if (response.statusCode === 200 && response.data) {
            if (response.data.words_result && response.data.words_result.length > 0) {
              const text = response.data.words_result.map(item => item.words).join('\n')
              resolve({
                success: true,
                text: text
              })
            } else {
        resolve({
          success: false,
                error: '未识别到文字内容'
              })
            }
          } else {
            resolve({
              success: false,
              error: 'OCR请求失败'
            })
          }
        },
        fail: (error) => {
          console.error('OCR请求失败:', error)
          resolve({
            success: false,
            error: error.errMsg || 'OCR请求失败'
          })
        }
      })
    })
  }

  /**
   * 将图片文件转换为base64
   */
  imageToBase64(imagePath) {
    return new Promise((resolve, reject) => {
      wx.getFileSystemManager().readFile({
        filePath: imagePath,
        encoding: 'base64',
        success: (res) => {
          console.log('图片文件转换为base64成功')
          resolve(res.data)
        },
        fail: (error) => {
          console.error('图片文件转换失败:', error)
          reject(error)
        }
      })
    })
  }
}

// 创建单例实例
const aiService = new AIService()

module.exports = aiService