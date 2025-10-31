// pages/favorites/favorites.js
const noteManager = require('../../utils/noteManager')
const apiService = require('../../utils/apiService')

Page({
  data: {
    // 当前标签页
    currentTab: 'all', // all, notes, knowledge, dreams
    
    // 搜索和筛选
    searchKeyword: '',
    sortIndex: 0,
    sortOptions: ['收藏时间', '创建时间', '标题', '字数'],
    viewMode: 'list', // list, grid
    
    // 收藏数据
    favoriteNotes: [],
    favoriteKnowledge: [],
    favoriteDreams: [],
    
    // 筛选后的数据
    filteredNotes: [],
    filteredKnowledge: [],
    filteredDreams: [],
    
    // 统计信息
    totalCount: 0,
    noteCount: 0,
    knowledgeCount: 0,
    dreamCount: 0,
    totalWords: 0,
    favoriteDays: 0,
    
    // 批量操作
    isBatchMode: false,
    selectedItems: [],
    
    // 空状态
    isEmpty: false
  },

  onLoad(options) {
    console.log('收藏夹页面加载')
    this.loadFavorites()
  },

  onShow() {
    console.log('收藏夹页面显示')
    this.loadFavorites()
  },

  onPullDownRefresh() {
    this.loadFavorites()
    wx.stopPullDownRefresh()
  },

  // 加载收藏数据
  loadFavorites() {
    try {
      console.log('开始加载收藏数据')
      
      // 获取当前用户
      const userInfo = wx.getStorageSync('userInfo')
      if (!userInfo || !userInfo.username) {
        console.log('未登录，跳转到登录页')
        wx.navigateTo({
          url: '/pages/login/login'
        })
        return
      }

      // 加载收藏的笔记
      this.loadFavoriteNotes()
      
      // 加载收藏的知识星图
      this.loadFavoriteKnowledge()
      
      // 加载收藏的梦境
      this.loadFavoriteDreams()
      
      // 计算统计信息
      this.calculateStats()
      
    } catch (error) {
      console.error('加载收藏数据失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'none'
      })
    }
  },

  // 加载收藏的笔记
  async loadFavoriteNotes() {
    try {
      // 优先从服务器加载收藏列表
      let serverNotes = []
      try {
        const resp = await apiService.getFavorites()
        if (resp && resp.success) {
          // 兼容 data 为数组或对象的两种返回
          const data = resp.data
          serverNotes = Array.isArray(data) ? data : (data && data.notes ? data.notes : [])
          console.log('📥 从服务器加载收藏笔记:', serverNotes.length)
        }
      } catch (e) {
        console.warn('⚠️ 服务器收藏列表失败，回退本地:', e && e.message)
      }

      let favoriteNotes
      if (serverNotes.length > 0) {
        favoriteNotes = serverNotes.map(note => ({
          id: note.id,
          serverId: note.id,
          title: note.title || '',
          content: note.content || '',
          category: note.category || 'knowledge',
          tags: note.tags || [],
          favoriteTime: note.favoriteTime || note.favorite_time || note.updated_at || note.created_at,
          createTime: note.createTime || note.created_at,
          updateTime: note.updateTime || note.updated_at,
          wordCount: note.wordCount || note.word_count || (note.content ? note.content.length : 0)
        }))
      } else {
        // 本地回退
        const allNotes = noteManager.getAllNotes()
        const localFav = allNotes.filter(note => note.isFavorite)
        favoriteNotes = localFav.map(note => ({
          ...note,
          favoriteTime: note.favoriteTime || note.createTime
        }))
      }

      this.setData({
        favoriteNotes,
        noteCount: favoriteNotes.length
      })
    } catch (error) {
      console.error('加载收藏笔记失败:', error)
    }
  },

  // 加载收藏的知识星图
  loadFavoriteKnowledge() {
    try {
      // 使用账户专属存储获取收藏的知识星图
      const favoriteNodes = noteManager.getAccountStorage('favoriteNodes', [])
      const favoriteKnowledge = favoriteNodes.map(node => ({
        id: node.id,
        name: node.name,
        nodeCount: node.nodeCount || 0,
        connectionCount: node.connectionCount || 0,
        noteCount: node.noteCount || 0,
        favoriteTime: node.addTime,
        createTime: node.addTime
      }))
      
      this.setData({
        favoriteKnowledge,
        knowledgeCount: favoriteKnowledge.length
      })
      
      console.log('收藏知识星图数量:', favoriteKnowledge.length)
    } catch (error) {
      console.error('加载收藏知识星图失败:', error)
    }
  },

  // 加载收藏的梦境
  loadFavoriteDreams() {
    try {
      // 使用账户专属存储获取梦境历史
      const dreamHistory = noteManager.getAccountStorage('dreamHistory', [])
      const favoriteDreams = dreamHistory
        .filter(dream => dream.isCollected)
        .map(dream => ({
          id: dream.id,
          content: dream.content,
          dreamType: dream.params?.dreamType || '未知',
          dreamStyle: dream.params?.dreamStyle || '未知',
          favoriteTime: dream.collectTime || dream.createTime,
          createTime: dream.createTime
        }))
      
      this.setData({
        favoriteDreams,
        dreamCount: favoriteDreams.length
      })
      
      console.log('收藏梦境数量:', favoriteDreams.length)
    } catch (error) {
      console.error('加载收藏梦境失败:', error)
    }
  },

  // 计算统计信息
  calculateStats() {
    const { favoriteNotes, favoriteKnowledge, favoriteDreams } = this.data
    
    const totalCount = favoriteNotes.length + favoriteKnowledge.length + favoriteDreams.length
    const totalWords = favoriteNotes.reduce((sum, note) => sum + (note.wordCount || 0), 0)
    
    // 计算收藏天数
    const allFavorites = [...favoriteNotes, ...favoriteKnowledge, ...favoriteDreams]
    const favoriteDays = this.calculateFavoriteDays(allFavorites)
    
    this.setData({
      totalCount,
      totalWords,
      favoriteDays
    })
    
    // 更新筛选后的数据
    this.applyFilters()
  },

  // 计算收藏天数
  calculateFavoriteDays(favorites) {
    if (favorites.length === 0) return 0
    
    const dates = favorites.map(item => {
      const date = new Date(item.favoriteTime || item.createTime)
      return date.toDateString()
    })
    
    const uniqueDates = [...new Set(dates)]
    return uniqueDates.length
  },

  // 切换标签页
  switchTab(e) {
    const tab = e.currentTarget.dataset.tab
    this.setData({
      currentTab: tab
    })
    this.applyFilters()
  },

  // 搜索输入
  onSearchInput(e) {
    const keyword = e.detail.value
    this.setData({
      searchKeyword: keyword
    })
    this.applyFilters()
  },

  // 搜索确认
  onSearchConfirm() {
    this.applyFilters()
  },

  // 显示排序菜单
  showSortMenu() {
    const { sortOptions } = this.data
    wx.showActionSheet({
      itemList: sortOptions,
      success: (res) => {
        this.setData({
          sortIndex: res.tapIndex
        })
        this.applyFilters()
      }
    })
  },

  // 切换视图模式
  toggleViewMode() {
    const newMode = this.data.viewMode === 'list' ? 'grid' : 'list'
    this.setData({
      viewMode: newMode
    })
  },

  // 应用筛选和排序
  applyFilters() {
    const { searchKeyword, sortIndex, sortOptions, currentTab } = this.data
    
    // 筛选笔记
    let filteredNotes = this.filterItems(this.data.favoriteNotes, searchKeyword)
    filteredNotes = this.sortItems(filteredNotes, sortIndex, sortOptions)
    
    // 筛选知识星图
    let filteredKnowledge = this.filterItems(this.data.favoriteKnowledge, searchKeyword)
    filteredKnowledge = this.sortItems(filteredKnowledge, sortIndex, sortOptions)
    
    // 筛选梦境
    let filteredDreams = this.filterItems(this.data.favoriteDreams, searchKeyword)
    filteredDreams = this.sortItems(filteredDreams, sortIndex, sortOptions)
    
    this.setData({
      filteredNotes,
      filteredKnowledge,
      filteredDreams,
      isEmpty: this.checkEmptyState()
    })
  },

  // 筛选项目
  filterItems(items, keyword) {
    if (!keyword.trim()) return items
    
    const keywordLower = keyword.toLowerCase()
    return items.filter(item => {
      // 根据项目类型进行不同的搜索
      if (item.title) {
        // 笔记类型
        return item.title.toLowerCase().includes(keywordLower) ||
               item.content.toLowerCase().includes(keywordLower) ||
               item.category.toLowerCase().includes(keywordLower)
      } else if (item.name) {
        // 知识星图类型
        return item.name.toLowerCase().includes(keywordLower)
      } else if (item.content) {
        // 梦境类型
        return item.content.toLowerCase().includes(keywordLower) ||
               item.dreamType.toLowerCase().includes(keywordLower) ||
               item.dreamStyle.toLowerCase().includes(keywordLower)
      }
      return false
    })
  },

  // 排序项目
  sortItems(items, sortIndex, sortOptions) {
    const sortType = sortOptions[sortIndex]
    
    return items.sort((a, b) => {
      switch (sortType) {
        case '收藏时间':
          return new Date(b.favoriteTime || b.createTime) - new Date(a.favoriteTime || a.createTime)
        case '创建时间':
          return new Date(b.createTime) - new Date(a.createTime)
        case '标题':
          const titleA = a.title || a.name || ''
          const titleB = b.title || b.name || ''
          return titleA.localeCompare(titleB)
        case '字数':
          const wordsA = a.wordCount || a.content?.length || 0
          const wordsB = b.wordCount || b.content?.length || 0
          return wordsB - wordsA
        default:
          return 0
      }
    })
  },

  // 检查空状态
  checkEmptyState() {
    const { currentTab, filteredNotes, filteredKnowledge, filteredDreams } = this.data
    
    switch (currentTab) {
      case 'notes':
        return filteredNotes.length === 0
      case 'knowledge':
        return filteredKnowledge.length === 0
      case 'dreams':
        return filteredDreams.length === 0
      default:
        return filteredNotes.length === 0 && filteredKnowledge.length === 0 && filteredDreams.length === 0
    }
  },

  // 打开笔记详情
  openNoteDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/note-detail/note-detail?id=${id}`
    })
  },

  // 打开知识星图
  openKnowledgeMap(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/knowledge-map/knowledge-map?nodeId=${id}`
    })
  },

  // 打开梦境详情
  openDreamDetail(e) {
    const id = e.currentTarget.dataset.id
    wx.navigateTo({
      url: `/pages/dream-collection/dream-collection?dreamId=${id}`
    })
  },

  // 从收藏中移除
  removeFromFavorites(e) {
    const { id, type } = e.currentTarget.dataset
    
    wx.showModal({
      title: '确认移除',
      content: '确定要从收藏中移除这个项目吗？',
      success: (res) => {
        if (res.confirm) {
          this.removeFavoriteItem(id, type)
        }
      }
    })
  },

  // 移除收藏项目
  removeFavoriteItem(id, type) {
    try {
      switch (type) {
        case 'note':
          this.removeFavoriteNote(id)
          break
        case 'knowledge':
          this.removeFavoriteKnowledge(id)
          break
        case 'dream':
          this.removeFavoriteDream(id)
          break
      }
      
      wx.showToast({
        title: '已移除收藏',
        icon: 'success'
      })
      
      // 重新加载数据
      this.loadFavorites()
      
    } catch (error) {
      console.error('移除收藏失败:', error)
      wx.showToast({
        title: '移除失败',
        icon: 'none'
      })
    }
  },

  // 移除收藏的笔记
  async removeFavoriteNote(id) {
    try {
      // 优先调用服务器取消收藏
      const resp = await apiService.unfavoriteNote(id)
      if (!(resp && resp.success)) {
        console.warn('⚠️ 服务器取消收藏失败，回退本地')
        const nm = require('../../utils/noteManager')
        nm.toggleFavorite(id)
      }
    } catch (e) {
      console.warn('⚠️ 取消收藏异常，回退本地:', e && e.message)
      const nm = require('../../utils/noteManager')
      nm.toggleFavorite(id)
    }
  },

  // 移除收藏的知识星图
  removeFavoriteKnowledge(id) {
    const favoriteNodes = noteManager.getAccountStorage('favoriteNodes', [])
    const updatedNodes = favoriteNodes.filter(node => node.id !== id)
    noteManager.setAccountStorage('favoriteNodes', updatedNodes)
  },

  // 移除收藏的梦境
  removeFavoriteDream(id) {
    const dreamHistory = noteManager.getAccountStorage('dreamHistory', [])
    const updatedDreams = dreamHistory.map(dream => {
      if (dream.id === id) {
        return { ...dream, isCollected: false }
      }
      return dream
    })
    noteManager.setAccountStorage('dreamHistory', updatedDreams)
  },

  // 分享笔记
  shareNote(e) {
    const id = e.currentTarget.dataset.id
    const note = this.data.favoriteNotes.find(n => n.id === id)
    if (note) {
      // 提供多种分享方式
      wx.showActionSheet({
        itemList: ['复制到剪贴板', '分享给朋友', '生成分享图片'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              // 复制到剪贴板
              wx.setClipboardData({
                data: `📝 ${note.title}\n\n${note.content}\n\n--- 来自小兔的梦幻世界笔记本`,
                success: () => {
                  wx.showToast({
                    title: '内容已复制',
                    icon: 'success'
                  })
                }
              })
              break
            case 1:
              // 分享给朋友
              wx.showShareMenu({
                withShareTicket: true,
                success: () => {
                  wx.showToast({
                    title: '请选择分享方式',
                    icon: 'none'
                  })
                }
              })
              break
            case 2:
              // 生成分享图片（功能开发中）
              wx.showToast({
                title: '分享图片功能开发中',
                icon: 'none'
              })
              break
          }
        }
      })
    }
  },

  // 分享知识星图
  shareKnowledge(e) {
    const id = e.currentTarget.dataset.id
    const knowledge = this.data.favoriteKnowledge.find(k => k.id === id)
    if (knowledge) {
      // 提供多种分享方式
      wx.showActionSheet({
        itemList: ['复制到剪贴板', '分享给朋友', '生成分享图片'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              // 复制到剪贴板
              wx.setClipboardData({
                data: `🌟 知识星图：${knowledge.name}\n\n📊 统计信息：\n• 节点数：${knowledge.nodeCount}\n• 关联数：${knowledge.connectionCount}\n• 相关笔记：${knowledge.noteCount}条\n\n--- 来自小兔的梦幻世界笔记本`,
                success: () => {
                  wx.showToast({
                    title: '内容已复制',
                    icon: 'success'
                  })
                }
              })
              break
            case 1:
              // 分享给朋友
              wx.showShareMenu({
                withShareTicket: true,
                success: () => {
                  wx.showToast({
                    title: '请选择分享方式',
                    icon: 'none'
                  })
                }
              })
              break
            case 2:
              // 生成分享图片（功能开发中）
              wx.showToast({
                title: '分享图片功能开发中',
                icon: 'none'
              })
              break
          }
        }
      })
    }
  },

  // 分享梦境
  shareDream(e) {
    const id = e.currentTarget.dataset.id
    const dream = this.data.favoriteDreams.find(d => d.id === id)
    if (dream) {
      // 提供多种分享方式
      wx.showActionSheet({
        itemList: ['复制到剪贴板', '分享给朋友', '生成分享图片'],
        success: (res) => {
          switch (res.tapIndex) {
            case 0:
              // 复制到剪贴板
              wx.setClipboardData({
                data: `💭 梦境分享\n\n🎭 类型：${dream.dreamType}\n🎨 风格：${dream.dreamStyle}\n\n📖 梦境内容：\n${dream.content}\n\n--- 来自小兔的梦幻世界笔记本`,
                success: () => {
                  wx.showToast({
                    title: '内容已复制',
                    icon: 'success'
                  })
                }
              })
              break
            case 1:
              // 分享给朋友
              wx.showShareMenu({
                withShareTicket: true,
                success: () => {
                  wx.showToast({
                    title: '请选择分享方式',
                    icon: 'none'
                  })
                }
              })
              break
            case 2:
              // 生成分享图片（功能开发中）
              wx.showToast({
                title: '分享图片功能开发中',
                icon: 'none'
              })
              break
          }
        }
      })
    }
  },

  // 切换批量模式
  toggleBatchMode() {
    this.setData({
      isBatchMode: !this.data.isBatchMode,
      selectedItems: []
    })
  },

  // 取消批量操作
  cancelBatch() {
    this.setData({
      isBatchMode: false,
      selectedItems: []
    })
  },

  // 批量删除
  batchDelete() {
    const { selectedItems } = this.data
    if (selectedItems.length === 0) {
      wx.showToast({
        title: '请选择要删除的项目',
        icon: 'none'
      })
      return
    }
    
    wx.showModal({
      title: '确认删除',
      content: `确定要删除选中的 ${selectedItems.length} 个项目吗？`,
      success: (res) => {
        if (res.confirm) {
          this.performBatchDelete()
        }
      }
    })
  },

  // 执行批量删除
  performBatchDelete() {
    const { selectedItems } = this.data
    
    selectedItems.forEach(item => {
      this.removeFavoriteItem(item.id, item.type)
    })
    
    this.setData({
      isBatchMode: false,
      selectedItems: []
    })
    
    wx.showToast({
      title: '批量删除完成',
      icon: 'success'
    })
  },

  // 显示添加菜单
  showAddMenu() {
    wx.showActionSheet({
      itemList: ['添加笔记到收藏', '添加知识星图到收藏', '添加梦境到收藏'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            wx.navigateTo({
              url: '/pages/my-notes/my-notes'
            })
            break
          case 1:
            wx.navigateTo({
              url: '/pages/knowledge-map/knowledge-map'
            })
            break
          case 2:
            wx.navigateTo({
              url: '/pages/dream-nation/dream-nation'
            })
            break
        }
      }
    })
  },

  // 显示设置
  showSettings() {
    wx.showActionSheet({
      itemList: ['导出收藏数据', '清空所有收藏', '收藏设置', '关于收藏夹'],
      success: (res) => {
        switch (res.tapIndex) {
          case 0:
            this.exportFavorites()
            break
          case 1:
            this.clearAllFavorites()
            break
          case 2:
            this.showFavoriteSettings()
            break
          case 3:
            this.showAbout()
            break
        }
      }
    })
  },

  // 导出收藏数据
  exportFavorites() {
    const { favoriteNotes, favoriteKnowledge, favoriteDreams } = this.data
    const exportData = {
      notes: favoriteNotes,
      knowledge: favoriteKnowledge,
      dreams: favoriteDreams,
      exportTime: new Date().toISOString()
    }
    
    wx.setClipboardData({
      data: JSON.stringify(exportData, null, 2),
      success: () => {
        wx.showToast({
          title: '数据已复制到剪贴板',
          icon: 'success'
        })
      }
    })
  },

  // 清空所有收藏
  clearAllFavorites() {
    wx.showModal({
      title: '确认清空',
      content: '确定要清空所有收藏吗？此操作不可恢复！',
      success: (res) => {
        if (res.confirm) {
          // 清空笔记收藏
          const allNotes = noteManager.getAllNotes()
          allNotes.forEach(note => {
            if (note.isFavorite) {
              noteManager.toggleFavorite(note.id)
            }
          })
          
          // 清空知识星图收藏（使用账户专属存储）
          noteManager.removeAccountStorage('favoriteNodes')
          
          // 清空梦境收藏（使用账户专属存储）
          const dreamHistory = noteManager.getAccountStorage('dreamHistory', [])
          const updatedDreams = dreamHistory.map(dream => ({
            ...dream,
            isCollected: false
          }))
          noteManager.setAccountStorage('dreamHistory', updatedDreams)
          
          wx.showToast({
            title: '已清空所有收藏',
            icon: 'success'
          })
          
          this.loadFavorites()
        }
      }
    })
  },

  // 显示收藏设置
  showFavoriteSettings() {
    wx.showModal({
      title: '收藏设置',
      content: '收藏设置功能开发中，敬请期待！',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 显示关于信息
  showAbout() {
    wx.showModal({
      title: '关于收藏夹',
      content: '收藏夹可以收藏你喜欢的笔记、知识星图和梦境，帮助你整理和回顾重要的内容。',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 返回上一页
  goBack() {
    wx.navigateBack()
  },

  // 去首页
  goToHome() {
    wx.switchTab({
      url: '/pages/1/1'
    })
  }
})