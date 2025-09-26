// utils/noteManager.js - 统一笔记管理服务
class NoteManager {
  constructor() {
    this.storageKey = 'notes'
    this.tagStorageKey = 'noteTags'
    this.categoryStorageKey = 'noteCategories'
  }

  /**
   * 获取所有笔记
   */
  getAllNotes() {
    try {
      return wx.getStorageSync(this.storageKey) || []
    } catch (error) {
      console.error('获取笔记失败:', error)
      return []
    }
  }

  /**
   * 根据分类获取笔记
   */
  getNotesByCategory(category) {
    const allNotes = this.getAllNotes()
    return allNotes.filter(note => note.category === category)
  }

  /**
   * 根据ID获取单个笔记
   */
  getNoteById(id) {
    const allNotes = this.getAllNotes()
    return allNotes.find(note => note.id === id)
  }

  /**
   * 保存笔记（新增或更新）
   */
  saveNote(note) {
    try {
      const allNotes = this.getAllNotes()
      const existingIndex = allNotes.findIndex(n => n.id === note.id)
      
      if (existingIndex !== -1) {
        // 更新现有笔记
        allNotes[existingIndex] = {
          ...allNotes[existingIndex],
          ...note,
          updateTime: this.formatTime(new Date())
        }
      } else {
        // 新增笔记
        const newNote = {
          ...note,
          id: note.id || this.generateId(),
          createTime: note.createTime || this.formatTime(new Date()),
          updateTime: this.formatTime(new Date())
        }
        allNotes.push(newNote)
      }
      
      wx.setStorageSync(this.storageKey, allNotes)
      
      // 更新标签统计
      this.updateTagStatistics(note.tags || [])
      
      console.log('笔记保存成功:', note.id)
      return { success: true, note: note }
    } catch (error) {
      console.error('保存笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 删除笔记
   */
  deleteNote(id) {
    try {
      const allNotes = this.getAllNotes()
      const updatedNotes = allNotes.filter(note => note.id !== id)
      wx.setStorageSync(this.storageKey, updatedNotes)
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('笔记删除成功:', id)
      return { success: true }
    } catch (error) {
      console.error('删除笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 批量删除笔记
   */
  deleteNotes(ids) {
    try {
      const allNotes = this.getAllNotes()
      const updatedNotes = allNotes.filter(note => !ids.includes(note.id))
      wx.setStorageSync(this.storageKey, updatedNotes)
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('批量删除笔记成功:', ids.length)
      return { success: true, deletedCount: ids.length }
    } catch (error) {
      console.error('批量删除笔记失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 搜索笔记
   */
  searchNotes(keyword, options = {}) {
    const {
      category = null,
      tags = [],
      dateRange = null,
      sortBy = 'updateTime', // createTime, updateTime, title, wordCount
      sortOrder = 'desc' // asc, desc
    } = options

    let filteredNotes = this.getAllNotes()

    // 关键词搜索
    if (keyword && keyword.trim()) {
      const searchTerm = keyword.toLowerCase()
      filteredNotes = filteredNotes.filter(note => {
        return note.title.toLowerCase().includes(searchTerm) ||
               note.content.toLowerCase().includes(searchTerm) ||
               (note.tags && note.tags.some(tag => tag.toLowerCase().includes(searchTerm)))
      })
    }

    // 分类筛选
    if (category) {
      filteredNotes = filteredNotes.filter(note => note.category === category)
    }

    // 标签筛选
    if (tags && tags.length > 0) {
      filteredNotes = filteredNotes.filter(note => {
        return note.tags && tags.some(tag => note.tags.includes(tag))
      })
    }

    // 日期范围筛选
    if (dateRange && dateRange.start && dateRange.end) {
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = this.parseDate(note.createTime)
        return noteDate >= dateRange.start && noteDate <= dateRange.end
      })
    }

    // 排序
    filteredNotes.sort((a, b) => {
      let aValue, bValue
      
      switch (sortBy) {
        case 'createTime':
          aValue = this.parseDate(a.createTime)
          bValue = this.parseDate(b.createTime)
          break
        case 'updateTime':
          aValue = this.parseDate(a.updateTime || a.createTime)
          bValue = this.parseDate(b.updateTime || b.createTime)
          break
        case 'title':
          aValue = a.title.toLowerCase()
          bValue = b.title.toLowerCase()
          break
        case 'wordCount':
          aValue = a.wordCount || 0
          bValue = b.wordCount || 0
          break
        default:
          aValue = new Date(a.updateTime || a.createTime)
          bValue = new Date(b.updateTime || b.createTime)
      }

      if (sortOrder === 'asc') {
        return aValue > bValue ? 1 : -1
      } else {
        return aValue < bValue ? 1 : -1
      }
    })

    return filteredNotes
  }

  /**
   * 获取所有标签
   */
  getAllTags() {
    try {
      return wx.getStorageSync(this.tagStorageKey) || []
    } catch (error) {
      console.error('获取标签失败:', error)
      return []
    }
  }

  /**
   * 更新标签统计
   */
  updateTagStatistics(newTags) {
    try {
      const allNotes = this.getAllNotes()
      const tagStats = {}
      
      // 统计所有标签的使用次数
      allNotes.forEach(note => {
        if (note.tags) {
          note.tags.forEach(tag => {
            tagStats[tag] = (tagStats[tag] || 0) + 1
          })
        }
      })
      
      // 转换为数组并排序
      const sortedTags = Object.entries(tagStats)
        .map(([name, count]) => ({ name, count }))
        .sort((a, b) => b.count - a.count)
      
      wx.setStorageSync(this.tagStorageKey, sortedTags)
      console.log('标签统计更新成功')
    } catch (error) {
      console.error('更新标签统计失败:', error)
    }
  }

  /**
   * 更新所有标签统计
   */
  updateAllTagStatistics() {
    this.updateTagStatistics([])
  }

  /**
   * 获取热门标签
   */
  getPopularTags(limit = 20) {
    const allTags = this.getAllTags()
    return allTags.slice(0, limit)
  }

  /**
   * 根据标签获取笔记
   */
  getNotesByTag(tag) {
    const allNotes = this.getAllNotes()
    return allNotes.filter(note => note.tags && note.tags.includes(tag))
  }

  /**
   * 获取分类统计
   */
  getCategoryStatistics() {
    const allNotes = this.getAllNotes()
    const categoryStats = {}
    
    allNotes.forEach(note => {
      const category = note.category || '未分类'
      categoryStats[category] = (categoryStats[category] || 0) + 1
    })
    
    return Object.entries(categoryStats)
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count)
  }

  /**
   * 获取笔记统计信息
   */
  getStatistics() {
    const allNotes = this.getAllNotes()
    const totalNotes = allNotes.length
    const totalWords = allNotes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
    const categories = this.getCategoryStatistics()
    const tags = this.getAllTags()
    
    // 最近活动
    const recentNotes = allNotes
      .sort((a, b) => this.parseDate(b.updateTime || b.createTime) - this.parseDate(a.updateTime || a.createTime))
      .slice(0, 5)
    
    return {
      totalNotes,
      totalWords,
      totalCategories: categories.length,
      totalTags: tags.length,
      categories,
      recentNotes,
      lastUpdate: allNotes.length > 0 ? 
        Math.max(...allNotes.map(note => this.parseDate(note.updateTime || note.createTime).getTime())) : null
    }
  }

  /**
   * 导出所有数据
   */
  exportData() {
    try {
      const allNotes = this.getAllNotes()
      const allTags = this.getAllTags()
      const statistics = this.getStatistics()
      
      const exportData = {
        version: '1.0',
        exportTime: this.formatTime(new Date()),
        notes: allNotes,
        tags: allTags,
        statistics: statistics
      }
      
      return { success: true, data: exportData }
    } catch (error) {
      console.error('导出数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 导入数据
   */
  importData(data) {
    try {
      if (!data || !data.notes) {
        throw new Error('数据格式无效')
      }
      
      // 备份现有数据
      const backup = this.exportData()
      wx.setStorageSync('notes_backup', backup.data)
      
      // 导入新数据
      wx.setStorageSync(this.storageKey, data.notes)
      if (data.tags) {
        wx.setStorageSync(this.tagStorageKey, data.tags)
      }
      
      // 更新标签统计
      this.updateAllTagStatistics()
      
      console.log('数据导入成功')
      return { success: true, importedNotes: data.notes.length }
    } catch (error) {
      console.error('导入数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 清空所有数据
   */
  clearAllData() {
    try {
      wx.removeStorageSync(this.storageKey)
      wx.removeStorageSync(this.tagStorageKey)
      wx.removeStorageSync(this.categoryStorageKey)
      console.log('所有数据已清空')
      return { success: true }
    } catch (error) {
      console.error('清空数据失败:', error)
      return { success: false, error: error.message }
    }
  }

  /**
   * 生成唯一ID
   */
  generateId() {
    return Date.now().toString() + Math.random().toString(36).substr(2, 9)
  }

  /**
   * 格式化时间 - iOS兼容格式
   */
  formatTime(date) {
    const year = date.getFullYear()
    const month = date.getMonth() + 1
    const day = date.getDate()
    const hour = date.getHours()
    const minute = date.getMinutes()
    const second = date.getSeconds()
    
    // 使用iOS兼容的格式: "yyyy-MM-dd HH:mm:ss"
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')} ${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}:${second.toString().padStart(2, '0')}`
  }

  /**
   * 安全解析日期 - iOS兼容
   */
  parseDate(dateString) {
    if (!dateString) return new Date()
    
    // 如果已经是Date对象，直接返回
    if (dateString instanceof Date) return dateString
    
    // 处理不同的日期格式，确保iOS兼容
    let dateStr = dateString.toString().trim()
    
    // 如果格式是 "yyyy-MM-dd HH:mm" 或 "yyyy-MM-dd HH:mm:ss"，直接使用
    if (/^\d{4}-\d{2}-\d{2} \d{2}:\d{2}(:\d{2})?$/.test(dateStr)) {
      return new Date(dateStr)
    }
    
    // 如果格式是 "yyyy-MM-dd"，添加默认时间
    if (/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      dateStr += ' 00:00:00'
      return new Date(dateStr)
    }
    
    // 其他格式尝试直接解析
    const date = new Date(dateStr)
    
    // 检查日期是否有效
    if (isNaN(date.getTime())) {
      console.warn('无法解析日期:', dateString, '使用当前时间')
      return new Date()
    }
    
    return date
  }

  /**
   * 获取分类名称
   */
  getCategoryName(category) {
    const categoryNames = {
      'art': '艺术',
      'cute': '萌物',
      'dreams': '梦游',
      'foods': '美食',
      'happiness': '趣事',
      'knowledge': '知识',
      'sights': '风景',
      'thinking': '思考'
    }
    return categoryNames[category] || '未知'
  }

  /**
   * 获取分类颜色
   */
  getCategoryColor(category) {
    const categoryColors = {
      'art': '#667eea',
      'cute': '#ff9a9e',
      'dreams': '#a8edea',
      'foods': '#ffecd2',
      'happiness': '#ffd89b',
      'knowledge': '#89f7fe',
      'sights': '#667eea',
      'thinking': '#f093fb'
    }
    return categoryColors[category] || '#667eea'
  }
}

// 创建单例实例
const noteManager = new NoteManager()

module.exports = noteManager
