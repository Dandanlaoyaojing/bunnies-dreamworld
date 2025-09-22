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
    try {
      const response = await wx.request({
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
          stream: false
        }
      })

      if (response.statusCode === 200) {
        return {
          success: true,
          data: response.data
        }
      } else {
        console.error('API请求失败:', response)
        return {
          success: false,
          error: response.data?.error?.message || 'API请求失败'
        }
      }
    } catch (error) {
      console.error('AI服务错误:', error)
      return {
        success: false,
        error: error.message || '网络请求失败'
      }
    }
  }

  /**
   * 智能标签生成
   */
  async generateTags(content, category = '') {
    const prompt = `请分析以下文本内容，生成3-5个相关的标签。标签应该简洁明了，用中文，不超过4个字。

文本内容：${content}
分类：${category}

请只返回标签，用逗号分隔，不要其他解释。例如：艺术,创作,灵感`

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ]

    const result = await this.sendRequest(messages, { temperature: 0.3 })
    
    if (result.success && result.data.choices && result.data.choices[0]) {
      const tagsText = result.data.choices[0].message.content.trim()
      const tags = tagsText.split(',').map(tag => tag.trim()).filter(tag => tag.length > 0)
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
   * 内容智能分析
   */
  async analyzeContent(content) {
    const prompt = `请分析以下文本内容，提供以下信息：
1. 内容类型（如：日记、创意想法、学习笔记等）
2. 情感色彩（积极/消极/中性）
3. 关键词（3-5个最重要的词）
4. 建议（如果有的话）

文本内容：${content}

请用JSON格式返回，包含type, emotion, keywords, suggestion字段。`

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ]

    const result = await this.sendRequest(messages)
    
    if (result.success && result.data.choices && result.data.choices[0]) {
      try {
        const analysisText = result.data.choices[0].message.content
        // 尝试解析JSON
        const analysis = JSON.parse(analysisText)
        return {
          success: true,
          analysis: analysis
        }
      } catch (parseError) {
        // 如果不是有效JSON，返回原始文本
        return {
          success: true,
          analysis: {
            type: '未知',
            emotion: '中性',
            keywords: [],
            suggestion: analysisText
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
   * 语音转文字（需要结合微信语音识别API）
   */
  async speechToText(audioPath) {
    // 这里需要先调用微信的语音识别API，然后将结果发送给AI进行优化
    return new Promise((resolve) => {
      wx.getRecorderManager().stop()
      
      // 模拟语音识别结果，实际应用中需要调用微信的语音识别API
      setTimeout(() => {
        resolve({
          success: true,
          text: '这是语音转文字的结果，实际应用中需要集成微信语音识别API'
        })
      }, 2000)
    })
  }

  /**
   * 图片OCR文字识别
   */
  async imageToText(imagePath) {
    const prompt = `请识别并提取图片中的所有文字内容，保持原有的格式和段落结构。

请只返回提取的文字内容，不要添加任何解释或其他文字。`

    // 注意：这里需要先将图片转换为base64格式
    // 由于微信小程序的限制，可能需要使用第三方OCR服务
    
    return {
      success: false,
      error: '图片OCR功能需要集成第三方服务，如腾讯云OCR、百度OCR等'
    }
  }

  /**
   * 智能写作助手
   */
  async writingAssistant(content, prompt) {
    const messages = [
      {
        role: 'system',
        content: '你是一个智能写作助手，帮助用户改进和完善文本内容。'
      },
      {
        role: 'user',
        content: `${prompt}\n\n原文：${content}`
      }
    ]

    const result = await this.sendRequest(messages)
    
    if (result.success && result.data.choices && result.data.choices[0]) {
      return {
        success: true,
        result: result.data.choices[0].message.content
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
    const prompt = `请为以下内容生成一个简洁的摘要，控制在50字以内：

${content}`

    const messages = [
      {
        role: 'user',
        content: prompt
      }
    ]

    const result = await this.sendRequest(messages, { temperature: 0.3 })
    
    if (result.success && result.data.choices && result.data.choices[0]) {
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
}

// 创建单例实例
const aiService = new AIService()

module.exports = aiService
