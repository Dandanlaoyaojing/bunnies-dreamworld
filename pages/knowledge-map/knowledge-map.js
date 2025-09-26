// pages/knowledge-map/knowledge-map.js
const noteManager = require('../../utils/noteManager')
const aiService = require('../../utils/aiService')

Page({
  data: {
    // 筛选条件
    startDate: '',
    endDate: '',
    selectedCategory: '',
    minRelation: 0.3,
    maxLevel: 3,
    
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
    selectedNode: null
  },

  onLoad(options) {
    console.log('知识星图页面加载')
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
        loadingText: '正在生成知识图谱...'
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
    const { startDate, endDate, selectedCategory } = this.data
    
    // 构建搜索选项
    const searchOptions = {
      category: selectedCategory || null,
      sortBy: 'createTime',
      sortOrder: 'desc'
    }

    // 添加日期范围
    if (startDate || endDate) {
      const dateRange = {}
      
      if (startDate) {
        dateRange.start = new Date(startDate)
      }
      
      if (endDate) {
        dateRange.end = new Date(endDate)
        dateRange.end.setHours(23, 59, 59, 999)
      }
      
      searchOptions.dateRange = dateRange
    }

    // 获取所有笔记
    const allNotes = noteManager.getAllNotes()
    
    // 应用筛选
    let filteredNotes = noteManager.searchNotes('', searchOptions)
    
    return filteredNotes
  },

  // 分析标签关联
  async analyzeTagRelations(notes) {
    // 收集所有标签
    const allTags = new Set()
    const tagNotes = new Map()
    
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
    
    return {
      nodes: nodes,
      links: links
    }
  },

  // 计算节点位置
  calculateNodePosition(index, level, totalTags) {
    const centerX = 375 // 屏幕中心X坐标
    const centerY = 300 // 屏幕中心Y坐标
    
    // 根据层级确定半径
    const radius = level * 80 + 60
    
    // 计算角度
    const angleStep = (2 * Math.PI) / Math.ceil(totalTags / this.data.maxLevel)
    const angle = index * angleStep
    
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

  // 显示设置
  showSettings() {
    wx.showActionSheet({
      itemList: ['重置筛选条件', '导出图谱数据', '关于知识星图'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.resetFilters()
            break
          case 1:
            this.exportMapData()
            break
          case 2:
            this.showAbout()
            break
        }
      }
    })
  },

  // 重置筛选条件
  resetFilters() {
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 30)
    
    this.setData({
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
