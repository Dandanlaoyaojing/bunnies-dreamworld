// pages/sights/sights.js
Page({
  data: {
    category: 'sights',
    title: '风景世界',
    items: [
      { id: 1, title: '自然风光', image: '/images/menu/sights.png', desc: '欣赏大自然的美丽' },
      { id: 2, title: '城市景观', image: '/images/menu/sights.png', desc: '感受城市的魅力' },
      { id: 3, title: '旅行日记', image: '/images/menu/sights.png', desc: '记录旅行的美好' }
    ]
  },

  onLoad(options) {
    console.log('风景页面加载')
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
