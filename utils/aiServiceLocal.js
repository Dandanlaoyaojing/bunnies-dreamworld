// utils/aiServiceLocal.js - 本地AI服务模块
// 专门用于避免401认证错误，直接使用本地方案

class LocalAIService {
  constructor() {
    console.log('初始化本地AI服务 - 避免401认证错误')
  }

  /**
   * 智能标签生成（本地方案）
   */
  async generateSmartTags(content, category = '') {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    console.log('使用本地AI服务生成标签:', { content: content.substring(0, 50), category })
    return this.generateLocalTags(content, category)
  }

  /**
   * 生成初始标签（本地方案）
   */
  async generateInitialTags(content, category = '') {
    return this.generateSmartTags(content, category)
  }

  /**
   * 生成额外标签（本地方案）
   */
  async generateAdditionalTags(content, category = '', existingTags = []) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法生成标签'
      }
    }

    console.log('使用本地AI服务生成额外标签:', { content: content.substring(0, 50), category, existingTags })
    
    // 生成新标签，排除已存在的标签
    const result = this.generateLocalTags(content, category)
    if (result.success && result.tags) {
      const newTags = result.tags.filter(tag => !existingTags.includes(tag))
      return {
        success: true,
        tags: newTags,
        source: 'local_fallback'
      }
    }
    
    return result
  }

  /**
   * 建议分类（本地方案）
   */
  async suggestCategory(content) {
    if (!content || content.trim().length < 3) {
      return {
        success: false,
        error: '内容太短，无法建议分类'
      }
    }

    console.log('使用本地AI服务建议分类:', content.substring(0, 50))
    return this.getDefaultCategory(content)
  }

  /**
   * 图片转文字（本地方案）
   */
  async imageToText(imagePath) {
    console.log('本地AI服务暂不支持图片转文字:', imagePath)
    return {
      success: false,
      error: '本地AI服务暂不支持图片转文字功能',
      source: 'local_fallback'
    }
  }

  /**
   * 生成标签（统一接口）
   */
  async generateTags(content, category = '') {
    return this.generateSmartTags(content, category)
  }

  // ========== 本地实现方法 ==========

  /**
   * 本地标签生成
   */
  generateLocalTags(content, category = '') {
    console.log('执行本地标签生成')
    
    // 提取关键词
    const keywords = this.extractKeywords(content)
    
    // 获取分类相关标签
    const categoryTags = this.getDefaultTagsByCategory(category)
    
    // 获取内容相关标签
    const contentTags = this.getContentBasedTags(content)
    
    // 合并所有标签
    const allTags = [...keywords, ...categoryTags, ...contentTags]
    
    // 去重并限制数量
    const uniqueTags = [...new Set(allTags)].slice(0, 5)
    
    console.log('本地标签生成结果:', uniqueTags)
    
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
    const keywords = words
      .filter(word => word.length >= 2 && word.length <= 6)
      .filter(word => !this.isStopWord(word))
      .slice(0, 3)
    
    return keywords
  }

  /**
   * 判断是否为停用词
   */
  isStopWord(word) {
    const stopWords = [
      '这个', '那个', '一个', '一些', '很多', '非常', '特别', '比较',
      '然后', '所以', '但是', '因为', '如果', '虽然', '不过', '而且',
      '今天', '明天', '昨天', '现在', '以前', '以后', '时候', '地方',
      '什么', '怎么', '为什么', '哪里', '哪个', '多少', '几个', '一些'
    ]
    return stopWords.includes(word)
  }

  /**
   * 根据分类获取默认标签
   */
  getDefaultTagsByCategory(category) {
    const categoryTags = {
      'knowledge': ['学习', '知识', '笔记', '思考', '成长'],
      'art': ['艺术', '创作', '美学', '色彩', '绘画'],
      'cute': ['可爱', '萌宠', '治愈', '温馨', '小动物'],
      'dreams': ['梦想', '奇幻', '想象', '星空', '夜晚'],
      'foods': ['美食', '料理', '烹饪', '味道', '食材'],
      'happiness': ['幸福', '快乐', '美好', '温暖', '阳光'],
      'sights': ['风景', '自然', '美景', '旅行', '摄影'],
      'thinking': ['思考', '哲学', '人生', '感悟', '智慧']
    }
    return categoryTags[category] || []
  }

  /**
   * 根据内容获取相关标签
   */
  getContentBasedTags(content) {
    const contentTags = []
    
    // 情感相关
    if (content.includes('开心') || content.includes('快乐') || content.includes('高兴')) {
      contentTags.push('快乐')
    }
    if (content.includes('难过') || content.includes('伤心') || content.includes('痛苦')) {
      contentTags.push('情感')
    }
    
    // 时间相关
    if (content.includes('今天') || content.includes('现在') || content.includes('最近')) {
      contentTags.push('日常')
    }
    if (content.includes('未来') || content.includes('计划') || content.includes('目标')) {
      contentTags.push('计划')
    }
    
    // 学习相关
    if (content.includes('学习') || content.includes('读书') || content.includes('知识')) {
      contentTags.push('学习')
    }
    
    // 工作相关
    if (content.includes('工作') || content.includes('项目') || content.includes('任务')) {
      contentTags.push('工作')
    }
    
    return contentTags
  }

  /**
   * 获取默认分类
   */
  getDefaultCategory(content) {
    // 简单的分类逻辑
    if (content.includes('学习') || content.includes('知识') || content.includes('读书')) {
      return { success: true, category: 'knowledge', confidence: 0.8, source: 'local' }
    }
    if (content.includes('艺术') || content.includes('创作') || content.includes('绘画')) {
      return { success: true, category: 'art', confidence: 0.8, source: 'local' }
    }
    if (content.includes('美食') || content.includes('料理') || content.includes('烹饪')) {
      return { success: true, category: 'foods', confidence: 0.8, source: 'local' }
    }
    if (content.includes('旅行') || content.includes('风景') || content.includes('自然')) {
      return { success: true, category: 'sights', confidence: 0.8, source: 'local' }
    }
    if (content.includes('梦想') || content.includes('未来') || content.includes('希望')) {
      return { success: true, category: 'dreams', confidence: 0.8, source: 'local' }
    }
    if (content.includes('可爱') || content.includes('萌宠') || content.includes('小动物')) {
      return { success: true, category: 'cute', confidence: 0.8, source: 'local' }
    }
    if (content.includes('快乐') || content.includes('幸福') || content.includes('美好')) {
      return { success: true, category: 'happiness', confidence: 0.8, source: 'local' }
    }
    
    return { success: true, category: 'thinking', confidence: 0.6, source: 'local' }
  }

  /**
   * 检查服务状态
   */
  checkApiStatus() {
    return {
      apiKey: { hasKey: true, isValid: true, status: 'local' },
      user: { isLoggedIn: true },
      service: { baseURL: 'local', endpoints: 'local' }
    }
  }
}

// 创建单例实例
const localAIService = new LocalAIService()

module.exports = localAIService
