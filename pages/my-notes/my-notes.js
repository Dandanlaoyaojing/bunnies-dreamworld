// pages/my-notes/my-notes.js
const noteManager = require('../../utils/noteManager')
const apiService = require('../../utils/apiService')

Page({
  data: {
    // 基础数据
    allNotes: [],
    filteredNotes: [],
    statistics: {
      totalNotes: 0,
      totalWords: 0,
      totalCategories: 0,
      totalTags: 0
    },
    
    // 视图模式
    viewMode: 'list', // list | grid
    
    // 搜索和筛选
    searchKeyword: '',
    selectedCategory: '',
    selectedTags: [],
    sortIndex: 0,
    sortOptions: ['最近更新', '创建时间', '标题', '字数'],
    startDate: '',
    endDate: '',
    
    // 热门标签
    popularTags: [],
    
    // 批量操作
    isBatchMode: false,
    selectedNotes: []
  },

  onLoad(options) {
    console.log('我的笔记页面加载')
    this.loadAllData()
  },

  onShow() {
    // 每次显示页面时重新加载数据
    this.loadAllData()
  },

  onPullDownRefresh() {
    // 下拉刷新
    this.loadAllData()
    wx.stopPullDownRefresh()
  },

  onReachBottom() {
    // 上拉加载更多（如果需要分页）
    console.log('到达底部')
  },

  // 加载所有数据（从API服务器）
  async loadAllData() {
    try {
      console.log('开始加载笔记数据...')
      
      // 先从本地缓存加载（快速显示）
      let cachedNotes = this.loadNotesFromCurrentAccount()
      if (cachedNotes.length > 0) {
        const statistics = this.calculateStatistics(cachedNotes)
        const popularTags = noteManager.getPopularTags(10)
        
        this.setData({
          allNotes: cachedNotes,
          filteredNotes: cachedNotes,
          statistics: statistics,
          popularTags: popularTags
        })
        console.log('📦 显示缓存数据:', cachedNotes.length, '条')
      }
      
      // ========== 从API服务器加载最新数据 ==========
      try {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.token) {
          console.log('📥 开始从服务器加载笔记...')
          
          const result = await apiService.getNotes({ page: 1, limit: 1000 })
          
          if (result.success && result.data.notes) {
            const serverNotes = result.data.notes
            console.log(`✅ 从服务器加载了 ${serverNotes.length} 条笔记`)
            
            // 处理服务器数据，确保字段完整性
            const processedNotes = serverNotes.map(note => {
              // 处理source字段：将null转换为空字符串，trim去除空白
              const sourceValue = note.source ? String(note.source).trim() : ''
              
              console.log('处理服务器笔记数据:', {
                id: note.id,
                title: note.title,
                tags: note.tags,
                source: note.source,
                sourceProcessed: sourceValue,
                category: note.category
              })
              
              return {
                id: note.id,
                title: note.title || '',
                content: note.content || '',
                category: note.category || 'knowledge',
                tags: note.tags || [], // 确保tags是数组
                source: sourceValue, // 处理后的source（去除了null和空白）
                url: note.url || '',
                images: note.images || [],
                voices: note.voices || [],
                categoryTag: note.categoryTag || note.category_tag || '',
                createTime: note.createTime || note.created_at || '',
                updateTime: note.updateTime || note.updated_at || '',
                wordCount: note.wordCount || note.word_count || 0,
                isFavorite: note.isFavorite || false,
                favoriteTime: note.favoriteTime || null,
                status: note.status || 'active'
              }
            })
            
            // 检查哪些笔记有source
            const notesWithSource = processedNotes.filter(n => n.source && n.source.trim())
            console.log(`📌 有来源的笔记数量: ${notesWithSource.length} / ${processedNotes.length}`)
            if (notesWithSource.length > 0) {
              console.log('有来源的笔记:', notesWithSource.map(n => ({ id: n.id, title: n.title, source: n.source })))
            }
            
            console.log('处理后的笔记数据示例:', processedNotes[0])
            
            // 保存到本地缓存
            wx.setStorageSync('notes', processedNotes)
            
            // 保存到账户存储
            if (userInfo.username) {
              noteManager.saveNotesToAccount(userInfo.username, processedNotes)
            }
            
            // 更新显示
            const statistics = this.calculateStatistics(processedNotes)
            const popularTags = noteManager.getPopularTags(10)
            
            this.setData({
              allNotes: processedNotes,
              filteredNotes: processedNotes,
              statistics: statistics,
              popularTags: popularTags
            })
            
            console.log('服务器数据已更新到页面')
          }
        } else {
          console.log('未登录或无Token，使用本地数据')
        }
      } catch (apiError) {
        console.error('❌ 从服务器加载失败:', apiError)
        // API加载失败，继续使用本地缓存数据
        wx.showToast({
          title: '使用缓存数据',
          icon: 'none',
          duration: 1000
        })
      }
      // ========== API加载结束 ==========
      
    } catch (error) {
      console.error('加载数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 从当前登录账户加载笔记
  loadNotesFromCurrentAccount() {
    try {
      // 获取当前用户信息
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未找到用户信息，使用全局存储')
        return noteManager.getAllNotes()
      }
      
      const accountName = userInfo.username
      console.log('从账户加载笔记:', accountName)
      
      // 获取账户数据
      const accountResult = noteManager.getNotesFromAccount(accountName)
      
      if (accountResult.success && accountResult.notes.length > 0) {
        console.log(`从账户 ${accountName} 加载了 ${accountResult.notes.length} 条笔记`)
        
        // 过滤掉已删除的笔记（只显示正常笔记）
        const activeNotes = accountResult.notes.filter(note => note.status !== 'deleted')
        console.log(`过滤后的笔记数量: ${activeNotes.length}`)
        
        // 将账户数据同步到全局存储，确保其他页面也能访问
        wx.setStorageSync('notes', activeNotes)
        
        // 更新标签统计
        noteManager.updateAllTagStatistics()
        
        return activeNotes
      } else {
        console.log('账户中没有笔记数据，返回空数组')
        
        // 账户中没有数据，清空全局存储，返回空数组
        wx.setStorageSync('notes', [])
        wx.setStorageSync('noteTags', [])
        
        console.log('已清空全局存储')
        
        return []
      }
    } catch (error) {
      console.error('从账户加载笔记失败:', error)
      return []
    }
  },

  // 基于实际笔记数据计算统计信息
  calculateStatistics(notes) {
    const totalNotes = notes.length
    const totalWords = notes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
    
    // 计算分类数量
    const categories = new Set()
    notes.forEach(note => {
      if (note.category) {
        categories.add(note.category)
      }
    })
    
    // 计算标签数量
    const tags = new Set()
    notes.forEach(note => {
      if (note.tags && Array.isArray(note.tags)) {
        note.tags.forEach(tag => tags.add(tag))
      }
    })
    
    return {
      totalNotes: totalNotes,
      totalWords: totalWords,
      totalCategories: categories.size,
      totalTags: tags.size
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 切换视图模式
  toggleViewMode() {
    const newMode = this.data.viewMode === 'list' ? 'grid' : 'list'
    this.setData({
      viewMode: newMode
    })
    
    // 保存用户偏好
    wx.setStorageSync('noteViewMode', newMode)
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value
    console.log('搜索关键词:', keyword)
    this.setData({
      searchKeyword: keyword
    })
    
    // 实时搜索
    this.filterNotes()
  },

  // 执行搜索
  performSearch() {
    console.log('手动触发搜索')
    this.filterNotes()
    
    // 显示搜索结果提示
    const resultCount = this.data.filteredNotes.length
    if (this.data.searchKeyword.trim()) {
      wx.showToast({
        title: `找到 ${resultCount} 条结果`,
        icon: resultCount > 0 ? 'success' : 'none',
        duration: 1500
      })
    }
  },

  // 按分类筛选
  filterByCategory(e) {
    const category = e.currentTarget.dataset.category
    this.setData({
      selectedCategory: category
    })
    
    this.filterNotes()
  },

  // 切换标签筛选
  toggleTagFilter(e) {
    const tag = e.currentTarget.dataset.tag
    const selectedTags = [...this.data.selectedTags]
    const index = selectedTags.indexOf(tag)
    
    if (index > -1) {
      selectedTags.splice(index, 1)
    } else {
      selectedTags.push(tag)
    }
    
    this.setData({
      selectedTags: selectedTags
    })
    
    this.filterNotes()
  },

  // 排序方式改变
  onSortChange(e) {
    const index = e.detail.value
    this.setData({
      sortIndex: index
    })
    
    this.filterNotes()
  },

  // 开始日期改变
  onStartDateChange(e) {
    const date = e.detail.value
    this.setData({
      startDate: date
    })
    
    this.filterNotes()
  },

  // 结束日期改变
  onEndDateChange(e) {
    const date = e.detail.value
    this.setData({
      endDate: date
    })
    
    this.filterNotes()
  },

  // 筛选笔记
  filterNotes() {
    const {
      searchKeyword,
      selectedCategory,
      selectedTags,
      sortIndex,
      startDate,
      endDate,
      allNotes
    } = this.data

    console.log('开始筛选:', {
      searchKeyword,
      selectedCategory,
      selectedTags,
      startDate,
      endDate,
      allNotesCount: allNotes.length
    })

    // 构建搜索选项
    const searchOptions = {
      category: selectedCategory || null,
      tags: selectedTags.length > 0 ? selectedTags : null,
      sortBy: this.getSortBy(sortIndex),
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
        // 设置结束时间为当天的23:59:59
        dateRange.end.setHours(23, 59, 59, 999)
      }
      
      searchOptions.dateRange = dateRange
    }

    console.log('搜索选项:', searchOptions)

    // 执行搜索
    const filteredNotes = noteManager.searchNotes(searchKeyword, searchOptions)
    
    console.log('搜索结果:', {
      keyword: searchKeyword,
      category: selectedCategory,
      tags: selectedTags,
      resultCount: filteredNotes.length,
      results: filteredNotes.map(note => ({ id: note.id, title: note.title }))
    })
    
    // 更新筛选后的笔记，但保持原始统计数据
    this.setData({
      filteredNotes: filteredNotes
    })
    
    // 如果需要显示筛选后的统计，可以取消注释下面的代码
    // const filteredStatistics = this.calculateStatistics(filteredNotes)
    // this.setData({
    //   statistics: filteredStatistics
    // })
  },

  // 获取排序字段
  getSortBy(index) {
    const sortMap = ['updateTime', 'createTime', 'title', 'wordCount']
    return sortMap[index] || 'updateTime'
  },

  // 获取分类名称
  getCategoryName(category) {
    return noteManager.getCategoryName(category)
  },

  // 获取空状态文本
  getEmptyStateText() {
    const { searchKeyword, selectedCategory, selectedTags } = this.data
    
    if (searchKeyword) {
      return `没有找到包含"${searchKeyword}"的笔记`
    }
    
    if (selectedCategory) {
      return `没有${this.getCategoryName(selectedCategory)}分类的笔记`
    }
    
    if (selectedTags.length > 0) {
      return `没有包含标签"${selectedTags.join('、')}"的笔记`
    }
    
    return '还没有笔记，去创建第一条吧！'
  },

  // 打开笔记详情
  openNote(e) {
    if (this.data.isBatchMode) {
      // 批量模式：选择/取消选择笔记
      this.toggleNoteSelection(e.currentTarget.dataset.note)
      return
    }
    
    const note = e.currentTarget.dataset.note
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${note.id}`
    })
  },

  // 切换笔记选择状态
  toggleNoteSelection(note) {
    const selectedNotes = [...this.data.selectedNotes]
    const index = selectedNotes.findIndex(n => n.id === note.id)
    
    if (index > -1) {
      selectedNotes.splice(index, 1)
    } else {
      selectedNotes.push(note)
    }
    
    this.setData({
      selectedNotes: selectedNotes
    })
  },

  // 编辑笔记
  editNote(e) {
    const note = e.currentTarget.dataset.note
    
    // 将笔记数据传递给编辑器
    const noteData = encodeURIComponent(JSON.stringify({
      id: note.id,
      title: note.title,
      content: note.content,
      category: note.category,
      tags: note.tags
    }))
    
    wx.navigateTo({
      url: `/pages/note-editor/note-editor?edit=true&note=${noteData}`
    })
  },

  // 分享笔记
  shareNote(e) {
    const note = e.currentTarget.dataset.note
    
    wx.showShareMenu({
      withShareTicket: true,
      menus: ['shareAppMessage', 'shareTimeline']
    })
    
    // 可以在这里设置分享内容
    wx.setNavigationBarTitle({
      title: `分享笔记：${note.title}`
    })
  },

  // 删除笔记
  deleteNote(e) {
    const noteId = e.currentTarget.dataset.id
    const note = this.data.filteredNotes.find(n => n.id === noteId)
    
    if (!note) return
    
    wx.showModal({
      title: '删除笔记',
      content: `确定要删除"${note.title}"吗？笔记将移到回收站，30天后自动删除。`,
      confirmColor: '#C0D3E2',
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) {
          this.confirmDeleteNote(noteId)
        }
      }
    })
  },

  // 确认删除笔记（真删除：从笔记簿完全移除，移到回收站）
  async confirmDeleteNote(noteId) {
    try {
      console.log('开始删除笔记（真删除）:', noteId)
      
      // 获取当前用户
      const userInfo = wx.getStorageSync('userInfo')
      console.log('用户信息:', userInfo)
      
      if (!userInfo || !userInfo.username) {
        console.error('用户未登录')
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // 检查笔记是否存在
      const note = this.data.filteredNotes.find(n => n.id === noteId)
      if (!note) {
        console.error('笔记不存在:', noteId)
        wx.showToast({
          title: '笔记不存在',
          icon: 'none'
        })
        return
      }
      
      console.log('找到要删除的笔记:', note.title)
      
      // ========== 从服务器删除（软删除，标记is_deleted=true）==========
      try {
        if (userInfo.token && note.serverId) {
          console.log('📤 从服务器软删除笔记:', note.serverId)
          const apiResult = await apiService.deleteNote(note.serverId)
          console.log('服务器删除结果:', apiResult)
          
          if (apiResult.success) {
            console.log('✅ 服务器软删除成功')
          } else {
            console.warn('⚠️ 服务器删除失败:', apiResult.error)
          }
        } else {
          console.log('跳过服务器删除: 无Token或无serverId')
        }
      } catch (apiError) {
        console.error('服务器删除异常:', apiError)
        // API删除失败不影响本地删除
      }
      // ========== 服务器删除结束 ==========
      
      // 真删除：从笔记簿完全移除，移到回收站（本地存储）
      console.log('执行本地真删除（移至回收站）...')
      const result = noteManager.softDeleteNote(userInfo.username, noteId)
      console.log('删除结果:', result)
      
      if (result.success) {
        console.log('✅ 笔记已从笔记簿真删除并移到回收站')
        
        // 立即从本地显示中移除，不等待API重新加载
        console.log('立即更新本地显示...')
        this.removeNoteFromLocalDisplay(noteId)
        
        wx.showToast({
          title: '已移到回收站',
          icon: 'success'
        })
      } else {
        console.error('❌ 本地删除失败:', result.error)
        throw new Error(result.error)
      }
    } catch (error) {
      console.error('删除笔记失败:', error)
      wx.showToast({
        title: `删除失败: ${error.message}`,
        icon: 'none',
        duration: 3000
      })
    }
  },

  // 从本地显示中立即移除笔记（不等待API）
  removeNoteFromLocalDisplay(noteId) {
    try {
      const allNotes = this.data.allNotes.filter(n => n.id !== noteId)
      const filteredNotes = this.data.filteredNotes.filter(n => n.id !== noteId)
      
      // 重新计算统计信息
      const statistics = this.calculateStatistics(allNotes)
      const popularTags = noteManager.getPopularTags(10)
      
      this.setData({
        allNotes: allNotes,
        filteredNotes: filteredNotes,
        statistics: statistics,
        popularTags: popularTags
      })
      
      console.log('✅ 笔记已从本地显示移除:', noteId)
    } catch (error) {
      console.error('移除笔记显示失败:', error)
      // 如果立即移除失败，回退到重新加载
      this.updateLocalDisplay()
    }
  },

  // 更新本地显示（删除后立即更新，尝试从API重新加载以获取完整数据）
  async updateLocalDisplay() {
    try {
      console.log('更新本地显示...')
      
      // 先尝试从API重新加载最新数据，确保包含所有新字段
      try {
        const userInfo = wx.getStorageSync('userInfo')
        if (userInfo && userInfo.token) {
          console.log('📥 从API重新加载最新数据...')
          
          const result = await apiService.getNotes({ page: 1, limit: 1000 })
          
          if (result.success && result.data.notes) {
            console.log(`✅ 从API加载了 ${result.data.notes.length} 条笔记`)
            
            // 处理服务器数据
            const processedNotes = result.data.notes.map(note => {
              // 处理source字段：将null转换为空字符串，trim去除空白
              const sourceValue = note.source ? String(note.source).trim() : ''
              
              return {
                id: note.id,
                title: note.title || '',
                content: note.content || '',
                category: note.category || 'knowledge',
                tags: note.tags || [],
                source: sourceValue, // 处理后的source（去除了null和空白）
                url: note.url || '',
                images: note.images || [],
                voices: note.voices || [],
                categoryTag: note.categoryTag || note.category_tag || '',
                createTime: note.createTime || note.created_at || '',
                updateTime: note.updateTime || note.updated_at || '',
                wordCount: note.wordCount || note.word_count || 0,
                isFavorite: note.isFavorite || false,
                favoriteTime: note.favoriteTime || null,
                status: note.status || 'active'
              }
            })
            
            // 保存到本地缓存
            wx.setStorageSync('notes', processedNotes)
            
            // 保存到账户存储
            if (userInfo.username) {
              noteManager.saveNotesToAccount(userInfo.username, processedNotes)
            }
            
            const statistics = this.calculateStatistics(processedNotes)
            const popularTags = noteManager.getPopularTags(10)
            
            this.setData({
              allNotes: processedNotes,
              filteredNotes: processedNotes,
              statistics: statistics,
              popularTags: popularTags
            })
            
            console.log('✅ 已更新到最新数据')
            return
          }
        }
      } catch (apiError) {
        console.log('API加载失败，使用本地缓存:', apiError)
      }
      
      // 如果API加载失败，使用本地缓存
      const cachedNotes = this.loadNotesFromCurrentAccount()
      
      if (cachedNotes.length > 0) {
        const statistics = this.calculateStatistics(cachedNotes)
        const popularTags = noteManager.getPopularTags(10)
        
        this.setData({
          allNotes: cachedNotes,
          filteredNotes: cachedNotes,
          statistics: statistics,
          popularTags: popularTags
        })
        
        console.log('✅ 本地显示更新成功:', cachedNotes.length, '条笔记')
      } else {
        // 如果没有笔记了，清空显示
        this.setData({
          allNotes: [],
          filteredNotes: [],
          statistics: {
            totalNotes: 0,
            totalWords: 0,
            totalCategories: 0,
            totalTags: 0
          },
          popularTags: []
        })
        
        console.log('✅ 本地显示已清空')
      }
    } catch (error) {
      console.error('更新本地显示失败:', error)
    }
  },

  // 跳转到编辑器
  goToEditor(e) {
    console.log('点击创建笔记按钮，准备跳转到编辑器', e)
    
    // 先显示一个简单的提示，确认点击事件被触发
    wx.showToast({
      title: '准备跳转到编辑器',
      icon: 'none',
      duration: 1000
    })
    
    // 延迟跳转，确保用户看到反馈
    setTimeout(() => {
      // 使用 switchTab 跳转到 tabBar 页面
      wx.switchTab({
        url: '/pages/note-editor/note-editor',
        success: (res) => {
          console.log('跳转成功:', res)
        },
        fail: (err) => {
          console.error('跳转失败:', err)
          wx.showToast({
            title: '跳转失败: ' + (err.errMsg || '未知错误'),
            icon: 'none',
            duration: 3000
          })
        }
      })
    }, 1000)
  },

  // 跳转到知识星图
  goToKnowledgeMap() {
    console.log('跳转到知识星图页面')
    
    wx.navigateTo({
      url: '/pages/knowledge-map/knowledge-map',
      success: (res) => {
        console.log('跳转到知识星图成功:', res)
      },
      fail: (err) => {
        console.error('跳转到知识星图失败:', err)
        wx.showToast({
          title: '跳转失败: ' + (err.errMsg || '未知错误'),
          icon: 'none',
          duration: 3000
        })
      }
    })
  },

  // 显示高级搜索
  showAdvancedSearch() {
    wx.showActionSheet({
      itemList: ['按分类筛选', '按标签筛选', '按时间筛选', '清除所有筛选'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.showCategoryFilter()
            break
          case 1:
            this.showTagFilter()
            break
          case 2:
            this.showDateFilter()
            break
          case 3:
            this.clearAllFilters()
            break
        }
      }
    })
  },

  // 显示分类筛选
  showCategoryFilter() {
    const categories = [
      { key: '', name: '全部' },
      { key: 'art', name: '艺术' },
      { key: 'cute', name: '萌物' },
      { key: 'dreams', name: '梦游' },
      { key: 'foods', name: '美食' },
      { key: 'happiness', name: '趣事' },
      { key: 'knowledge', name: '知识' },
      { key: 'sights', name: '风景' },
      { key: 'thinking', name: '思考' }
    ]
    
    const itemList = categories.map(cat => cat.name)
    const currentIndex = categories.findIndex(cat => cat.key === this.data.selectedCategory)
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedCategory = categories[res.tapIndex].key
        this.setData({
          selectedCategory: selectedCategory
        })
        this.filterNotes()
      }
    })
  },

  // 显示标签筛选
  showTagFilter() {
    if (this.data.popularTags.length === 0) {
      wx.showToast({
        title: '暂无标签',
        icon: 'none'
      })
      return
    }
    
    const itemList = this.data.popularTags.map(tag => `#${tag.name} (${tag.count})`)
    
    wx.showActionSheet({
      itemList: itemList,
      success: (res) => {
        const selectedTag = this.data.popularTags[res.tapIndex].name
        const selectedTags = [...this.data.selectedTags]
        
        if (!selectedTags.includes(selectedTag)) {
          selectedTags.push(selectedTag)
          this.setData({
            selectedTags: selectedTags
          })
          this.filterNotes()
        }
      }
    })
  },

  // 显示日期筛选
  showDateFilter() {
    wx.showActionSheet({
      itemList: ['今天', '昨天', '本周', '本月', '最近7天', '最近30天', '清除日期筛选'],
      success: (res) => {
        let startDate = ''
        let endDate = ''
        const today = new Date()
        
        switch (res.tapIndex) {
          case 0: // 今天
            startDate = this.formatDate(today)
            endDate = this.formatDate(today)
            break
          case 1: // 昨天
            const yesterday = new Date()
            yesterday.setDate(yesterday.getDate() - 1)
            startDate = this.formatDate(yesterday)
            endDate = this.formatDate(yesterday)
            break
          case 2: // 本周
            const weekStart = new Date()
            weekStart.setDate(weekStart.getDate() - weekStart.getDay())
            startDate = this.formatDate(weekStart)
            endDate = this.formatDate(today)
            break
          case 3: // 本月
            const monthStart = new Date()
            monthStart.setDate(1)
            startDate = this.formatDate(monthStart)
            endDate = this.formatDate(today)
            break
          case 4: // 最近7天
            const weekAgo = new Date()
            weekAgo.setDate(weekAgo.getDate() - 7)
            startDate = this.formatDate(weekAgo)
            endDate = this.formatDate(today)
            break
          case 5: // 最近30天
            const monthAgo = new Date()
            monthAgo.setDate(monthAgo.getDate() - 30)
            startDate = this.formatDate(monthAgo)
            endDate = this.formatDate(today)
            break
          case 6: // 清除日期筛选
            startDate = ''
            endDate = ''
            break
        }
        
        this.setData({
          startDate: startDate,
          endDate: endDate
        })
        this.filterNotes()
      }
    })
  },

  // 清除所有筛选
  clearAllFilters() {
    this.setData({
      searchKeyword: '',
      selectedCategory: '',
      selectedTags: [],
      startDate: '',
      endDate: ''
    })
    
    this.filterNotes()
    
    wx.showToast({
      title: '已清除所有筛选',
      icon: 'success'
    })
  },

  // 格式化日期
  formatDate(date) {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, '0')
    const day = String(date.getDate()).padStart(2, '0')
    return `${year}-${month}-${day}`
  },

  // 切换批量模式
  toggleBatchMode() {
    const isBatchMode = !this.data.isBatchMode
    this.setData({
      isBatchMode: isBatchMode,
      selectedNotes: isBatchMode ? [] : this.data.selectedNotes
    })
  },

  // 批量删除
  batchDelete() {
    const selectedNotes = this.data.selectedNotes
    
    if (selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '批量删除',
      content: `确定要删除选中的 ${selectedNotes.length} 条笔记吗？笔记将移到回收站，30天后自动删除。`,
      confirmColor: '#C0D3E2',
      confirmText: '删除',
      success: (res) => {
        if (res.confirm) {
          this.confirmBatchDelete()
        }
      }
    })
  },

  // 确认批量删除
  async confirmBatchDelete() {
    try {
      // 获取当前用户
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        wx.showToast({
          title: '请先登录',
          icon: 'none'
        })
        return
      }
      
      // ========== 从服务器批量删除 ==========
      try {
        if (userInfo.token) {
          const serverIds = this.data.selectedNotes
            .filter(note => note.serverId)
            .map(note => note.serverId)
          
          if (serverIds.length > 0) {
            console.log('📤 从服务器批量删除:', serverIds.length, '条')
            await apiService.batchDeleteNotes(serverIds)
            console.log('✅ 服务器批量删除成功')
          }
        }
      } catch (apiError) {
        console.error('服务器批量删除失败:', apiError)
        // API删除失败不影响本地删除
      }
      // ========== 服务器删除结束 ==========
      
      let successCount = 0
      
      // 批量软删除 - 本地存储
      this.data.selectedNotes.forEach(note => {
        const result = noteManager.softDeleteNote(userInfo.username, note.id)
        if (result.success) {
          successCount++
        }
      })
      
      // 重新加载数据
      await this.loadAllData()
      
      // 退出批量模式
      this.setData({
        isBatchMode: false,
        selectedNotes: []
      })
      
      wx.showToast({
        title: `已移动 ${successCount} 条到回收站`,
        icon: 'success'
      })
    } catch (error) {
      console.error('批量删除失败:', error)
      wx.showToast({
        title: '删除失败',
        icon: 'none'
      })
    }
  },

  // 批量导出
  batchExport() {
    const selectedNotes = this.data.selectedNotes
    
    if (selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    // 这里可以实现批量导出功能
    wx.showToast({
      title: '导出功能开发中',
      icon: 'none'
    })
  },

  // 批量标签
  batchTag() {
    const selectedNotes = this.data.selectedNotes
    
    if (selectedNotes.length === 0) {
      wx.showToast({
        title: '请先选择笔记',
        icon: 'none'
      })
      return
    }
    
    // 这里可以实现批量添加标签功能
    wx.showToast({
      title: '批量标签功能开发中',
      icon: 'none'
    })
  },

  // 页面分享
  onShareAppMessage() {
    return {
      title: '我的笔记',
      path: '/pages/my-notes/my-notes',
      imageUrl: '/images/share-notes.png'
    }
  },

  onShareTimeline() {
    return {
      title: '我的笔记',
      imageUrl: '/images/share-notes.png'
    }
  }
})
