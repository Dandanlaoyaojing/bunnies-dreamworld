// pages/star-river/star-river.js
const noteManager = require('../../utils/noteManager')
const authGuard = require('../../utils/authGuard')

Page({
  data: {
    // 视图模式
    viewMode: 'cloud', // cloud | list
    
    // 筛选和排序
    selectedTags: [],
    sortMode: 'gravity', // gravity | heat | new
    popularTags: ['AI', '区块链', '量子计算', '机器学习', '深度学习', '物联网', '大数据', '云计算'],
    
    // 星云数据
    starCloud: [
      {
        id: 1,
        name: '人工智能的未来',
        description: '探讨AI技术发展趋势',
        author: '张三',
        tags: ['AI', '技术'],
        likes: 128,
        comments: 23,
        createTime: '2024-01-15',
        isHot: true,
        isNew: false,
        x: 20,
        y: 30,
        content: '人工智能正在改变我们的世界，从机器学习到深度学习，每一项技术都在推动着人类文明的进步。'
      },
      {
        id: 2,
        name: '区块链革命',
        description: '去中心化技术的应用',
        author: '李四',
        tags: ['区块链', '去中心化'],
        likes: 95,
        comments: 18,
        createTime: '2024-01-16',
        isHot: false,
        isNew: true,
        x: 60,
        y: 20,
        content: '区块链技术正在重塑金融、供应链、数字身份等多个领域，其去中心化的特性为传统行业带来了新的可能性。'
      },
      {
        id: 3,
        name: '量子计算突破',
        description: '量子算法的创新应用',
        author: '王五',
        tags: ['量子计算', '算法'],
        likes: 76,
        comments: 12,
        createTime: '2024-01-17',
        isHot: false,
        isNew: false,
        x: 40,
        y: 60,
        content: '量子计算利用量子力学现象进行信息处理，在某些问题上具有指数级的计算优势。'
      },
      {
        id: 4,
        name: '机器学习实践',
        description: 'ML算法的实际应用案例',
        author: '赵六',
        tags: ['机器学习', '算法'],
        likes: 89,
        comments: 15,
        createTime: '2024-01-18',
        isHot: true,
        isNew: false,
        x: 80,
        y: 40,
        content: '机器学习算法在实际项目中的应用，从数据预处理到模型部署的完整流程。'
      }
    ],
    
    // 实时星讯
    starNews: [
      {
        id: 1,
        icon: '✨',
        content: '新星"深度学习优化"刚刚诞生',
        time: '2分钟前'
      },
      {
        id: 2,
        icon: '🔥',
        content: '星团"AI探索者联盟"热度飙升',
        time: '5分钟前'
      },
      {
        id: 3,
        icon: '💫',
        content: '用户张三创建了新的星际连接',
        time: '8分钟前'
      },
      {
        id: 4,
        icon: '🌟',
        content: '今日奇观：量子纠缠现象被发现',
        time: '12分钟前'
      }
    ],
    
    // 特色星团
    featuredClusters: [
      {
        id: 1,
        name: 'AI探索者联盟',
        description: '专注人工智能研究',
        icon: '🤖',
        members: 12,
        stars: 45
      },
      {
        id: 2,
        name: '区块链创新团',
        description: '区块链技术应用',
        icon: '⛓️',
        members: 8,
        stars: 32
      },
      {
        id: 3,
        name: '量子物理研究组',
        description: '量子计算与物理',
        icon: '⚛️',
        members: 6,
        stars: 28
      }
    ],
    
    // 今日奇观
    todayWonder: {
      icon: '🌌',
      title: '量子纠缠现象',
      description: '两个粒子之间的神秘联系，即使相隔千里也能瞬间影响彼此的状态。'
    },
    
    // 弹窗状态
    showStarDetail: false,
    selectedStar: null
  },

  onLoad(options) {
    console.log('星河漫游页面加载', options)
    this.loadRiverData()
  },

  onShow() {
    console.log('星河漫游页面显示')
    // 检查登录状态
    if (!authGuard.checkPageAuth('星河漫游')) {
      return
    }
  },

  // 加载星河数据
  loadRiverData() {
    console.log('加载星河数据')
    // 模拟从后端加载数据
    this.generateStarPositions()
  },

  // 生成星星位置
  generateStarPositions() {
    const stars = this.data.starCloud.map((star, index) => ({
      ...star,
      x: Math.random() * 80 + 10, // 10-90%
      y: Math.random() * 60 + 20, // 20-80%
      // 根据重要程度分配级别（使用知识星图的配色方案）
      level: this.getStarLevel(star)
    }))
    
    this.setData({
      starCloud: stars
    })
  },

  // 根据星星属性确定级别
  getStarLevel(star) {
    // 根据点赞数、评论数、是否热门等确定级别
    const score = (star.likes || 0) + (star.comments || 0) * 2
    
    if (star.isHot || score > 150) {
      return 1 // 最高级别 - 蓝紫色
    } else if (score > 100) {
      return 2 // 第二级别 - 粉紫色
    } else if (score > 50) {
      return 3 // 第三级别 - 浅紫色
    } else {
      return 4 // 第四级别 - 更浅的紫色
    }
  },

  // 返回上一页
  goBack() {
    wx.navigateBack({
      delta: 1
    })
  },

  // 显示星河设置
  showRiverSettings() {
    console.log('显示星河设置')
    wx.showActionSheet({
      itemList: ['筛选设置', '排序设置', '显示设置'],
      success: (res) => {
        console.log('选择设置:', res.tapIndex)
        wx.showToast({
          title: '设置功能开发中',
          icon: 'none'
        })
      }
    })
  },

  // 切换标签筛选
  toggleTag(e) {
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
    
    this.filterStars()
  },

  // 设置排序模式
  setSortMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      sortMode: mode
    })
    
    this.sortStars()
  },

  // 设置视图模式
  setViewMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      viewMode: mode
    })
  },

  // 筛选星星
  filterStars() {
    const { selectedTags, starCloud } = this.data
    
    if (selectedTags.length === 0) {
      this.setData({
        filteredStars: starCloud
      })
      return
    }
    
    const filteredStars = starCloud.filter(star => 
      star.tags.some(tag => selectedTags.includes(tag))
    )
    
    this.setData({
      filteredStars: filteredStars
    })
  },

  // 排序星星
  sortStars() {
    const { sortMode, starCloud } = this.data
    let sortedStars = [...starCloud]
    
    switch (sortMode) {
      case 'gravity':
        // 按关联度排序（模拟）
        sortedStars.sort((a, b) => b.likes - a.likes)
        break
      case 'heat':
        // 按热度排序
        sortedStars.sort((a, b) => (b.likes + b.comments) - (a.likes + a.comments))
        break
      case 'new':
        // 按时间排序
        sortedStars.sort((a, b) => new Date(b.createTime) - new Date(a.createTime))
        break
    }
    
    this.setData({
      starCloud: sortedStars
    })
  },

  // 刷新星讯
  refreshNews() {
    console.log('刷新星讯')
    wx.showLoading({
      title: '刷新中...'
    })
    
    setTimeout(() => {
      wx.hideLoading()
      
      // 模拟新星讯
      const newNews = {
        id: Date.now(),
        icon: '✨',
        content: '新星"神经网络优化"刚刚诞生',
        time: '刚刚'
      }
      
      const starNews = [newNews, ...this.data.starNews.slice(0, 3)]
      
      this.setData({
        starNews: starNews
      })
      
      wx.showToast({
        title: '刷新完成',
        icon: 'success'
      })
    }, 1000)
  },

  // 显示星星详情
  showStarDetail(e) {
    const star = e.currentTarget.dataset.star
    console.log('显示星星详情', star)
    
    this.setData({
      selectedStar: star,
      showStarDetail: true
    })
  },

  // 关闭星星详情
  closeStarDetail() {
    this.setData({
      showStarDetail: false,
      selectedStar: null
    })
  },

  // 阻止弹窗关闭
  preventClose() {
    // 阻止事件冒泡
  },

  // 切换点赞
  toggleLike() {
    const { selectedStar, starCloud } = this.data
    
    if (!authGuard.requireLogin(() => {
      const updatedStar = {
        ...selectedStar,
        isLiked: !selectedStar.isLiked,
        likes: selectedStar.isLiked ? selectedStar.likes - 1 : selectedStar.likes + 1
      }
      
      const updatedCloud = starCloud.map(star => 
        star.id === selectedStar.id ? updatedStar : star
      )
      
      this.setData({
        selectedStar: updatedStar,
        starCloud: updatedCloud
      })
      
      wx.showToast({
        title: updatedStar.isLiked ? '已点赞' : '已取消点赞',
        icon: 'success'
      })
    })) {
      return
    }
  },

  // 添加评论
  addComment() {
    console.log('添加评论')
    
    if (!authGuard.requireLogin(() => {
      wx.navigateTo({
        url: '/pages/star-comment/star-comment?starId=' + this.data.selectedStar.id
      })
    })) {
      return
    }
  },

  // 创建连接
  createConnection() {
    console.log('创建连接')
    
    if (!authGuard.requireLogin(() => {
      wx.showActionSheet({
        itemList: ['连接到我的星图', '创建虫洞链接', '建立关联关系'],
        success: (res) => {
          console.log('选择连接方式:', res.tapIndex)
          wx.showToast({
            title: '连接功能开发中',
            icon: 'none'
          })
        }
      })
    })) {
      return
    }
  },

  // 访问星团
  visitCluster(e) {
    const cluster = e.currentTarget.dataset.cluster
    console.log('访问星团', cluster)
    
    wx.navigateTo({
      url: '/pages/star-cluster/star-cluster?clusterId=' + cluster.id
    })
  },

  // 查看奇观
  viewWonder() {
    console.log('查看今日奇观')
    wx.navigateTo({
      url: '/pages/wonder-detail/wonder-detail'
    })
  },

  // 前往我的星图
  goToMyStars() {
    console.log('前往我的星图')
    
    if (!authGuard.requireLogin(() => {
      wx.navigateTo({
        url: '/pages/my-notes/my-notes'
      })
    })) {
      return
    }
  },

  // 创建新星
  createNewStar() {
    console.log('创建新星')
    
    if (!authGuard.requireLogin(() => {
      wx.navigateTo({
        url: '/pages/note-editor/note-editor'
      })
    })) {
      return
    }
  },

  // 显示连接
  showConnections() {
    console.log('显示星际连接')
    
    if (!authGuard.requireLogin(() => {
      wx.navigateTo({
        url: '/pages/star-connections/star-connections'
      })
    })) {
      return
    }
  }
})
