// utils/tagProcessor.js - 标签处理工具
class TagProcessor {
  /**
   * 处理来源标签 - 按标点符号和空格分割，去重
   * @param {string} source - 来源字符串
   * @returns {Array} 处理后的标签数组
   */
  static processSourceTags(source) {
    if (!source || typeof source !== 'string') {
      return []
    }

    // 先处理书名号，将《》内容作为整体保留
    const bookTitles = []
    const bookTitleRegex = /《([^》]+)》/g
    let match
    while ((match = bookTitleRegex.exec(source)) !== null) {
      bookTitles.push(match[1])
    }
    
    // 用占位符替换书名号内容（使用递增索引保证映射正确）
    let replaceIndex = 0
    let processedSource = source.replace(bookTitleRegex, (match, content) => {
      const index = replaceIndex++
      return `__BOOK_TITLE_${index}__`
    })
    
    // 定义分割符：只分割明显的分隔符，避免分割人名中的点号
    // 使用更保守的分割符，主要分割逗号、分号、冒号等
    const separators = /[，,；;：:、\s\n\r\t]+/
    
    // 按分割符分割字符串
    const rawTags = processedSource.split(separators)
    
    // 恢复书名号内容
    const restoredTags = rawTags.map(tag => {
      if (tag.includes('__BOOK_TITLE_')) {
        const index = parseInt(tag.match(/__BOOK_TITLE_(\d+)__/)?.[1])
        return bookTitles[index] || tag
      }
      return tag
    })
    
    // 清理和过滤标签
    const processedTags = restoredTags
      .map(tag => tag.trim()) // 去除首尾空白
      .filter(tag => tag.length > 0) // 过滤空字符串
      .filter(tag => tag.length <= 20) // 过滤过长的标签
      .filter(tag => !/^[\d\s]+$/.test(tag)) // 过滤纯数字和空格的标签
      .filter(tag => !/^[。.]+$/.test(tag)) // 过滤纯点号
      .filter(tag => !/^[，,；;：:、]+$/.test(tag)) // 过滤纯标点符号
    
    // 去重
    const uniqueTags = [...new Set(processedTags)]
    
    console.log('来源标签处理:', {
      original: source,
      bookTitles: bookTitles,
      processedSource: processedSource,
      rawTags: rawTags,
      restoredTags: restoredTags,
      processedTags: processedTags,
      uniqueTags: uniqueTags
    })
    
    return uniqueTags
  }

  /**
   * 合并标签数组，去重
   * @param {Array} regularTags - 常规标签
   * @param {Array} sourceTags - 来源标签
   * @returns {Array} 合并后的标签数组
   */
  static mergeTags(regularTags = [], sourceTags = []) {
    // 确保输入是数组
    const regular = Array.isArray(regularTags) ? regularTags : []
    const source = Array.isArray(sourceTags) ? sourceTags : []
    
    // 合并并去重
    const allTags = [...regular, ...source]
    const uniqueTags = [...new Set(allTags)]
    
    console.log('标签合并:', {
      regularTags: regular,
      sourceTags: source,
      mergedTags: uniqueTags
    })
    
    return uniqueTags
  }

  /**
   * 检查标签是否为来源标签
   * @param {string} tag - 标签
   * @param {string} source - 来源字符串
   * @returns {boolean} 是否为来源标签
   */
  static isSourceTag(tag, source) {
    if (!tag || !source) return false
    
    // 检查标签是否来源于source字符串
    const sourceTags = this.processSourceTags(source)
    return sourceTags.includes(tag)
  }

  /**
   * 获取标签的CSS类名
   * @param {string} tag - 标签
   * @param {string} source - 来源字符串
   * @returns {string} CSS类名
   */
  static getTagClassName(tag, source) {
    if (this.isSourceTag(tag, source)) {
      return 'source-tag'
    }
    return 'tag'
  }
}

module.exports = TagProcessor
