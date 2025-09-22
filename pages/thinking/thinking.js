// pages/thinking/thinking.js
Page({
  data: {
    category: 'thinking',
    title: '思考世界',
    items: [
      { id: 1, title: '哲学思考', image: '/images/menu/thinking.png', desc: '探索人生的哲理' },
      { id: 2, title: '创意灵感', image: '/images/menu/thinking.png', desc: '激发创意的火花' },
      { id: 3, title: '深度阅读', image: '/images/menu/thinking.png', desc: '享受阅读的乐趣' }
    ]
  },

  onLoad(options) {
    console.log('思考页面加载')
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
