// pages/star-cluster/star-cluster.js
const noteManager = require('../../utils/noteManager')
const authGuard = require('../../utils/authGuard')

Page({
  data: {
    // 页面状态
    showClusterDetail: false,
    showCreateModal: false,
    showFusionResult: false,
    
    // 当前用户信息
    currentUser: null,
    isLeader: false,
    
    // 星团列表
    joinedClusters: [
      {
        id: 1,
        name: 'AI探索者联盟',
        description: '专注人工智能研究的星团，汇聚了众多AI爱好者和专家',
        leaderName: '张三',
        memberCount: 12,
        createTime: '2024-01-15',
        fusionCount: 8,
        isActive: true,
        joinMode: 'approve'
      },
      {
        id: 2,
        name: '区块链创新团',
        description: '探索区块链技术在各行业的应用与创新',
        leaderName: '李四',
        memberCount: 8,
        createTime: '2024-01-20',
        fusionCount: 5,
        isActive: true,
        joinMode: 'free'
      }
    ],
    
    // 当前星团详情
    currentCluster: null,
    
    // 我的可选星图
    myAvailableStars: [
      {
        id: 'star1',
        name: '机器学习基础',
        nodeCount: 15,
        tags: ['AI', '机器学习', '算法'],
        createTime: '2024-01-20'
      },
      {
        id: 'star2',
        name: '深度学习应用',
        nodeCount: 22,
        tags: ['深度学习', '神经网络', '应用'],
        createTime: '2024-01-18'
      },
      {
        id: 'star3',
        name: '数据科学实践',
        nodeCount: 18,
        tags: ['数据科学', '分析', '可视化'],
        createTime: '2024-01-15'
      }
    ],
    
    // 我选择的星图
    mySelectedStar: null,
    
    // 滑动提示点
    scrollDots: [
      { active: true },
      { active: false },
      { active: false }
    ],
    
    // 参与融合的成员
    participatingMembers: [
      { id: 'user2', name: '李四' },
      { id: 'user3', name: '王五' }
    ],
    participatingMembersCount: 2,
    currentFusionNodes: 35,
    
    // 融合相关
    fusionResult: null,
    
    // 融合历史
    fusionHistory: [
      {
        id: 1,
        name: 'AI与区块链融合',
        createTime: '2024-01-25',
        participantCount: 3,
        nodeCount: 35,
        connectionCount: 28
      },
      {
        id: 2,
        name: '机器学习知识图谱',
        createTime: '2024-01-22',
        participantCount: 2,
        nodeCount: 25,
        connectionCount: 18
      }
    ],
    
    // 创建星团表单
    newCluster: {
      name: '',
      description: '',
      joinMode: 'approve'
    }
  },

  onLoad(options) {
    console.log('星团联盟页面加载', options)
    this.loadUserInfo()
    this.loadClusterData()
  },

  onShow() {
    console.log('星团联盟页面显示')
    // 检查登录状态
    if (!authGuard.checkPageAuth('星团联盟')) {
      return
    }
  },

  // 加载用户信息
  loadUserInfo() {
    try {
      const userInfo = wx.getStorageSync('userInfo')
      if (userInfo && userInfo.username) {
        this.setData({
          currentUser: userInfo
        })
        console.log('当前用户:', userInfo.username)
      }
    } catch (error) {
      console.error('加载用户信息失败:', error)
    }
  },

  // 加载星团数据
  loadClusterData() {
    console.log('加载星团数据')
    // 这里可以从后端API加载真实的星团数据
    // 目前使用模拟数据
  },

  // 返回上一页
  goBack() {
    if (this.data.showClusterDetail) {
      this.backToClusterList()
    } else {
      wx.navigateBack({
        delta: 1,
        fail: () => {
          wx.switchTab({
            url: '/pages/2/2'
          })
        }
      })
    }
  },

  // 返回星团列表
  backToClusterList() {
    this.setData({
      showClusterDetail: false,
      currentCluster: null,
      isLeader: false
    })
  },

  // 进入星团
  enterCluster(e) {
    const cluster = e.currentTarget.dataset.cluster
    console.log('进入星团:', cluster)
    
    // 检查是否为星主
    const isLeader = this.data.currentUser && 
                    this.data.currentUser.username === cluster.leaderName
    
    this.setData({
      showClusterDetail: true,
      currentCluster: cluster,
      isLeader: isLeader
    })
    
    // 加载星团成员数据
    this.loadClusterMembers(cluster.id)
  },

  // 加载星团成员
  loadClusterMembers(clusterId) {
    console.log('加载星团成员:', clusterId)
    // 模拟成员数据
    const members = [
      { id: 'user1', name: '张三', isOnline: true },
      { id: 'user2', name: '李四', isOnline: false },
      { id: 'user3', name: '王五', isOnline: true },
      { id: 'user4', name: '赵六', isOnline: true }
    ]
    
    this.setData({
      'currentCluster.members': members
    })
    
    // 加载成员星图数据
    this.loadMemberStars(clusterId)
    
    // 初始化融合状态
    this.updateFusionNodes()
    
    // 初始化滑动提示点
    this.initScrollDots()
  },

  // 加载成员星图
  loadMemberStars(clusterId) {
    console.log('加载成员星图:', clusterId)
    // 这里应该从后端加载每个成员的星图数据
    // 目前使用模拟数据
  },

  // 创建新星团
  createNewCluster() {
    console.log('创建新星团')
    this.setData({
      showCreateModal: true,
      newCluster: {
        name: '',
        description: '',
        joinMode: 'approve'
      }
    })
  },

  // 关闭创建星团弹窗
  closeCreateModal() {
    this.setData({
      showCreateModal: false
    })
  },

  // 星团名称输入
  onClusterNameInput(e) {
    this.setData({
      'newCluster.name': e.detail.value
    })
  },

  // 星团描述输入
  onClusterDescInput(e) {
    this.setData({
      'newCluster.description': e.detail.value
    })
  },

  // 设置加入方式
  setJoinMode(e) {
    const mode = e.currentTarget.dataset.mode
    this.setData({
      'newCluster.joinMode': mode
    })
  },

  // 确认创建星团
  confirmCreateCluster() {
    const { name, description, joinMode } = this.data.newCluster
    
    if (!name.trim()) {
      wx.showToast({
        title: '请输入星团名称',
        icon: 'none'
      })
      return
    }
    
    if (!description.trim()) {
      wx.showToast({
        title: '请输入星团描述',
        icon: 'none'
      })
      return
    }
    
    // 创建新星团
    const newCluster = {
      id: Date.now(),
      name: name.trim(),
      description: description.trim(),
      leaderName: this.data.currentUser.username,
      memberCount: 1,
      createTime: new Date().toLocaleDateString(),
      fusionCount: 0,
      isActive: true,
      joinMode: joinMode
    }
    
    // 添加到星团列表
    const joinedClusters = [...this.data.joinedClusters, newCluster]
    this.setData({
      joinedClusters: joinedClusters,
      showCreateModal: false
    })
    
    wx.showToast({
      title: '星团创建成功',
      icon: 'success'
    })
    
    console.log('新星团创建:', newCluster)
  },

  // 退出星团
  leaveCluster(e) {
    const cluster = e.currentTarget.dataset.cluster
    
    wx.showModal({
      title: '退出星团',
      content: `确定要退出星团"${cluster.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          // 从星团列表中移除
          const joinedClusters = this.data.joinedClusters.filter(c => c.id !== cluster.id)
          this.setData({
            joinedClusters: joinedClusters
          })
          
          wx.showToast({
            title: '已退出星团',
            icon: 'success'
          })
        }
      }
    })
  },

  // 邀请成员
  inviteMember() {
    wx.showModal({
      title: '邀请成员',
      content: '邀请功能开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 移除成员
  removeMember(e) {
    const member = e.currentTarget.dataset.member
    
    wx.showModal({
      title: '移除成员',
      content: `确定要移除成员"${member.name}"吗？`,
      success: (res) => {
        if (res.confirm) {
          // 从成员列表中移除
          const members = this.data.currentCluster.members.filter(m => m.id !== member.id)
          this.setData({
            'currentCluster.members': members,
            'currentCluster.memberCount': members.length
          })
          
          wx.showToast({
            title: '成员已移除',
            icon: 'success'
          })
        }
      }
    })
  },

  // 选择我的星图
  selectMyStar(e) {
    const star = e.currentTarget.dataset.star
    console.log('选择我的星图:', star)
    
    this.setData({
      mySelectedStar: star
    })
    
    // 加入融合
    this.joinFusion()
    
    wx.showToast({
      title: '已加入融合',
      icon: 'success'
    })
  },

  // 更换我的星图
  changeMyStar() {
    this.setData({
      mySelectedStar: null
    })
    
    // 退出融合
    this.exitFusion()
    
    wx.showToast({
      title: '已退出融合',
      icon: 'success'
    })
  },

  // 加入融合
  joinFusion() {
    if (!this.data.mySelectedStar) {
      wx.showToast({
        title: '请先选择星图',
        icon: 'none'
      })
      return
    }
    
    // 模拟加入融合
    const currentUser = this.data.currentUser
    if (currentUser) {
      const newParticipant = {
        id: currentUser.id || 'current_user',
        name: currentUser.username
      }
      
      // 检查是否已经在参与列表中
      const isAlreadyParticipating = this.data.participatingMembers.some(
        member => member.id === newParticipant.id
      )
      
      if (!isAlreadyParticipating) {
        const participatingMembers = [...this.data.participatingMembers, newParticipant]
        this.setData({
          participatingMembers: participatingMembers,
          participatingMembersCount: participatingMembers.length
        })
      }
    }
    
    // 更新融合节点数
    this.updateFusionNodes()
  },

  // 退出融合
  exitFusion() {
    const currentUser = this.data.currentUser
    if (currentUser) {
      const participatingMembers = this.data.participatingMembers.filter(
        member => member.id !== (currentUser.id || 'current_user')
      )
      
      this.setData({
        participatingMembers: participatingMembers,
        participatingMembersCount: participatingMembers.length
      })
    }
    
    // 更新融合节点数
    this.updateFusionNodes()
  },

  // 刷新融合
  refreshFusion() {
    wx.showLoading({
      title: '刷新融合中...'
    })
    
    setTimeout(() => {
      wx.hideLoading()
      
      // 模拟刷新融合结果
      this.updateFusionNodes()
      
      wx.showToast({
        title: '融合已刷新',
        icon: 'success'
      })
    }, 1000)
  },

  // 更新融合节点数
  updateFusionNodes() {
    const { mySelectedStar, participatingMembers } = this.data
    let totalNodes = 0
    
    // 计算所有参与成员的节点数
    if (mySelectedStar) {
      totalNodes += mySelectedStar.nodeCount
    }
    
    // 模拟其他成员的节点数
    const otherMembersNodes = participatingMembers.length * 15 // 假设每个成员平均15个节点
    totalNodes += otherMembersNodes
    
    this.setData({
      currentFusionNodes: totalNodes
    })
  },

  // 星图滑动事件
  onStarsScroll(e) {
    const scrollLeft = e.detail.scrollLeft
    const scrollWidth = e.detail.scrollWidth
    const clientWidth = e.detail.scrollWidth - scrollLeft
    
    // 计算当前应该激活的提示点
    const totalStars = this.data.myAvailableStars.length
    const currentIndex = Math.round((scrollLeft / (scrollWidth - clientWidth)) * (totalStars - 1))
    
    // 更新提示点状态
    const scrollDots = this.data.scrollDots.map((dot, index) => ({
      active: index === currentIndex
    }))
    
    this.setData({
      scrollDots: scrollDots
    })
  },

  // 滑动到底部
  onScrollToLower() {
    console.log('滑动到最右侧')
  },

  // 初始化滑动提示点
  initScrollDots() {
    const totalStars = this.data.myAvailableStars.length
    const scrollDots = Array.from({ length: totalStars }, (_, index) => ({
      active: index === 0
    }))
    
    this.setData({
      scrollDots: scrollDots
    })
  },

  // 开始融合（加入融合）
  startFusion() {
    if (!this.data.mySelectedStar) {
      wx.showToast({
        title: '请先选择您的星图',
        icon: 'none'
      })
      return
    }
    
    // 加入融合
    this.joinFusion()
    
    wx.showLoading({
      title: '正在融合...'
    })
    
    // 模拟融合过程
    setTimeout(() => {
      wx.hideLoading()
      
      // 生成融合结果
      const fusionResult = {
        nodeCount: 45,
        connectionCount: 32,
        participantCount: this.data.totalMembers,
        nodes: [
          { id: 1, name: '机器学习基础', source: '张三' },
          { id: 2, name: '深度学习应用', source: '张三' },
          { id: 3, name: '区块链原理', source: '李四' }
        ]
      }
      
      this.setData({
        fusionResult: fusionResult,
        showFusionResult: true
      })
      
      // 添加到融合历史
      const newHistory = {
        id: Date.now(),
        name: `${this.data.currentCluster.name}融合`,
        createTime: new Date().toLocaleDateString(),
        participantCount: 1 + this.data.otherMembersCount,
        nodeCount: fusionResult.nodeCount,
        connectionCount: fusionResult.connectionCount
      }
      
      const fusionHistory = [newHistory, ...this.data.fusionHistory]
      this.setData({
        fusionHistory: fusionHistory
      })
      
    }, 2000)
  },

  // 关闭融合结果弹窗
  closeFusionResult() {
    this.setData({
      showFusionResult: false
    })
  },

  // 保存融合结果
  saveFusionResult() {
    wx.showLoading({
      title: '保存中...'
    })
    
    setTimeout(() => {
      wx.hideLoading()
      wx.showToast({
        title: '融合结果已保存',
        icon: 'success'
      })
      
      this.setData({
        showFusionResult: false
      })
      
      // 重置选择
      this.exitFusion()
    }, 1000)
  },

  // 查看融合结果
  viewFusionResult(e) {
    const fusion = e.currentTarget.dataset.fusion
    console.log('查看融合结果:', fusion)
    
    wx.showModal({
      title: '融合结果详情',
      content: `融合名称: ${fusion.name}\n参与人数: ${fusion.participantCount}\n节点数量: ${fusion.nodeCount}\n连接数量: ${fusion.connectionCount}`,
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 发现星团
  discoverClusters() {
    wx.showModal({
      title: '发现星团',
      content: '发现星团功能开发中，敬请期待',
      showCancel: false,
      confirmText: '知道了'
    })
  },

  // 显示星团设置
  showClusterSettings() {
    wx.showActionSheet({
      itemList: ['星团设置', '成员管理', '融合设置'],
      success: (res) => {
        console.log('选择设置:', res.tapIndex)
        wx.showToast({
          title: '设置功能开发中',
          icon: 'none'
        })
      }
    })
  },

  // 阻止事件冒泡
  preventClose() {
    // 阻止弹窗关闭
  }
})