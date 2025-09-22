// pages/happiness/happiness.js
Page({
  data: {
    category: 'happiness',
    title: '趣事世界',
    items: [
      { id: 1, title: '搞笑段子', image: '/images/menu/happiness.png', desc: '分享快乐的段子' },
      { id: 2, title: '趣味游戏', image: '/images/menu/happiness.png', desc: '一起玩有趣的游戏' },
      { id: 3, title: '开心一刻', image: '/images/menu/happiness.png', desc: '记录开心的时刻' }
    ]
  },

  onLoad(options) {
    console.log('趣事页面加载')
  },

  onItemTap(e) {
    const item = e.currentTarget.dataset.item
    wx.showToast({
      title: `点击了${item.title}`,
      icon: 'none'
    })
  },

  goHome() {
    wx.switchTab({
      url: '/pages/1/1'
    })
  }
})
