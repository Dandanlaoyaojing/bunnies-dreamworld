// pages/knowledge-map/knowledge-map.js
const noteManager = require('../../utils/noteManager')
const aiService = require('../../utils/aiService')

// 搜索建议管理器
class SearchSuggestionManager {
  constructor() {
    this.searchHistory = this.loadSearchHistory()
    this.popularTags = this.loadPopularTags()
  }
  
  loadSearchHistory() {
    return wx.getStorageSync('searchHistory') || []
  }
  
  saveSearchHistory(keyword) {
    if (!this.searchHistory.includes(keyword)) {
      this.searchHistory.unshift(keyword)
      this.searchHistory = this.searchHistory.slice(0, 10)
      wx.setStorageSync('searchHistory', this.searchHistory)
    }
  }
  
  getSuggestions(keyword) {
    if (!keyword) return []
    
    const suggestions = []
    
    // 1. 从搜索历史中获取建议
    const historySuggestions = this.searchHistory.filter(item => 
      item.toLowerCase().includes(keyword.toLowerCase())
    )
    suggestions.push(...historySuggestions)
    
    // 2. 从笔记内容中提取相关关键词
    const allNotes = noteManager.getAllNotes()
    const contentKeywords = this.extractContentKeywords(allNotes, keyword)
    suggestions.push(...contentKeywords)
    
    // 3. 去重并限制数量
    const uniqueSuggestions = [...new Set(suggestions)]
    return uniqueSuggestions.slice(0, 8)
  }
  
  // 从笔记内容中提取相关关键词
  extractContentKeywords(notes, keyword) {
    const keywords = []
    const keywordLower = keyword.toLowerCase()
    
    notes.forEach(note => {
      // 从标题中提取包含关键词的短语
      if (note.title && note.title.toLowerCase().includes(keywordLower)) {
        const words = note.title.split(/\s+/)
        words.forEach(word => {
          if (word.toLowerCase().includes(keywordLower) && word.length > keyword.length) {
            keywords.push(word.trim())
          }
        })
      }
      
      // 从内容中提取包含关键词的短语
      if (note.content && note.content.toLowerCase().includes(keywordLower)) {
        const sentences = note.content.split(/[。！？\n]/)
        sentences.forEach(sentence => {
          if (sentence.toLowerCase().includes(keywordLower)) {
            const words = sentence.split(/\s+/)
            words.forEach(word => {
              if (word.toLowerCase().includes(keywordLower) && word.length > keyword.length) {
                keywords.push(word.trim())
              }
            })
          }
        })
      }
    })
    
    // 去重并返回最相关的关键词
    return [...new Set(keywords)].slice(0, 5)
  }
  
  loadPopularTags() {
    const allTags = noteManager.getAllTags()
    return allTags.slice(0, 8).map(tag => ({
      name: tag.name,
      count: tag.count,
      color: this.getTagColor(tag.name)
    }))
  }
  
  getTagColor(tagName) {
    const colors = ['#667eea', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#ffecd2', '#a8edea', '#ffd89b']
    const index = tagName.length % colors.length
    return colors[index]
  }
}

Page({
  data: {
    // 筛选条件
    searchKeyword: '', // 搜索关键词
    startDate: '',
    endDate: '',
    selectedCategory: '',
    minRelation: 0.3,
    maxLevel: 3,
    
    // 搜索相关
    showSuggestions: false,
    searchSuggestions: [],
    popularTags: [],
    suggestionManager: null,
    
    // 分类选项
    categories: [
      { key: '', name: '全部' },
      { key: 'art', name: '艺术' },
      { key: 'cute', name: '萌物' },
      { key: 'dreams', name: '梦游' },
      { key: 'foods', name: '美食' },
      { key: 'happiness', name: '趣事' },
      { key: 'knowledge', name: '知识' },
      { key: 'sights', name: '风景' },
      { key: 'thinking', name: '思考' }
    ],
    
    // 加载状态
    isLoading: false,
    loadingText: '正在分析知识关联...',
    
    // 知识图谱数据
    knowledgeMap: {
      nodes: [],
      links: []
    },
    
    // 节点详情
    showNodeDetail: false,
    selectedNode: null,
    
    // 交互状态
    draggingNode: null,
    dragStartPos: null,
    viewScale: 1,
    viewTranslateX: 0,
    viewTranslateY: 0
  },

  onLoad(options) {
    console.log('知识星图页面加载')
    // 初始化搜索建议管理器
    const suggestionManager = new SearchSuggestionManager()
    this.setData({
      suggestionManager: suggestionManager,
      popularTags: suggestionManager.popularTags
    })
    this.loadInitialData()
  },

  onShow() {
    // 每次显示页面时重新加载数据
    this.loadInitialData()
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.loadInitialData()
    wx.stopPullDownRefresh()
  },

  // 加载初始数据
  loadInitialData() {
    // 设置默认时间范围（最近30天）
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    this.setData({
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate)
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 刷新图谱
  refreshMap() {
      this.generateMap()
    },

    // 搜索输入
    onSearchInput(e) {
      const keyword = e.detail.value
      const suggestions = this.data.suggestionManager.getSuggestions(keyword)
      this.setData({
        searchKeyword: keyword,
        showSuggestions: keyword.length > 0,
        searchSuggestions: suggestions
      })
    },

    // 搜索框获得焦点
    onSearchFocus() {
      const keyword = this.data.searchKeyword
      if (keyword.length > 0) {
        const suggestions = this.data.suggestionManager.getSuggestions(keyword)
        this.setData({
          showSuggestions: true,
          searchSuggestions: suggestions
        })
      }
    },

    // 搜索框失去焦点
    onSearchBlur() {
      // 延迟隐藏建议，让用户有时间点击
      setTimeout(() => {
        this.setData({
          showSuggestions: false
        })
      }, 200)
    },

    // 选择搜索建议
    selectSuggestion(e) {
      const suggestion = e.currentTarget.dataset.suggestion
      this.setData({
        searchKeyword: suggestion,
        showSuggestions: false
      })
      this.generateMap()
    },

    // 选择快速标签
    selectQuickTag(e) {
      const tag = e.currentTarget.dataset.tag
      this.setData({
        searchKeyword: tag,
        showSuggestions: false
      })
      this.generateMap()
    },

    // 搜索确认
    onSearchConfirm() {
      const keyword = this.data.searchKeyword.trim()
      if (!keyword) {
        wx.showToast({
          title: '请输入搜索关键词',
          icon: 'none'
        })
        return
      }
      
      // 保存搜索历史
      this.data.suggestionManager.saveSearchHistory(keyword)
      
      console.log('开始搜索关键词:', keyword)
      this.generateMap()
    },

    // 开始日期改变
  onStartDateChange(e) {
    const date = e.detail.value
    this.setData({
      startDate: date
    })
  },

  // 结束日期改变
  onEndDateChange(e) {
    const date = e.detail.value
    this.setData({
      endDate: date
    })
  },

  // 按分类筛选
  filterByCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
  },

  // 最小关联度改变
  onMinRelationChange(e) {
    const value = e.detail.value
    this.setData({
      minRelation: value
    })
  },

  // 最大层级改变
  onMaxLevelChange(e) {
    const value = e.detail.value
    this.setData({
      maxLevel: value
    })
  },

  // 生成知识图谱
  async generateMap() {
    try {
      this.setData({
        isLoading: true,
        loadingText: '正在获取笔记数据...'
      })

      // 获取筛选后的笔记
      const notes = this.getFilteredNotes()
      
      if (notes.length === 0) {
        wx.showToast({
          title: '没有找到符合条件的笔记',
          icon: 'none'
        })
        this.setData({
          isLoading: false,
          knowledgeMap: { nodes: [], links: [] }
        })
        return
      }

      this.setData({
        loadingText: '正在分析标签关联...'
      })

      // 分析标签关联
      const tagAnalysis = await this.analyzeTagRelations(notes)
      
        this.setData({
          loadingText: this.data.searchKeyword ? '正在生成关键词相关知识图谱...' : '正在生成知识图谱...'
        })

      // 生成知识图谱
      const knowledgeMap = this.generateKnowledgeGraph(tagAnalysis)
      
      this.setData({
        isLoading: false,
        knowledgeMap: knowledgeMap
      })

      wx.showToast({
        title: '知识图谱生成成功',
        icon: 'success'
      })

    } catch (error) {
      console.error('生成知识图谱失败:', error)
      this.setData({
        isLoading: false
      })
      wx.showToast({
        title: '生成失败，请重试',
        icon: 'none'
      })
    }
  },

  // 获取筛选后的笔记
  getFilteredNotes() {
    const { searchKeyword, startDate, endDate, selectedCategory } = this.data
    
    console.log('getFilteredNotes 参数:', { searchKeyword, startDate, endDate, selectedCategory })
    
    // 获取所有笔记
    const allNotes = noteManager.getAllNotes()
    console.log('获取到的所有笔记数量:', allNotes.length)
    
    // 应用基础筛选（分类、日期范围）
    let filteredNotes = allNotes
    
    // 应用分类筛选
    if (selectedCategory) {
      filteredNotes = filteredNotes.filter(note => note.category === selectedCategory)
    }
    
    // 应用日期范围筛选
    if (startDate || endDate) {
      filteredNotes = filteredNotes.filter(note => {
        const noteDate = new Date(note.createTime)
        
        if (startDate) {
          // 将日期字符串转换为iOS兼容格式
          const startDateStr = startDate.replace(/-/g, '/')
          const startDateTime = new Date(startDateStr)
          if (noteDate < startDateTime) {
            return false
          }
        }
        
        if (endDate) {
          // 将日期字符串转换为iOS兼容格式
          const endDateStr = endDate.replace(/-/g, '/')
          const endDateTime = new Date(endDateStr)
          endDateTime.setHours(23, 59, 59, 999)
          if (noteDate > endDateTime) {
            return false
          }
        }
        
        return true
      })
    }
    
    // 如果有搜索关键词，进行智能全内容搜索
    if (searchKeyword && searchKeyword.trim()) {
      const keyword = searchKeyword.trim().toLowerCase()
      filteredNotes = filteredNotes.filter(note => {
        // 智能搜索：标题、内容、标签、来源、分类
        const searchFields = [
          note.title,
          note.content,
          note.source,
          note.category,
          ...(note.tags || [])
        ]
        
        // 检查是否匹配任何字段
        const hasMatch = searchFields.some(field => {
          if (!field) return false
          return field.toLowerCase().includes(keyword)
        })
        
        // 额外检查：如果搜索关键词包含多个词，检查是否都匹配
        if (!hasMatch && keyword.includes(' ')) {
          const keywords = keyword.split(' ').filter(k => k.length > 0)
          return keywords.every(k => 
            searchFields.some(field => 
              field && field.toLowerCase().includes(k)
            )
          )
        }
        
        return hasMatch
      })
      
      // 按匹配度排序：标题匹配 > 内容匹配 > 标签匹配
      filteredNotes.sort((a, b) => {
        const getMatchScore = (note) => {
          let score = 0
          if (note.title && note.title.toLowerCase().includes(keyword)) score += 10
          if (note.content && note.content.toLowerCase().includes(keyword)) score += 5
          if (note.tags && note.tags.some(tag => tag.toLowerCase().includes(keyword))) score += 3
          if (note.source && note.source.toLowerCase().includes(keyword)) score += 2
          if (note.category && note.category.toLowerCase().includes(keyword)) score += 1
          return score
        }
        
        return getMatchScore(b) - getMatchScore(a)
      })
    }
    
    console.log('筛选后的笔记数量:', filteredNotes.length)
    console.log('筛选后的笔记:', filteredNotes.map(note => ({ id: note.id, title: note.title, category: note.category })))
    
    return filteredNotes
  },

  // 分析标签关联
  async analyzeTagRelations(notes) {
    // 收集所有标签
    const allTags = new Set()
    const tagNotes = new Map()
    const keyword = this.data.searchKeyword.trim()
    
    notes.forEach(note => {
      if (note.tags && note.tags.length > 0) {
        note.tags.forEach(tag => {
          allTags.add(tag)
          if (!tagNotes.has(tag)) {
            tagNotes.set(tag, [])
          }
          tagNotes.get(tag).push(note)
        })
      }
      
      // 如果有搜索关键词，从笔记内容中提取相关概念
      if (keyword) {
        const extractedConcepts = this.extractConceptsFromNote(note, keyword)
        extractedConcepts.forEach(concept => {
          allTags.add(concept)
          if (!tagNotes.has(concept)) {
            tagNotes.set(concept, [])
          }
          tagNotes.get(concept).push(note)
        })
      }
    })

    // 计算标签关联度
    const tagRelations = new Map()
    const tagList = Array.from(allTags)
    
    for (let i = 0; i < tagList.length; i++) {
      for (let j = i + 1; j < tagList.length; j++) {
        const tag1 = tagList[i]
        const tag2 = tagList[j]
        
        const notes1 = tagNotes.get(tag1)
        const notes2 = tagNotes.get(tag2)
        
        // 计算共同笔记数量
        const commonNotes = notes1.filter(note1 => 
          notes2.some(note2 => note1.id === note2.id)
        )
        
        if (commonNotes.length > 0) {
          // 计算关联度（共同笔记数 / 总笔记数）
          const relation = commonNotes.length / Math.min(notes1.length, notes2.length)
          
          if (relation >= this.data.minRelation) {
            const relationKey = `${tag1}-${tag2}`
            tagRelations.set(relationKey, {
              tag1: tag1,
              tag2: tag2,
              relation: relation,
              commonNotes: commonNotes.length,
              notes1: notes1.length,
              notes2: notes2.length
            })
          }
        }
      }
    }

    return {
      tags: tagList,
      tagNotes: tagNotes,
      tagRelations: tagRelations
    }
  },

  // 生成知识图谱
  generateKnowledgeGraph(tagAnalysis) {
    const { tags, tagNotes, tagRelations } = tagAnalysis
    const { maxLevel } = this.data
    
    // 创建节点
    const nodes = []
    const nodeMap = new Map()
    
    // 按笔记数量排序标签
    const sortedTags = tags.sort((a, b) => {
      const countA = tagNotes.get(a).length
      const countB = tagNotes.get(b).length
      return countB - countA
    })
    
    // 确定节点层级
    const levelSize = Math.ceil(sortedTags.length / maxLevel)
    
    sortedTags.forEach((tag, index) => {
      const level = Math.min(Math.floor(index / levelSize) + 1, maxLevel)
      const notes = tagNotes.get(tag)
      
      // 计算节点位置
      const position = this.calculateNodePosition(index, level, sortedTags.length)
      
      const node = {
        id: tag,
        name: tag,
        level: level,
        count: notes.length,
        connections: 0,
        importance: Math.min(100, Math.round((notes.length / Math.max(...Array.from(tagNotes.values()).map(n => n.length))) * 100)),
        x: position.x,
        y: position.y,
        notes: notes.slice(0, 5), // 只显示前5条笔记
        tags: [tag]
      }
      
      nodes.push(node)
      nodeMap.set(tag, node)
    })
    
    // 创建关联线
    const links = []
    
    tagRelations.forEach(relation => {
      const node1 = nodeMap.get(relation.tag1)
      const node2 = nodeMap.get(relation.tag2)
      
      if (node1 && node2) {
        // 更新连接数
        node1.connections++
        node2.connections++
        
        // 创建关联线
        const link = this.createConnectionLine(node1, node2, relation.relation)
        links.push(link)
      }
    })
    
    // 为每个节点计算关联节点信息
    nodes.forEach(node => {
      node.relatedNodes = this.calculateRelatedNodes(node, nodes, tagRelations)
    })
    
    return {
      nodes: nodes,
      links: links
    }
  },

  // 计算节点位置 - 使用黄金角度分布
  calculateNodePosition(index, level, totalTags) {
    const centerX = 375 // 屏幕中心X坐标
    const centerY = 300 // 屏幕中心Y坐标
    
    // 根据层级确定半径
    const radius = level * 100 + 80
    
    // 使用黄金角度分布，让节点分布更自然
    const goldenAngle = Math.PI * (3 - Math.sqrt(5))
    const angle = index * goldenAngle
    
    // 计算位置
    const x = centerX + radius * Math.cos(angle) - 40 // 减去节点宽度的一半
    const y = centerY + radius * Math.sin(angle) - 40 // 减去节点高度的一半
    
    return { x: Math.max(20, Math.min(750, x)), y: Math.max(20, Math.min(580, y)) }
  },

  // 创建关联线
  createConnectionLine(node1, node2, relation) {
    const startX = node1.x + 40 // 节点中心X
    const startY = node1.y + 40 // 节点中心Y
    const endX = node2.x + 40
    const endY = node2.y + 40
    
    // 计算距离和角度
    const dx = endX - startX
    const dy = endY - startY
    const length = Math.sqrt(dx * dx + dy * dy)
    const angle = Math.atan2(dy, dx) * (180 / Math.PI)
    
    return {
      id: `${node1.id}-${node2.id}`,
      startX: startX,
      startY: startY,
      length: length,
      angle: angle,
      relation: relation
    }
  },

  // 节点点击事件
  onNodeTap(e) {
    const node = e.currentTarget.dataset.node
    this.setData({
      selectedNode: node,
      showNodeDetail: true
    })
  },

  // 节点触摸开始
  onNodeTouchStart(e) {
    const node = e.currentTarget.dataset.node
    this.setData({
      draggingNode: node,
      dragStartPos: { x: e.touches[0].clientX, y: e.touches[0].clientY }
    })
  },

  // 节点触摸移动
  onNodeTouchMove(e) {
    if (!this.data.draggingNode) return
    
    const deltaX = e.touches[0].clientX - this.data.dragStartPos.x
    const deltaY = e.touches[0].clientY - this.data.dragStartPos.y
    
    // 更新节点位置
    const updatedNodes = this.data.knowledgeMap.nodes.map(node => {
      if (node.id === this.data.draggingNode.id) {
        return {
          ...node,
          x: Math.max(20, Math.min(750, node.x + deltaX)),
          y: Math.max(20, Math.min(580, node.y + deltaY))
        }
      }
      return node
    })
    
    this.setData({
      'knowledgeMap.nodes': updatedNodes,
      dragStartPos: { x: e.touches[0].clientX, y: e.touches[0].clientY }
    })
  },

  // 节点触摸结束
  onNodeTouchEnd(e) {
    this.setData({
      draggingNode: null,
      dragStartPos: null
    })
  },

  // 双击节点重新生成星图
  onNodeDoubleTap(e) {
    const node = e.currentTarget.dataset.node
    this.setData({
      searchKeyword: node.name
    })
    this.generateMap()
  },

  // 长按节点显示操作菜单
  onNodeLongPress(e) {
    const node = e.currentTarget.dataset.node
    const actions = ['以该节点为中心生成星图', '查看相关笔记', '添加到收藏', '分享节点']
    
    wx.showActionSheet({
      itemList: actions,
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.setData({ searchKeyword: node.name })
            this.generateMap()
            break
          case 1:
            this.showRelatedNotes(node)
            break
          case 2:
            this.addToFavorites(node)
            break
          case 3:
            this.shareNode(node)
            break
        }
      }
    })
  },

  // 显示相关笔记
  showRelatedNotes(node) {
    if (node.notes && node.notes.length > 0) {
      const noteTitles = node.notes.map(note => note.title || '无标题笔记')
      wx.showActionSheet({
        itemList: noteTitles,
        success: (res) => {
          const selectedNote = node.notes[res.tapIndex]
          if (selectedNote) {
            wx.navigateTo({
              url: `/pages/note-detail/note-detail?id=${selectedNote.id}`
            })
          }
        }
      })
    } else {
      wx.showToast({
        title: '该节点暂无相关笔记',
        icon: 'none'
      })
    }
  },

  // 添加到收藏
  addToFavorites(node) {
    const favorites = wx.getStorageSync('favoriteNodes') || []
    if (!favorites.find(fav => fav.id === node.id)) {
      favorites.push({
        id: node.id,
        name: node.name,
        addTime: new Date().toISOString()
      })
      wx.setStorageSync('favoriteNodes', favorites)
      wx.showToast({
        title: '已添加到收藏',
        icon: 'success'
      })
    } else {
      wx.showToast({
        title: '已在收藏中',
        icon: 'none'
      })
    }
  },

  // 分享节点
  shareNode(node) {
    wx.showShareMenu({
      withShareTicket: true,
      success: () => {
        wx.showToast({
          title: '分享功能开发中',
          icon: 'none'
        })
      }
    })
  },

  // 关闭节点详情
  closeNodeDetail() {
    this.setData({
      showNodeDetail: false,
      selectedNode: null
    })
  },

  // 打开笔记详情
  openNoteDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${id}`
    })
  },

  // 点击关联节点
  onRelatedNodeTap(e) {
    const relatedNode = e.currentTarget.dataset.node
    console.log('点击关联节点:', relatedNode)
    
    // 查找对应的完整节点信息
    const fullNode = this.data.knowledgeMap.nodes.find(node => node.id === relatedNode.id)
    if (fullNode && fullNode.notes && fullNode.notes.length > 0) {
      // 显示相关笔记选择器
      const noteTitles = fullNode.notes.map(note => note.title || '无标题笔记')
      
      wx.showActionSheet({
        itemList: noteTitles,
        success: (res) => {
          const selectedNote = fullNode.notes[res.tapIndex]
          if (selectedNote) {
            // 跳转到笔记详情页
            wx.navigateTo({
              url: `/pages/note-detail/note-detail?id=${selectedNote.id}`,
              success: () => {
                console.log('成功跳转到笔记详情:', selectedNote.id)
              },
              fail: (error) => {
                console.error('跳转笔记详情失败:', error)
                wx.showToast({
                  title: '跳转失败',
                  icon: 'none'
                })
              }
            })
          }
        },
        fail: (error) => {
          console.log('用户取消选择笔记')
        }
      })
    } else {
      wx.showToast({
        title: '该节点暂无相关笔记',
        icon: 'none'
      })
    }
  },

  // 显示设置
  showSettings() {
    wx.showActionSheet({
      itemList: ['重置筛选条件', '导出图谱数据', '视图控制', '关于知识星图'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.resetFilters()
            break
          case 1:
            this.exportMapData()
            break
          case 2:
            this.showViewControls()
            break
          case 3:
            this.showAbout()
            break
        }
      }
    })
  },

  // 显示视图控制
  showViewControls() {
    wx.showActionSheet({
      itemList: ['放大视图', '缩小视图', '重置视图', '全屏显示'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.zoomIn()
            break
          case 1:
            this.zoomOut()
            break
          case 2:
            this.resetView()
            break
          case 3:
            this.toggleFullscreen()
            break
        }
      }
    })
  },

  // 放大视图
  zoomIn() {
    const newScale = Math.min(2, this.data.viewScale * 1.2)
    this.setData({
      viewScale: newScale
    })
    this.updateViewTransform()
  },

  // 缩小视图
  zoomOut() {
    const newScale = Math.max(0.5, this.data.viewScale / 1.2)
    this.setData({
      viewScale: newScale
    })
    this.updateViewTransform()
  },

  // 重置视图
  resetView() {
    this.setData({
      viewScale: 1,
      viewTranslateX: 0,
      viewTranslateY: 0
    })
    this.updateViewTransform()
  },

  // 切换全屏
  toggleFullscreen() {
    wx.showToast({
      title: '全屏功能开发中',
      icon: 'none'
    })
  },

  // 更新视图变换
  updateViewTransform() {
    const { viewScale, viewTranslateX, viewTranslateY } = this.data
    const transform = `scale(${viewScale}) translate(${viewTranslateX}px, ${viewTranslateY}px)`
    
    // 这里可以通过选择器更新图谱容器的样式
    // 由于小程序限制，这里只是示例
    console.log('视图变换:', transform)
  },

  // 从笔记中提取相关概念
  extractConceptsFromNote(note, keyword) {
    const concepts = new Set()
    const keywordLower = keyword.toLowerCase()
    
    // 从标题中提取概念
    if (note.title) {
      const titleConcepts = this.extractConceptsFromText(note.title, keywordLower)
      titleConcepts.forEach(concept => concepts.add(concept))
    }
    
    // 从内容中提取概念
    if (note.content) {
      const contentConcepts = this.extractConceptsFromText(note.content, keywordLower)
      contentConcepts.forEach(concept => concepts.add(concept))
    }
    
    // 从标签中提取相关概念
    if (note.tags) {
      note.tags.forEach(tag => {
        if (tag.toLowerCase().includes(keywordLower)) {
          concepts.add(tag)
        }
      })
    }
    
    // 从来源中提取概念
    if (note.source) {
      const sourceConcepts = this.extractConceptsFromText(note.source, keywordLower)
      sourceConcepts.forEach(concept => concepts.add(concept))
    }
    
    return Array.from(concepts).slice(0, 5) // 限制每个笔记最多提取5个概念
  },

  // 从文本中提取概念
  extractConceptsFromText(text, keyword) {
    const concepts = []
    const words = text.split(/[\s,，。！？；：""''（）【】]/)
    
    words.forEach(word => {
      if (word.length > 1 && word.toLowerCase().includes(keyword)) {
        concepts.push(word.trim())
      }
    })
    
    return concepts
  },

  // AI概念提取
  async extractAIConcepts(note, keyword) {
    try {
      const messages = [
        {
          role: 'system',
          content: `从以下笔记内容中提取与"${keyword}"相关的3-5个关键概念，用逗号分隔。`
        },
        {
          role: 'user',
          content: `标题：${note.title}\n内容：${note.content}`
        }
      ]
      
      const result = await aiService.sendRequest(messages, { max_tokens: 100 })
      if (result.success) {
        return result.content.split(',').map(c => c.trim()).filter(c => c.length > 0)
      }
    } catch (error) {
      console.error('AI概念提取失败:', error)
    }
    
    return []
  },

  // 计算节点的关联节点信息
  calculateRelatedNodes(currentNode, allNodes, tagRelations) {
    const relatedNodes = []
    
    // 查找与当前节点有直接关联的节点
    tagRelations.forEach(relation => {
      let relatedNode = null
      let relationStrength = 0
      
      if (relation.tag1 === currentNode.id) {
        relatedNode = allNodes.find(node => node.id === relation.tag2)
        relationStrength = relation.relation
      } else if (relation.tag2 === currentNode.id) {
        relatedNode = allNodes.find(node => node.id === relation.tag1)
        relationStrength = relation.relation
      }
      
      if (relatedNode) {
        relatedNodes.push({
          id: relatedNode.id,
          name: relatedNode.name,
          count: relatedNode.count,
          level: relatedNode.level,
          relation: Math.round(relationStrength * 100) // 转换为百分比
        })
      }
    })
    
    // 按关联度排序，取前5个最相关的节点
    return relatedNodes
      .sort((a, b) => b.relation - a.relation)
      .slice(0, 5)
  },

  // 重置筛选条件
  resetFilters() {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    this.setData({
      searchKeyword: '',
      startDate: this.formatDate(startDate),
      endDate: this.formatDate(endDate),
      selectedCategory: '',
      minRelation: 0.3,
      maxLevel: 3
    })
    
    wx.showToast({
      title: '筛选条件已重置',
      icon: 'success'
    })
  },

  // 导出图谱数据
  exportMapData() {
    const { knowledgeMap } = this.data
    
    if (knowledgeMap.nodes.length === 0) {
      wx.showToast({
        title: '暂无数据可导出',
        icon: 'none'
      })
      return
    }
    
    // 这里可以实现数据导出功能
    wx.showToast({
      title: '导出功能开发中',
      icon: 'none'
    })
  },

  // 显示关于信息
  showAbout() {
    wx.showModal({
      title: '关于知识星图',
      content: '知识星图通过分析笔记标签的关联关系，以科技树的形式展示知识点之间的连接。帮助您发现知识间的内在联系，构建个人知识体系。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  }
})
