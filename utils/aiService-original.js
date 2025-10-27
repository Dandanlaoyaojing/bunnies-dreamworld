// utils/aiService.js - AI服务模块（通过后端API）
const apiConfig = require('./apiConfig.js')

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
   * 发送请求到后端AI API
   */
  async sendRequest(messages, options = {}) {
    return new Promise((resolve) => {
      console.log('发送后端AI请求:', { messages, options })
      
      const endpoint = options.endpoint || this.endpoints.AI_GENERATE_TAGS
      const url = `${this.baseURL}${endpoint}`
      
        wx.request({
        url: url,
        method: 'POST',
        header: {
          'Content-Type': 'application/json'
        },
        data: {
          messages: messages,
          model: options.model || 'deepseek-chat',
          temperature: options.temperature || 0.7,
          max_tokens: options.max_tokens || 1000,
          stream: options.stream || false,
          ...options
        },
        timeout: 30000,
        success: (response) => {
          console.log('后端AI响应成功:', response)
          if (response.statusCode === 200) {
              resolve({
              success: true,
              data: response.data
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
   * 智能标签生成（通过后端API）
   */
  async generateSmartTags(content, category = '') {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    try {
      // 使用后端API生成标签
      const result = await this.sendRequest([], {
        endpoint: this.endpoints.AI_GENERATE_TAGS,
        content: content,
        category: category,
        type: 'smart_tags'
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
      console.error('智能标签生成失败:', error)
      // 使用本地备用方案
      return this.generateLocalTags(content, category)
    }
  }
        tags: tags.slice(0, 5) // 最多返回5个标签
      }
    }
    
    // AI调用失败，使用本地备选方案
    console.log('🔄 AI调用失败，使用本地备选方案')
    return this.generateLocalTags(content, category)
  }

  /**
   * 验证标签是否在原文中出现
   */
  isValidTag(tag, content) {
    if (!tag || !content) return false
    
    // 检查标签是否在原文中出现
    const tagInContent = content.includes(tag)
    
    // 检查标签是否为原文中词汇的一部分
    const words = content.split(/[\s\n\r\t，。！？；：""''（）【】]/)
    const tagInWords = words.some(word => word.includes(tag) || tag.includes(word))
    
    return tagInContent || tagInWords
  }

  /**
   * 本地标签生成备选方案
   */
  generateLocalTags(content, category = '') {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    console.log('🔄 使用本地标签生成备选方案')
    
    // 从内容中提取关键词
    const words = content.split(/[\s\n\r\t，。！？；：""''（）【】]/)
      .filter(word => word.length >= 2 && word.length <= 6)
      .filter(word => !this.isCommonWord(word))
      .filter(word => this.isValidTag(word, content))
    
    // 去重并限制数量
    const uniqueWords = [...new Set(words)]
    let tags = uniqueWords.slice(0, 5)
    
    // 如果提取的标签太少，添加一些基于分类的默认标签
    if (tags.length < 3) {
      const defaultTags = this.getDefaultTagsByCategory(category)
      const additionalTags = defaultTags.filter(tag => !tags.includes(tag))
      tags = [...tags, ...additionalTags].slice(0, 5)
    }
    
    console.log('本地生成的标签:', tags)
    
        return {
          success: true,
      tags: tags,
      source: 'local'
    }
  }

  /**
   * 根据分类获取默认标签
   */
  getDefaultTagsByCategory(category) {
    const categoryTags = {
      'art': ['艺术', '创作', '美学', '色彩', '设计'],
      'cute': ['可爱', '萌物', '治愈', '温馨', '萌宠'],
      'dreams': ['梦境', '奇幻', '想象', '超现实', '幻想'],
      'foods': ['美食', '料理', '味道', '烹饪', '食材'],
      'happiness': ['快乐', '趣事', '幽默', '回忆', '开心'],
      'knowledge': ['知识', '学习', '智慧', '成长', '教育'],
      'sights': ['风景', '旅行', '自然', '美景', '摄影'],
      'thinking': ['思考', '哲学', '感悟', '人生', '智慧']
    }
    
    return categoryTags[category] || ['笔记', '记录', '生活']
  }

  /**
   * 获取分类上下文信息
   */
  getCategoryContext(category) {
    const categoryMap = {
      'art': '内容分类：艺术创作类 - 重点关注艺术、美学、创作、色彩、构图等标签',
      'cute': '内容分类：萌物可爱类 - 重点关注可爱、萌物、治愈、温馨等标签',
      'dreams': '内容分类：梦境幻想类 - 重点关注梦境、奇幻、想象、超现实等标签',
      'foods': '内容分类：美食料理类 - 重点关注美食、料理、味道、烹饪等标签',
      'happiness': '内容分类：趣事快乐类 - 重点关注快乐、趣事、幽默、回忆等标签',
      'knowledge': '内容分类：知识学习类 - 重点关注知识、学习、智慧、成长等标签',
      'sights': '内容分类：风景旅行类 - 重点关注风景、旅行、自然、美景等标签',
      'thinking': '内容分类：思考感悟类 - 重点关注思考、哲学、感悟、人生等标签'
    }
    
    return categoryMap[category] || '内容分类：通用类 - 根据内容特点生成相关标签'
  }

  /**
   * 过滤常见词汇
   */
  isCommonWord(word) {
    const commonWords = [
      // 空洞内容词汇
      '内容', '文本', '文章', '笔记', '记录', '信息', '数据', '文字', '材料',
      '资料', '文档', '文件', '报告', '总结', '概述', '介绍', '说明', '描述',
      
      // 无意义修饰词
      '这个', '那个', '一个', '一些', '很多', '非常', '特别', '比较', '相当',
      '十分', '极其', '相当', '比较', '更加', '非常', '特别', '尤其', '格外',
      
      // 宽泛概念词
      '时候', '地方', '方面', '问题', '情况', '事情', '东西', '结果', '效果',
      '影响', '作用', '意义', '价值', '重要性', '特点', '特征', '性质', '本质',
      
      // 通用动词
      '进行', '实现', '完成', '达到', '获得', '取得', '得到', '拥有', '具有',
      '存在', '发生', '出现', '产生', '形成', '建立', '发展', '变化', '改变',
      
      // 空洞形容词
      '好的', '坏的', '大的', '小的', '新的', '旧的', '高的', '低的', '长的', '短的',
      '重要的', '有用的', '有效的', '正确的', '错误的', '合适的', '适当的',
      
      // 无意义连接词
      '以及', '还有', '另外', '此外', '同时', '然后', '接着', '最后', '总之',
      
      // 技术相关宽泛词汇
      '技术', '方法', '学习', '知识', '了解', '掌握', '使用', '应用', '有效', '不错', '有趣'
    ]
    return commonWords.includes(word)
  }

  /**
   * 生成初始标签（通过后端API）
   */
  async generateInitialTags(content, category = '') {
    if (!content || content.trim().length < 3) {
    return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    try {
      // 使用后端API生成初始标签
      const result = await this.sendRequest([], {
        endpoint: this.endpoints.AI_GENERATE_TAGS,
        content: content,
        category: category,
        type: 'initial_tags'
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

    const systemPrompt = `你是一个专业的智能标签生成助手，专门从原文中提取具体、准确的关键词作为标签。

## 核心任务
从文本中提取3-5个最有价值的关键标签，**必须优先选择原文中直接出现的具体词汇**。

## 严格规则
1. **数量限制**：必须生成3-5个标签，不能多也不能少
2. **字符限制**：每个标签不超过4个中文字符
3. **原文优先原则**：**至少80%的标签必须是原文中直接出现的具体词汇**
4. **具体性要求**：标签必须是具体的名词、专业术语、关键概念，不能是抽象概括
5. **禁止词汇**：严禁使用以下类型的词汇：
   - 空洞词汇：内容、信息、东西、情况、问题、时候、地方、方面、知识、学习、技术、方法
   - 修饰词汇：这个、那个、一个、一些、很多、非常、特别、比较、重要、有用、有效
   - 通用动词：进行、实现、完成、达到、获得、取得、得到、了解、掌握、使用、应用
   - 宽泛形容词：好的、坏的、重要的、有用的、有效的、正确的、有趣的、不错的
6. **输出格式**：只返回标签，用逗号分隔，不要任何解释或说明

## 标签选择优先级（按重要性排序）
1. **原文专业术语**：技术名词、产品名称、品牌名称、专业概念
2. **原文具体名词**：人名、地名、机构名、工具名、材料名
3. **原文关键概念**：具体的方法、技术、理论、流程名称
4. **原文具体描述**：具体的事物、现象、过程、结果
5. **避免概括性词汇**：绝对不要用"技术"、"方法"、"内容"、"学习"等宽泛词汇

## 重要提醒
- 必须从原文中直接提取具体词汇，不要自己概括
- 每个标签都应该是原文中实际出现的词汇
- 如果原文中没有足够的专业术语，宁可少生成标签也不要生成抽象词汇`

    const categoryContext = this.getCategoryContext(category)
    
    const userPrompt = `请严格按照规则分析以下文本，生成3-5个精准标签。

## 分析要求
1. **逐字逐句分析**：仔细阅读文本，识别原文中的具体词汇和关键概念
2. **原文关键词提取**：从文本中直接提取至少80%数量的具体词汇作为标签
3. **具体性优先**：优先选择原文中出现的专业术语、人名、地名、产品名、概念名
4. **严格避免概括**：绝对不要用"技术"、"方法"、"内容"、"学习"等宽泛词汇
5. **确保准确性**：每个标签都必须是原文中实际出现的具体词汇

## 输出要求
- 必须生成3-5个标签，不能少于3个
- 每个标签不超过4个中文字符
- 用逗号分隔，不要其他内容
- 示例格式：Python,scikit-learn,随机森林,房价预测（都是原文中的具体词汇）

${categoryContext}

## 待分析文本
${content}

## 标签生成结果（必须3-5个标签，80%以上来自原文具体词汇）`

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
      temperature: 0.4,
      max_tokens: 100
    })
    
    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      const tagsText = result.data.choices[0].message.content.trim()
      console.log('AI生成的初始标签文本:', tagsText)
      
      // 清理标签文本，移除可能的引号或其他符号
      const cleanTags = tagsText.replace(/[""'']/g, '').replace(/[。，！？]/g, ',')
      const tags = cleanTags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length <= 6)
        .filter(tag => !this.isCommonWord(tag)) // 过滤常见词汇
        .filter(tag => this.isValidTag(tag, content)) // 验证标签是否在原文中
      
      console.log('处理后的初始标签:', tags)
      
      // 如果AI生成的标签为空或太少，使用本地备选方案
      if (tags.length === 0) {
        console.log('🔄 AI初始标签生成失败，使用本地备选方案')
        return this.generateLocalTags(content, category)
      }
      
      return {
        success: true,
        tags: tags.slice(0, 5) // 最多返回5个初始标签
      }
    }
    
    // AI调用失败，使用本地备选方案
    console.log('🔄 AI初始标签调用失败，使用本地备选方案')
    return this.generateLocalTags(content, category)
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

    const systemPrompt = `你是一个专业的智能标签生成助手，专门为用户生成追加标签。

你的任务是根据内容生成3个新的、不重复的中文标签，与已有标签形成补充。

标签生成原则：
1. 新颖性：生成与已有标签不同的新标签
2. 准确性：标签必须与内容高度相关
3. 简洁性：每个标签不超过4个字符
4. 多样性：从不同角度补充内容标签
5. 避免重复：不要生成与已有标签相同或相似的标签`

    const categoryContext = this.getCategoryContext(category)
    const existingTagsText = existingTags.length > 0 ? `已有标签：${existingTags.join('、')}` : '暂无已有标签'
    
    const userPrompt = `请分析以下内容，生成3个新的、不重复的标签。

要求：
1. 标签使用中文，简洁明了，每个标签不超过4个字
2. 生成与已有标签不同的新标签
3. 从不同角度补充内容标签（如情感、风格、细节、主题、类型等）
4. 只返回标签，用逗号分隔，不要其他解释
5. 示例格式：浪漫,细腻,传统

${categoryContext}

${existingTagsText}

内容：
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
      temperature: 0.6,
      max_tokens: 100
    })
    
    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      const tagsText = result.data.choices[0].message.content.trim()
      console.log('AI生成的追加标签文本:', tagsText)
      
      // 清理标签文本，移除可能的引号或其他符号
      const cleanTags = tagsText.replace(/[""'']/g, '').replace(/[。，！？]/g, ',')
      const tags = cleanTags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length <= 6)
        .filter(tag => !this.isCommonWord(tag)) // 过滤常见词汇
        .filter(tag => !existingTags.includes(tag)) // 过滤已有标签
      
      console.log('处理后的追加标签:', tags)
      
      // 如果AI生成的标签为空或太少，使用本地备选方案
      if (tags.length === 0) {
        console.log('🔄 AI追加标签生成失败，使用本地备选方案')
        return this.generateLocalTags(content, category)
      }
      
      return {
        success: true,
        tags: tags.slice(0, 3) // 固定返回3个追加标签
      }
    }
    
    // AI调用失败，使用本地备选方案
    console.log('🔄 AI追加标签调用失败，使用本地备选方案')
    return this.generateLocalTags(content, category)
  }

  /**
   * 重试生成追加标签（使用更高temperature）
   */
  async generateAdditionalTagsWithRetry(content, category = '', existingTags = []) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    const systemPrompt = `你是一个专业的智能标签生成助手，专门为用户生成追加标签。

你的任务是根据内容生成3个新的、不重复的中文标签，与已有标签形成补充。

标签生成原则：
1. 新颖性：生成与已有标签不同的新标签
2. 准确性：标签必须与内容高度相关
3. 简洁性：每个标签不超过4个字符
4. 多样性：从不同角度补充内容标签
5. 避免重复：不要生成与已有标签相同或相似的标签
6. 创造性：尝试从更独特的角度生成标签`

    const categoryContext = this.getCategoryContext(category)
    const existingTagsText = existingTags.length > 0 ? `已有标签：${existingTags.join('、')}` : '暂无已有标签'
    
    const userPrompt = `请分析以下内容，生成3个新的、不重复的标签。

要求：
1. 标签使用中文，简洁明了，每个标签不超过4个字
2. 生成与已有标签不同的新标签
3. 从不同角度补充内容标签（如情感、风格、细节、主题、类型、场景、氛围等）
4. 尝试从更独特的角度思考，避免常见的标签
5. 只返回标签，用逗号分隔，不要其他解释
6. 示例格式：浪漫,细腻,传统

${categoryContext}

${existingTagsText}

内容：
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
      temperature: 0.8,  // 更高的temperature增加创造性
      max_tokens: 120
    })
    
    if (result.success && result.data && result.data.choices && result.data.choices[0]) {
      const tagsText = result.data.choices[0].message.content.trim()
      console.log('AI生成的重试标签文本:', tagsText)
      
      // 清理标签文本，移除可能的引号或其他符号
      const cleanTags = tagsText.replace(/[""'']/g, '').replace(/[。，！？]/g, ',')
      const tags = cleanTags.split(',')
        .map(tag => tag.trim())
        .filter(tag => tag.length > 0 && tag.length <= 6)
        .filter(tag => !this.isCommonWord(tag)) // 过滤常见词汇
        .filter(tag => !existingTags.includes(tag)) // 过滤已有标签
      
      console.log('处理后的重试标签:', tags)
      
      // 如果AI生成的标签为空或太少，使用本地备选方案
      if (tags.length === 0) {
        console.log('🔄 AI重试标签生成失败，使用本地备选方案')
        return this.generateLocalTags(content, category)
      }
      
      return {
        success: true,
        tags: tags.slice(0, 3) // 固定返回3个追加标签
      }
    }
    
    // AI调用失败，使用本地备选方案
    console.log('🔄 AI重试标签调用失败，使用本地备选方案')
    return this.generateLocalTags(content, category)
  }

  /**
   * 智能标签生成（兼容旧版本）
   */
  async generateTags(content, category = '') {
    return this.generateSmartTags(content, category)
  }

  /**
   * 图片转文字（通过后端API）
   */
  async imageToText(imagePath) {
    try {
      console.log('开始OCR识别:', imagePath)
      
      // 优先使用后端API进行OCR
      const result = await this.sendRequest([], {
        endpoint: this.endpoints.AI_ANALYZE_CONTENT,
        imagePath: imagePath,
        type: 'ocr'
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
   * 调用微信小程序OCR（已移除，因为wx.ocr不存在）
   * 现在直接使用百度云OCR
   */
  async callWeChatOCR(imagePath) {
    console.log('微信OCR不可用，请使用百度云OCR')
      return {
        success: false,
      error: '微信OCR不可用',
      text: ''
    }
  }

  /**
   * 调用百度云OCR（主要方案，带重试机制）
   */
  async callBaiduOCR(imagePath, retryCount = 0) {
    const maxRetries = 2
    const retryDelay = 1000 // 1秒
    
    try {
      console.log(`尝试百度云OCR (第${retryCount + 1}次):`, imagePath)
      
      // 百度云OCR配置 - 支持多种配置方式
      let baiduConfig = null
      
      // 1. 优先使用配置文件
      if (baiduOCRConfig && baiduOCRConfig.baiduOCR) {
        baiduConfig = baiduOCRConfig.baiduOCR
      }
      
      // 2. 尝试从环境配置获取
      if (!baiduConfig || baiduConfig.apiKey === 'your-baidu-api-key-here') {
        try {
          const envConfig = require('./envConfig.js')
          const envBaiduKey = envConfig.getApiKey('baidu')
          if (envBaiduKey && envBaiduKey !== 'dev-baidu-key-here') {
            baiduConfig = {
              apiKey: envBaiduKey,
              secretKey: 'your-secret-key', // 需要单独配置
              baseUrl: 'https://aip.baidubce.com'
            }
          }
        } catch (error) {
          console.log('环境配置加载失败:', error)
        }
      }
      
      // 3. 使用默认配置
      if (!baiduConfig || baiduConfig.apiKey === 'your-baidu-api-key-here') {
        baiduConfig = {
          apiKey: 'your-baidu-api-key-here',
          secretKey: 'your-baidu-secret-key-here',
          baseUrl: 'https://aip.baidubce.com'
        }
      }
      
      // 检查配置是否完整
      if (!baiduConfig.apiKey || baiduConfig.apiKey === 'your-baidu-api-key-here') {
        console.warn('百度云OCR未配置，请设置API Key和Secret Key')
        return {
          success: false,
          error: '百度云OCR未配置，请检查API密钥设置',
          text: ''
        }
      }
      
      // 1. 获取access_token
      const accessToken = await this.getBaiduAccessToken(baiduConfig)
      if (!accessToken) {
        return {
          success: false,
          error: '获取百度云access_token失败',
          text: ''
        }
      }
      
      // 2. 调用OCR接口
      const ocrResult = await this.callBaiduOCRAPI(imagePath, accessToken, baiduConfig.baseUrl)
      
      if (ocrResult.success) {
          return {
            success: true,
          text: ocrResult.text,
          confidence: ocrResult.confidence || 0.9,
          source: 'baidu'
        }
      } else {
        // 网络错误时重试
        if (retryCount < maxRetries && (ocrResult.error.includes('网络') || ocrResult.error.includes('timeout'))) {
          console.log(`OCR失败，${retryDelay}ms后重试 (${retryCount + 1}/${maxRetries})`)
          await new Promise(resolve => setTimeout(resolve, retryDelay))
          return this.callBaiduOCR(imagePath, retryCount + 1)
      }
    
        return {
        success: false,
          error: ocrResult.error || '百度云OCR识别失败',
          text: ''
        }
      }
    } catch (error) {
      console.error('百度云OCR失败:', error)
      
      // 网络错误时重试
      if (retryCount < maxRetries && (error.message.includes('网络') || error.message.includes('timeout'))) {
        console.log(`OCR异常，${retryDelay}ms后重试 (${retryCount + 1}/${maxRetries})`)
        await new Promise(resolve => setTimeout(resolve, retryDelay))
        return this.callBaiduOCR(imagePath, retryCount + 1)
      }
      
      return {
        success: false,
        error: error.message || '百度云OCR调用失败',
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
      const params = {
        grant_type: 'client_credentials',
        client_id: config.apiKey,
        client_secret: config.secretKey
      }
      
      wx.request({
        url: tokenUrl,
        method: 'POST',
        data: params,
        success: (res) => {
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
   * 清理OCR识别结果
   */
  cleanOCRText(text) {
    if (!text) return ''
    
    // 移除多余的空白字符
    let cleaned = text.replace(/\s+/g, ' ').trim()
    
    // 移除特殊字符
    cleaned = cleaned.replace(/[^\u4e00-\u9fa5a-zA-Z0-9\s，。！？；：""''（）【】]/g, '')
    
    // 格式化段落
    cleaned = cleaned.replace(/([。！？])\s*([^。！？])/g, '$1\n$2')
    
    return cleaned
  }
}

// 创建单例实例
const aiService = new AIService()

module.exports = aiService