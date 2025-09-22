// utils/aiService.js - AI服务模块
const API_KEY = "sk-7f977e073d1a431caf8a7b87674fd22a"
const API_URL = "https://api.deepseek.com/v1/chat/completions"

class AIService {
  constructor() {
    this.apiKey = API_KEY
    this.baseURL = API_URL
  }

  /**
   * 发送请求到DeepSeek API
   */
  async sendRequest(messages, options = {}) {
    return new Promise((resolve) => {
      console.log('发送API请求:', { messages, options })
      
      wx.request({
        url: this.baseURL,
        method: 'POST',
        header: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        data: {
          model: options.model || 'deepseek-chat',
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: options.stream || false
        },
        timeout: 15000,
        success: (response) => {
          console.log('API响应成功:', response)
          if (response.statusCode === 200) {
            resolve({
              success: true,
              data: response.data
            })
          } else if (response.statusCode === 402) {
            console.warn('API配额不足:', response)
            resolve({
              success: false,
              error: 'API配额不足，请检查账户状态',
              code: 402
            })
          } else if (response.statusCode === 401) {
            console.warn('API密钥无效:', response)
            resolve({
              success: false,
              error: 'API密钥无效，请检查配置',
              code: 401
            })
          } else {
            console.error('API请求失败:', response)
            resolve({
              success: false,
              error: response.data?.error?.message || `API请求失败 (${response.statusCode})`,
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
   * 智能标签生成
   */
  async generateTags(content, category = '') {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    const systemPrompt = "你是一个专业的标签生成助手。你的任务是根据文本内容生成简洁、准确的中文标签。"
    
    const userPrompt = `请分析以下文本内容，生成3-5个相关的标签。

要求：
1. 标签使用中文，简洁明了，不超过4个字
2. 标签要与内容高度相关
3. 只返回标签，用逗号分隔，不要其他解释
4. 示例格式：艺术,创作,灵感

文本内容：${content}
${category ? `内容分类：${category}` : ''}`

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]

    const result = await this.sendRequest(messages, { 
      temperature: 0.3,
      max_tokens: 100
    })
    
    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      const tagsText = result.data.choices[0].message.content.trim()
      // 清理标签文本，移除可能的引号或其他符号
      const cleanTags = tagsText.replace(/[""'']/g, '')
      const tags = cleanTags.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0 && tag.length <= 6)
      return {
        success: true,
        tags: tags.slice(0, 5) // 最多返回5个标签
      }
    }
    
    return {
      success: false,
      error: result.error || '标签生成失败'
    }
  }

  /**
   * 语音转文字（使用微信原生语音识别API）
   */
  async speechToText() {
    return new Promise((resolve) => {
      // 首先申请录音权限
      wx.authorize({
        scope: 'scope.record',
        success() {
          // 权限申请成功，开始语音识别
          wx.startSot({
            lang: 'zh_CN', // 识别语言，中文
            success(res) {
              console.log('语音识别成功:', res)
              resolve({
                success: true,
                text: res.result || res.text || '语音识别成功'
              })
            },
            fail(error) {
              console.error('语音识别失败:', error)
              resolve({
                success: false,
                error: error.errMsg || '语音识别失败'
              })
            }
          })
        },
        fail() {
          // 权限申请失败
          wx.showModal({
            title: '权限申请',
            content: '需要录音权限才能使用语音功能，请在设置中开启',
            showCancel: false,
            confirmText: '确定'
          })
          resolve({
            success: false,
            error: '录音权限被拒绝'
          })
        }
      })
    })
  }

  /**
   * 智能写作助手
   */
  async writingAssistant(content, prompt) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法进行写作辅助'
      }
    }

    const systemPrompt = "你是一个专业的写作助手，具有丰富的文学和语言表达能力。你的任务是帮助用户改进和完善文本内容，使其更加生动、准确和富有表现力。"
    
    const userPrompt = `${prompt}

原文内容：
${content}

请直接提供改进后的文本，不需要额外的解释。`

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]

    const result = await this.sendRequest(messages, {
      temperature: 0.6,
      max_tokens: 1500
    })
    
    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      return {
        success: true,
        result: result.data.choices[0].message.content.trim()
      }
    }
    
    return {
      success: false,
      error: result.error || '写作助手失败'
    }
  }

  /**
   * 智能摘要生成
   */
  async generateSummary(content) {
    if (!content || content.trim().length < 10) {
      return {
        success: false,
        error: '内容太短，无法生成摘要'
      }
    }

    const systemPrompt = "你是一个专业的摘要生成助手，擅长提取文本的核心要点并生成简洁准确的摘要。"
    
    const userPrompt = `请为以下内容生成一个简洁的摘要：

要求：
1. 摘要控制在50字以内
2. 突出核心要点和关键信息
3. 保持原意，语言简洁明了
4. 直接返回摘要内容，不要额外解释

原文内容：
${content}`

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]

    const result = await this.sendRequest(messages, { 
      temperature: 0.3,
      max_tokens: 100
    })
    
    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      return {
        success: true,
        summary: result.data.choices[0].message.content.trim()
      }
    }
    
    return {
      success: false,
      error: result.error || '摘要生成失败'
    }
  }

  /**
   * 内容智能分析
   */
  async analyzeContent(content) {
    if (!content || content.trim().length < 5) {
      return {
        success: false,
        error: '内容太短，无法进行分析'
      }
    }

    const systemPrompt = "你是一个专业的内容分析助手，擅长分析文本的情感、类型和关键词。"
    
    const userPrompt = `请分析以下文本内容，并以JSON格式返回分析结果：

{
  "type": "内容类型（如：日记、创意想法、学习笔记、工作计划等）",
  "emotion": "情感色彩（积极/消极/中性）",
  "keywords": ["关键词1", "关键词2", "关键词3"],
  "suggestion": "改进建议（可选）"
}

文本内容：${content}`

    const messages = [
      {
        role: 'system',
        content: systemPrompt
      },
      {
        role: 'user',
        content: userPrompt
      }
    ]

    const result = await this.sendRequest(messages, {
      temperature: 0.3,
      max_tokens: 300
    })
    
    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      try {
        const analysisText = result.data.choices[0].message.content.trim()
        // 尝试提取JSON部分
        const jsonMatch = analysisText.match(/\{[\s\S]*\}/)
        if (jsonMatch) {
          const analysis = JSON.parse(jsonMatch[0])
          return {
            success: true,
            analysis: {
              type: analysis.type || '未知',
              emotion: analysis.emotion || '中性',
              keywords: Array.isArray(analysis.keywords) ? analysis.keywords : [],
              suggestion: analysis.suggestion || '暂无建议'
            }
          }
        } else {
          // 如果不是有效JSON，返回结构化文本
          return {
            success: true,
            analysis: {
              type: '文本内容',
              emotion: '中性',
              keywords: [],
              suggestion: analysisText
            }
          }
        }
      } catch (parseError) {
        console.warn('JSON解析失败:', parseError)
        return {
          success: true,
          analysis: {
            type: '文本内容',
            emotion: '中性',
            keywords: [],
            suggestion: '内容分析完成'
          }
        }
      }
    }
    
    return {
      success: false,
      error: result.error || '内容分析失败'
    }
  }

  /**
   * 图片OCR文字识别
   */
  async imageToText(imagePath) {
    return new Promise((resolve) => {
      // 微信小程序没有官方的wx.ocr API
      // 需要使用第三方OCR服务或微信云开发
      
      console.log('开始图片OCR识别:', imagePath)
      
      // 方案1：尝试使用微信云开发OCR（如果已开通）
      this.tryCloudOCR(imagePath).then(result => {
        if (result.success) {
          resolve(result)
        } else {
          // 方案2：降级到模拟识别
          console.log('云开发OCR不可用，使用模拟识别')
          this.simulateImageOCR(imagePath).then(resolve)
        }
      }).catch(() => {
        // 方案3：最终降级到模拟识别
        console.log('OCR服务不可用，使用模拟识别')
        this.simulateImageOCR(imagePath).then(resolve)
      })
    })
  }

  /**
   * 尝试使用微信云开发OCR
   */
  async tryCloudOCR(imagePath) {
    return new Promise((resolve) => {
      // 检查是否初始化了云开发
      if (typeof wx.cloud === 'undefined') {
        resolve({
          success: false,
          error: '云开发未初始化'
        })
        return
      }

      // 使用云开发的OCR功能
      wx.cloud.callFunction({
        name: 'ocr', // 需要创建对应的云函数
        data: {
          imagePath: imagePath
        },
        success: (res) => {
          console.log('云开发OCR成功:', res)
          if (res.result && res.result.success) {
            resolve({
              success: true,
              text: res.result.text
            })
          } else {
            resolve({
              success: false,
              error: res.result?.error || '云开发OCR失败'
            })
          }
        },
        fail: (error) => {
          console.error('云开发OCR失败:', error)
          resolve({
            success: false,
            error: error.errMsg || '云开发OCR调用失败'
          })
        }
      })
    })
  }

  /**
   * 模拟图片OCR识别
   */
  async simulateImageOCR(imagePath) {
    return new Promise((resolve) => {
      setTimeout(() => {
        // 模拟识别过程，提供更有用的演示内容
        const mockText = `[图片识别演示结果]

📝 识别到的文字内容：
• 这是一段演示文字
• 展示图片OCR功能的效果
• 实际使用时将识别真实图片中的文字

🔧 技术说明：
当前使用模拟识别功能，为演示和测试目的。
在生产环境中，建议集成以下OCR服务：

1. 微信云开发OCR（推荐）
   - 与微信生态集成度最高
   - 配置简单，使用便捷

2. 腾讯云OCR
   - 识别准确率高
   - 支持多种文档类型

3. 百度智能云OCR
   - 性价比高
   - 支持批量处理

4. 阿里云OCR
   - 功能丰富
   - 支持复杂场景

💡 集成提示：
要启用真实OCR功能，请联系开发团队配置相应的API密钥和服务。`
        
        resolve({
          success: true,
          text: mockText
        })
      }, 2000)
    })
  }

  /**
   * 使用AI描述图片内容
   */
  async describeImageWithAI(imagePath) {
    // 这里可以实现使用AI API进行图片内容描述
    // 由于需要将图片转换为base64并发送给AI，暂时返回提示信息
    return {
      success: false,
      error: '图片OCR功能开发中，请稍后使用'
    }
  }

  /**
   * 检查API状态
   */
  async checkAPIStatus() {
    const testMessages = [
      {
        role: 'user',
        content: '测试'
      }
    ]

    const result = await this.sendRequest(testMessages, { max_tokens: 10 })
    return result
  }
}

// 创建单例实例
const aiService = new AIService()

module.exports = aiService