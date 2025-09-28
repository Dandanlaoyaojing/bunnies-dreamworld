// pages/dream-realm/dream-realm.js
Page({

  /**
   * 页面的初始数据
   */
  data: {
    dreamList: [],
    currentDream: null,
    isCreating: false
  },

  /**
   * 生命周期函数--监听页面加载
   */
  onLoad(options) {
    this.loadDreams()
  },

  /**
   * 生命周期函数--监听页面初次渲染完成
   */
  onReady() {

  },

  /**
   * 生命周期函数--监听页面显示
   */
  onShow() {
    this.loadDreams()
  },

  /**
   * 生命周期函数--监听页面隐藏
   */
  onHide() {

  },

  /**
   * 生命周期函数--监听页面卸载
   */
  onUnload() {

  },

  /**
   * 页面相关事件处理函数--监听用户下拉动作
   */
  onPullDownRefresh() {
    this.loadDreams()
    wx.stopPullDownRefresh()
  },

  /**
   * 页面上拉触底事件的处理函数
   */
  onReachBottom() {

  },

  /**
   * 用户点击右上角分享
   */
  onShareAppMessage() {
    return {
      title: '梦之国度 - 记录你的美好梦境',
      path: '/pages/dream-realm/dream-realm'
    }
  },

  /**
   * 加载梦境列表
   */
  loadDreams() {
    try {
      const dreams = wx.getStorageSync('dreamList') || []
      this.setData({
        dreamList: dreams
      })
    } catch (error) {
      console.error('加载梦境失败:', error)
      wx.showToast({
        title: '加载失败',
        icon: 'error'
      })
    }
  },

  /**
   * 创建新梦境
   */
  createDream() {
    this.setData({
      isCreating: true
    })
    
    wx.showModal({
      title: '记录梦境',
      content: '你想要记录什么梦境呢？',
      editable: true,
      placeholderText: '描述你的梦境...',
      success: (res) => {
        if (res.confirm && res.content) {
          this.saveDream(res.content)
        }
        this.setData({
          isCreating: false
        })
      },
      fail: () => {
        this.setData({
          isCreating: false
        })
      }
    })
  },

  /**
   * 保存梦境
   */
  saveDream(content) {
    try {
      const newDream = {
        id: Date.now(),
        content: content,
        createTime: new Date().toISOString(),
        type: 'dream'
      }
      
      const dreams = [...this.data.dreamList, newDream]
      wx.setStorageSync('dreamList', dreams)
      
      this.setData({
        dreamList: dreams
      })
      
      wx.showToast({
        title: '梦境已保存',
        icon: 'success'
      })
    } catch (error) {
      console.error('保存梦境失败:', error)
      wx.showToast({
        title: '保存失败',
        icon: 'error'
      })
    }
  },

  /**
   * 查看梦境详情
   */
  viewDream(e) {
    const dreamId = e.currentTarget.dataset.id
    const dream = this.data.dreamList.find(d => d.id === dreamId)
    
    if (dream) {
      wx.showModal({
        title: '梦境详情',
        content: dream.content,
        showCancel: true,
        cancelText: '删除',
        confirmText: '关闭',
        success: (res) => {
          if (res.cancel) {
            this.deleteDream(dreamId)
          }
        }
      })
    }
  },

  /**
   * 删除梦境
   */
  deleteDream(dreamId) {
    wx.showModal({
      title: '确认删除',
      content: '确定要删除这个梦境吗？',
      success: (res) => {
        if (res.confirm) {
          try {
            const dreams = this.data.dreamList.filter(d => d.id !== dreamId)
            wx.setStorageSync('dreamList', dreams)
            
            this.setData({
              dreamList: dreams
            })
            
            wx.showToast({
              title: '已删除',
              icon: 'success'
            })
          } catch (error) {
            console.error('删除梦境失败:', error)
            wx.showToast({
              title: '删除失败',
              icon: 'error'
            })
          }
        }
      }
    })
  },

  /**
   * 格式化时间
   */
  formatTime(timeString) {
    const date = new Date(timeString)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) { // 1分钟内
      return '刚刚'
    } else if (diff < 3600000) { // 1小时内
      return Math.floor(diff / 60000) + '分钟前'
    } else if (diff < 86400000) { // 1天内
      return Math.floor(diff / 3600000) + '小时前'
    } else {
      return date.toLocaleDateString()
    }
  }
})
