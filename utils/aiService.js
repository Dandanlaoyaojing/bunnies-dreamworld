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

  /**
   * 设置AI模型
   */
  setModel(modelName) {
    this.currentModel = modelName
    console.log('AI模型已切换为:', modelName)
  }

  /**
   * 获取当前模型
   */
  getCurrentModel() {
    return this.currentModel
  }

  /**
   * 获取可用模型列表
   */
  getAvailableModels() {
    return {
      deepseek: [
        'deepseek-chat',      // 通用对话模型（推荐）
        'deepseek-coder'      // 代码专用模型
      ],
      gemini: [
        'gemini-2.0-flash-exp',  // Gemini 2.5 Pro 最新最强模型
        'gemini-1.5-pro',        // 稳定版本
        'gemini-1.5-flash',      // 快速响应
        'gemini-1.0-pro'         // 经典版本
      ],
      claude: [
        'claude-3-5-sonnet-20241022',  // 高质量对话
        'claude-3-5-haiku-20241022',   // 快速响应
        'claude-3-opus-20240229'       // 最高质量
      ],
      openai: [
        'gpt-3.5-turbo',     // 快速响应
        'gpt-4',             // 高质量
        'gpt-4-turbo'        // 平衡性能
      ]
    }
  }

  /**
   * 发送请求到AI API
   */
  async sendRequest(messages, options = {}) {
    return new Promise((resolve) => {
      console.log('发送API请求:', { messages, options })
      
      // DeepSeek API 格式
      const requestData = {
        model: this.currentModel,
        messages: messages,
        max_tokens: options.max_tokens || 1000,
        temperature: options.temperature || 0.7
      }
      
      const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      }
      
      wx.request({
        url: this.baseURL,
        method: 'POST',
        header: headers,
        data: requestData,
        success: (response) => {
          console.log('API响应:', response)
          if (response.statusCode === 200 && response.data && response.data.choices) {
            const content = response.data.choices[0].message.content
            resolve({
              success: true,
              content: content
            })
          } else if (response.statusCode === 401) {
            resolve({
              success: false,
              error: 'API密钥无效，请检查配置'
            })
          } else {
            console.error('API响应格式错误:', response.data)
            resolve({
              success: false,
              error: 'API响应格式错误'
            })
          }
        },
        fail: (error) => {
          console.error('API请求失败:', error)
          resolve({
            success: false,
            error: '网络请求失败: ' + (error.errMsg || '未知错误')
          })
        }
      })
    })
  }

  /**
   * 智能标签生成
   */
  async generateSmartTags(content, category = '') {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    const categoryContext = this.getCategoryContext(category)
    const messages = [
      {
        role: 'system',
        content: `你是一个智能标签生成助手。${categoryContext}请根据用户提供的内容，生成3-5个相关的标签。标签要求：
1. 简洁明了，每个标签2-6个字
2. 准确反映内容主题
3. 避免过于宽泛的词汇
4. 用逗号分隔，不要编号
5. 只返回标签，不要其他解释`
      },
      {
        role: 'user',
        content: `请为以下内容生成标签：\n\n${content}`
      }
    ]

    const result = await this.sendRequest(messages, { max_tokens: 200 })
    
    if (result.success) {
      const tags = result.content.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      return {
        success: true,
        tags: tags
      }
    } else {
      // API不可用时，使用本地标签生成
      console.log('API不可用，使用本地标签生成')
      return this.generateLocalTags(content, category)
    }
  }

  /**
   * 本地标签生成（当API不可用时使用）
   */
  generateLocalTags(content, category = '') {
    const tags = []
    const words = content.split(/[\s\n\r\t，。！？；：""''（）【】]/).filter(word => word.length > 1)
    
    // 根据内容长度和关键词生成标签
    if (content.includes('工作') || content.includes('项目') || content.includes('任务')) {
      tags.push('工作')
    }
    if (content.includes('学习') || content.includes('知识') || content.includes('课程')) {
      tags.push('学习')
    }
    if (content.includes('生活') || content.includes('日常') || content.includes('体验')) {
      tags.push('生活')
    }
    if (content.includes('技术') || content.includes('编程') || content.includes('开发')) {
      tags.push('技术')
    }
    if (content.includes('艺术') || content.includes('创作') || content.includes('设计')) {
      tags.push('艺术')
    }
    
    // 添加一些通用标签
    if (content.length > 100) {
      tags.push('长文')
    }
    if (content.includes('？') || content.includes('?')) {
      tags.push('疑问')
    }
    if (content.includes('！') || content.includes('!')) {
      tags.push('感叹')
    }
    
    // 如果没有生成任何标签，添加默认标签
    if (tags.length === 0) {
      tags.push('笔记', '记录', '内容')
    }
    
    return {
          success: true,
      tags: tags.slice(0, 5) // 最多返回5个标签
    }
  }

  /**
   * 获取分类上下文信息
   */
  getCategoryContext(category) {
    const categoryMap = {
      'art': '内容分类：艺术创作类 - 重点关注艺术、美学、创作、色彩、构图等标签',
      'tech': '内容分类：技术类 - 重点关注技术、编程、开发、创新等标签',
      'life': '内容分类：生活类 - 重点关注生活、日常、体验、感悟等标签',
      'work': '内容分类：工作类 - 重点关注工作、职业、项目、管理、效率等标签',
      'study': '内容分类：学习类 - 重点关注学习、知识、教育、成长等标签'
    }
    
    return categoryMap[category] || '内容分类：通用类 - 根据内容特点生成相关标签'
  }

  /**
   * 生成初始标签（文字识别后自动调用，生成3-5个标签）
   */
  async generateInitialTags(content, category = '') {
    return this.generateSmartTags(content, category)
  }

  /**
   * 生成追加标签（用户点击继续生成，每次生成3个标签）
   */
  async generateAdditionalTags(content, category = '', existingTags = []) {
    if (!content || content.trim().length < 3) {
      return {
            success: false,
        error: '内容太短，无法生成标签'
      }
    }

    const existingTagsText = existingTags.length > 0 ? `\n已存在的标签：${existingTags.join(', ')}` : ''
    const messages = [
      {
        role: 'system',
        content: `你是一个智能标签生成助手。请根据用户提供的内容，生成3个新的相关标签。${existingTagsText}
标签要求：
1. 简洁明了，每个标签2-6个字
2. 准确反映内容主题
3. 避免与已有标签重复
4. 用逗号分隔，不要编号
5. 只返回标签，不要其他解释`
      },
      {
        role: 'user',
        content: `请为以下内容生成3个新标签：\n\n${content}`
      }
    ]

    const result = await this.sendRequest(messages, { max_tokens: 150 })
    
    if (result.success) {
      const tags = result.content.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
      return {
        success: true,
        tags: tags
      }
            } else {
      // API不可用时，使用本地标签生成
      console.log('API不可用，使用本地追加标签生成')
      const localTags = this.generateLocalTags(content, category)
      if (localTags.success) {
        // 过滤掉已存在的标签
        const newTags = localTags.tags.filter(tag => !existingTags.includes(tag))
        return {
          success: true,
          tags: newTags.slice(0, 3) // 最多返回3个新标签
        }
      } else {
        return {
          success: false,
          error: result.error || '追加标签生成失败'
        }
      }
    }
  }

  /**
   * 智能标签生成（兼容旧版本）
   */
  async generateTags(content, category = '') {
    return this.generateSmartTags(content, category)
  }

  /**
   * 录制语音条
   */
  async recordVoice() {
    return new Promise((resolve) => {
      console.log('=== aiService.recordVoice 开始 ===')
      
      try {
        // 1. 初始化检查
        this.debugRecorder()
        
        // 2. 获取录音管理器
    const recorderManager = wx.getRecorderManager()
        console.log('录音管理器创建成功')
        
        // 3. 设置录音事件监听
        recorderManager.onStart(() => {
          console.log('✅ 录音开始')
          wx.showToast({
            title: '正在录音...',
            icon: 'none'
          })
        })
        
    recorderManager.onStop((res) => {
          console.log('✅ 录音结束:', res)
          wx.hideToast()
          
          if (res.tempFilePath) {
            const duration = Math.round(res.duration / 1000)
            console.log('录音成功，时长:', duration, '秒')
        resolve({
          success: true,
              audioPath: res.tempFilePath,
              duration: duration
        })
      } else {
        console.error('录音文件路径为空')
        resolve({
          success: false,
              error: '录音文件路径为空'
        })
      }
    })

        recorderManager.onError((res) => {
          console.error('❌ 录音错误:', res)
          wx.hideToast()
          
          // 处理录音错误
          const errorMsg = this.handleRecordError(res)
      resolve({
        success: false,
            error: errorMsg
          })
        })
        
        // 4. 录音参数 - 根据百度云API文档优化
        const options = {
          duration: 60000, // 最长录音时间60秒
          sampleRate: 16000, // 采样率16000Hz（推荐）
          numberOfChannels: 1, // 单声道（必须）
          encodeBitRate: 96000, // 编码码率
          format: 'mp3' // 音频格式mp3
        }
        console.log('录音配置:', options)
        
        // 5. 开始录音
    recorderManager.start(options)
        console.log('录音启动命令已发送')

        // 10秒后自动停止
    setTimeout(() => {
          console.log('自动停止录音')
          recorderManager.stop()
        }, 10000)
        
      } catch (error) {
        console.error('录音初始化失败:', error)
        resolve({
          success: false,
          error: `录音初始化失败: ${error.message}`
        })
      }
    })
  }

  /**
   * 处理录音错误
   */
  handleRecordError(res) {
    console.log('错误详情:', res)
    
    if (!res.errMsg) {
      return '录音失败，未知错误'
    }
    
    switch (res.errMsg) {
      case 'operateRecorder:fail NotFoundError':
        return '找不到录音设备，请检查麦克风'
      case 'operateRecorder:fail auth deny':
        return '录音权限被拒绝'
      case 'operateRecorder:fail NotSupportedError':
        return '设备不支持录音功能'
      case 'operateRecorder:fail NotAllowedError':
        return '录音权限被拒绝'
      default:
        // 忽略特定的内部错误
        if (res.errMsg.includes('reportRealtimeAction:fail not support')) {
          console.log('忽略内部错误，继续录音')
          return null // 返回null表示忽略此错误
        }
        return `录音失败: ${res.errMsg}`
    }
  }

  /**
   * 调试录音器信息
   */
  debugRecorder() {
    console.log('=== 录音调试信息 ===')
    
    // 1. 系统信息
    const systemInfo = wx.getSystemInfoSync()
    console.log('系统信息:', {
      platform: systemInfo.platform,
      system: systemInfo.system,
      version: systemInfo.version,
      SDKVersion: systemInfo.SDKVersion
    })
    
    // 2. 权限信息
    wx.getSetting({
      success: (res) => {
        console.log('权限信息:', res.authSetting)
      }
    })
    
    // 3. 测试录音器获取
    try {
      const testRecorder = wx.getRecorderManager()
      console.log('录音器获取成功:', testRecorder)
    } catch (error) {
      console.error('录音器获取失败:', error)
    }
  }

  /**
   * 获取最优录音配置
   */
  getOptimalRecordOptions(systemInfo) {
    console.log('系统信息用于录音配置:', systemInfo)
    
    // 使用最基础的稳定配置
    const options = {
      duration: 10000, // 10秒录音时长，更稳定
      sampleRate: 16000,
      numberOfChannels: 1,
      encodeBitRate: 96000,
      format: 'mp3'
    }
    
    console.log('使用基础录音配置:', options)
    return options
  }

  /**
   * 语音转文字（使用百度云API）
   */
  async speechToTextWithBaidu(audioPath) {
    try {
      // 百度云语音识别配置
      const BAIDU_API_KEY = 'Zakw6jROYh5FQkZ9jTVU11li'
      const BAIDU_SECRET_KEY = 'ohARLcJP7PVUCK3irFEeZoPemLfY2hlD'
      
      // 1. 获取access_token
      const tokenResult = await this.getBaiduAccessToken(BAIDU_API_KEY, BAIDU_SECRET_KEY)
      
      if (!tokenResult.success) {
        return {
          success: false,
          error: '获取百度云访问令牌失败'
        }
      }

      // 2. 将音频文件转换为base64
      const base64Audio = await this.audioToBase64(audioPath)
      
      // 3. 构建请求数据
        // 生成唯一的设备标识符
        const cuid = this.generateCuid()
        console.log('生成的cuid用于请求:', cuid)
        
        const requestData = {
          speech: base64Audio,
          len: base64Audio.length,
          format: 'mp3',
          rate: 16000,
          cuid: cuid,
          token: tokenResult.access_token
        }
        
        console.log('构建的请求数据cuid:', requestData.cuid)
        console.log('完整请求数据:', requestData)
      
      console.log('百度云语音识别请求数据:', {
        format: requestData.format,
        rate: requestData.rate,
        cuid: requestData.cuid,
        len: requestData.len,
        speechLength: requestData.speech.length
      })
      
      // 4. 发送语音识别请求
      const response = await new Promise((resolve, reject) => {
        wx.request({
        url: 'https://vop.baidu.com/server_api',
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
          data: JSON.stringify(requestData),
          timeout: 30000, // 30秒超时
          success: (res) => {
            console.log('请求成功:', res)
            resolve(res)
          },
          fail: (error) => {
            console.error('请求失败:', error)
            reject(error)
          }
        })
      })

      console.log('百度云API响应:', response)
      console.log('响应状态码:', response.statusCode)
      console.log('响应数据:', response.data)
      
      if (response.statusCode === 200 && response.data) {
        if (response.data.err_no === 0 && response.data.result) {
          const text = response.data.result.join('')
          console.log('语音识别成功:', text)
          return {
            success: true,
            text: text,
            confidence: response.data.result.confidence || 0,
            corpus_no: response.data.corpus_no,
            sn: response.data.sn
          }
        } else {
          // 根据官方文档的错误码处理
          const errorMessages = {
            3300: '输入参数不正确',
            3301: 'speech参数缺失',
            3302: 'len参数缺失',
            3303: 'format参数缺失',
            3304: 'rate参数缺失',
            3305: 'cuid参数缺失',
            3307: '音频数据格式错误',
            3308: '音频数据长度错误',
            3309: '音频数据采样率错误',
            3310: '音频数据声道数错误',
            3311: '音频数据时长超限',
            3312: '音频数据大小超限'
          }
          
          const errorMsg = errorMessages[response.data.err_no] || response.data.err_msg || '语音识别失败'
          console.error('语音识别失败:', errorMsg)
          return {
            success: false,
            error: errorMsg
          }
        }
      } else {
        const errorMsg = `HTTP请求失败: ${response.statusCode}`
        console.error('HTTP请求失败:', response)
        return {
          success: false,
          error: errorMsg
      }
      }
    } catch (error) {
      console.error('语音识别异常:', error)
      return {
        success: false,
        error: '语音识别异常: ' + error.message
      }
    }
  }

  /**
   * 获取百度云访问令牌
   */
  async getBaiduAccessToken(apiKey, secretKey) {
    return new Promise((resolve) => {
      wx.request({
        url: `https://aip.baidubce.com/oauth/2.0/token?grant_type=client_credentials&client_id=${apiKey}&client_secret=${secretKey}`,
        method: 'GET',
        header: {
          'Content-Type': 'application/json'
        },
        timeout: 30000, // 30秒超时
        success: (response) => {
      console.log('百度云访问令牌响应:', response)
          console.log('访问令牌响应状态码:', response.statusCode)
          console.log('访问令牌响应数据:', response.data)
      
          if (response.statusCode === 200 && response.data && response.data.access_token) {
        console.log('访问令牌获取成功')
            resolve({
          success: true,
          access_token: response.data.access_token
            })
          } else {
            const errorMsg = response.data?.error_description || response.data?.error || '获取访问令牌失败'
            console.error('访问令牌获取失败:', errorMsg, response.data)
            resolve({
        success: false,
              error: errorMsg
            })
          }
        },
        fail: (error) => {
          console.error('获取百度云访问令牌请求失败:', error)
          console.error('访问令牌请求错误详情:', {
            errMsg: error.errMsg,
            statusCode: error.statusCode,
            data: error.data
          })
          resolve({
        success: false,
            error: '网络请求失败: ' + (error.errMsg || '未知错误')
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
   * 检查API状态
   */
  async checkAPIStatus() {
    const testMessages = [
      {
        role: 'user',
        content: '测试连接'
      }
    ]
    
    const result = await this.sendRequest(testMessages, { max_tokens: 10 })
    return result
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
      
      // 2. 将图片文件转换为base64
      const base64Image = await this.imageToBase64(imagePath)
      
      // 3. 调用百度云OCR API
      const result = await this.callBaiduOCRAPI(tokenResult.access_token, base64Image)
      
      if (result.success) {
          return {
            success: true,
          text: result.text
          }
        } else {
          return {
          success: false,
          error: result.error
        }
      }
    } catch (error) {
      console.error('OCR识别异常:', error)
        return {
        success: false,
        error: 'OCR识别异常: ' + error.message
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
          console.log('百度云OCR响应:', response)
          
          if (response.statusCode === 200 && response.data) {
            if (response.data.words_result && response.data.words_result.length > 0) {
              // 提取所有识别出的文字
              const texts = response.data.words_result.map(item => item.words)
              const text = texts.join('\n')
              
              console.log('OCR识别成功:', text)
              resolve({
                success: true,
                text: text
              })
            } else {
        resolve({
          success: false,
                error: '图片中未识别到文字'
              })
            }
          } else {
            const errorMsg = response.data?.error_msg || 'OCR识别失败'
            resolve({
              success: false,
              error: errorMsg
            })
          }
        },
        fail: (error) => {
          console.error('OCR请求失败:', error)
          resolve({
            success: false,
            error: 'OCR请求失败: ' + (error.errMsg || '未知错误')
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