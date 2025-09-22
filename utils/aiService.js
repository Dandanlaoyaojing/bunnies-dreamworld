// utils/aiService.js - AI服务模块
const API_KEY = "sk-7f977e073d1a431caf8a7b87674fd22a"
const API_URL = "https://api.deepseek.com/v1/chat/completions"
const BASE_URL = "https://api.deepseek.com"

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
          model: options.model || 'deepseek-chat', // 使用DeepSeek-V3.1
          messages: messages,
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: options.stream || false
        },
        timeout: 15000 // 15秒超时，给AI更多处理时间
      })

      if (response.statusCode === 200) {
        return {
          success: true,
          data: response.data
        }
      } else if (response.statusCode === 402) {
        console.warn('API配额不足或付费问题:', response)
        return {
          success: false,
          error: 'API配额不足，请检查账户状态',
          code: 402
        }
      } else if (response.statusCode === 401) {
        console.warn('API密钥无效:', response)
        return {
          success: false,
          error: 'API密钥无效，请检查配置',
          code: 401
        }
      } else {
        console.error('API请求失败:', response)
        return {
          success: false,
          error: response.data?.error?.message || `API请求失败 (${response.statusCode})`,
          code: response.statusCode
        }
      }
    } catch (error) {
      console.error('AI服务错误:', error)
      return {
        success: false,
        error: error.message || '网络请求失败',
        code: 'NETWORK_ERROR'
      }
    }
  }

  /**
   * 智能标签生成
   */
  async generateTags(content, category = '') {
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
    
    if (result.success && result.data.choices && result.data.choices[0]) {
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
   * 内容智能分析
   */
  async analyzeContent(content) {
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
    
    if (result.success && result.data.choices && result.data.choices[0]) {
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
  },

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
    
    if (result.success && result.data.choices && result.data.choices[0]) {
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
