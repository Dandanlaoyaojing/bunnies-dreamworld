// 文件管理服务
// 处理文件上传、下载、管理等功能

const apiService = require('./apiService.js')

class FileService {
  constructor() {
    this.maxFileSize = 10 * 1024 * 1024 // 10MB
    this.supportedImageTypes = ['jpg', 'jpeg', 'png', 'gif', 'webp']
    this.supportedAudioTypes = ['mp3', 'wav', 'aac', 'm4a']
    this.uploadQueue = []
    this.isUploading = false
  }

  /**
   * 选择并上传图片
   */
  async uploadImage(options = {}) {
    try {
      const {
        count = 1,
        sizeType = ['compressed'],
        sourceType = ['album', 'camera'],
        noteId = null,
        compress = true
      } = options

      console.log('📷 选择图片...')
      
      const chooseResult = await this.chooseImage({
        count,
        sizeType,
        sourceType
      })

      if (!chooseResult.success) {
        return chooseResult
      }

      const uploadResults = []
      
      for (const tempFilePath of chooseResult.data.tempFilePaths) {
        try {
          // 获取文件信息
          const fileInfo = await this.getFileInfo(tempFilePath)
          
          // 检查文件大小
          if (fileInfo.size > this.maxFileSize) {
            uploadResults.push({
              success: false,
              error: '文件大小超过10MB限制',
              tempFilePath
            })
            continue
          }

          // 压缩图片（如果需要）
          let finalFilePath = tempFilePath
          let compressionInfo = null
          
          if (compress && fileInfo.size > 500 * 1024) { // 大于500KB时压缩
            const compressResult = await this.compressImage(tempFilePath)
            if (compressResult.success) {
              finalFilePath = compressResult.data.compressedPath
              compressionInfo = compressResult.data.compressionInfo
            }
          }

          // 转换为Base64
          const base64Result = await this.fileToBase64(finalFilePath)
          if (!base64Result.success) {
            uploadResults.push({
              success: false,
              error: '文件转换失败',
              tempFilePath
            })
            continue
          }

          // 上传到服务器
          const uploadData = {
            imageData: base64Result.data,
            imageName: this.getFileName(tempFilePath),
            noteId,
            compress
          }

          if (compressionInfo) {
            uploadData.compressionInfo = compressionInfo
          }

          const uploadResult = await apiService.uploadImage(uploadData)
          
          if (uploadResult.success) {
            uploadResults.push({
              success: true,
              data: uploadResult.data,
              tempFilePath,
              compressionInfo
            })
          } else {
            uploadResults.push({
              success: false,
              error: uploadResult.message || '上传失败',
              tempFilePath
            })
          }
        } catch (err) {
          console.error('上传图片失败:', err)
          uploadResults.push({
            success: false,
            error: err.message || '上传失败',
            tempFilePath
          })
        }
      }

      const successCount = uploadResults.filter(r => r.success).length
      const failCount = uploadResults.filter(r => !r.success).length

      return {
        success: successCount > 0,
        message: `上传完成，成功${successCount}个，失败${failCount}个`,
        data: {
          results: uploadResults,
          successCount,
          failCount
        }
      }
    } catch (err) {
      console.error('❌ 上传图片失败:', err)
      return {
        success: false,
        message: err.message || '上传失败',
        error: err
      }
    }
  }

  /**
   * 选择并上传语音
   */
  async uploadAudio(options = {}) {
    try {
      const {
        duration = 60000, // 60秒
        noteId = null
      } = options

      console.log('🎤 录制语音...')
      
      const recordResult = await this.recordAudio(duration)
      if (!recordResult.success) {
        return recordResult
      }

      const tempFilePath = recordResult.data.tempFilePath
      
      try {
        // 获取文件信息
        const fileInfo = await this.getFileInfo(tempFilePath)
        
        // 检查文件大小
        if (fileInfo.size > this.maxFileSize) {
          return {
            success: false,
            message: '语音文件大小超过10MB限制'
          }
        }

        // 转换为Base64
        const base64Result = await this.fileToBase64(tempFilePath)
        if (!base64Result.success) {
          return {
            success: false,
            message: '文件转换失败'
          }
        }

        // 上传到服务器
        const uploadData = {
          audioData: base64Result.data,
          audioName: this.getFileName(tempFilePath),
          noteId,
          duration: recordResult.data.duration
        }

        const uploadResult = await apiService.uploadAudio(uploadData)
        
        if (uploadResult.success) {
          return {
            success: true,
            message: '语音上传成功',
            data: uploadResult.data
          }
        } else {
          return {
            success: false,
            message: uploadResult.message || '上传失败'
          }
        }
      } finally {
        // 清理临时文件
        this.cleanupTempFile(tempFilePath)
      }
    } catch (err) {
      console.error('❌ 上传语音失败:', err)
      return {
        success: false,
        message: err.message || '上传失败',
        error: err
      }
    }
  }

  /**
   * 选择图片
   */
  chooseImage(options) {
    return new Promise((resolve) => {
      wx.chooseImage({
        ...options,
        success: (res) => {
          resolve({
            success: true,
            data: res
          })
        },
        fail: (err) => {
          console.error('选择图片失败:', err)
          resolve({
            success: false,
            message: err.errMsg || '选择图片失败',
            error: err
          })
        }
      })
    })
  }

  /**
   * 录制语音
   */
  recordAudio(duration) {
    return new Promise((resolve) => {
      const recorderManager = wx.getRecorderManager()
      
      recorderManager.onStart(() => {
        console.log('🎤 开始录制...')
      })
      
      recorderManager.onStop((res) => {
        console.log('🎤 录制完成:', res)
        resolve({
          success: true,
          data: {
            tempFilePath: res.tempFilePath,
            duration: res.duration
          }
        })
      })
      
      recorderManager.onError((err) => {
        console.error('录制失败:', err)
        resolve({
          success: false,
          message: err.errMsg || '录制失败',
          error: err
        })
      })
      
      // 开始录制
      recorderManager.start({
        duration,
        sampleRate: 16000,
        numberOfChannels: 1,
        encodeBitRate: 96000,
        format: 'mp3'
      })
    })
  }

  /**
   * 获取文件信息
   */
  getFileInfo(filePath) {
    return new Promise((resolve) => {
      wx.getFileInfo({
        filePath,
        success: (res) => {
          resolve({
            success: true,
            data: res
          })
        },
        fail: (err) => {
          console.error('获取文件信息失败:', err)
          resolve({
            success: false,
            message: err.errMsg || '获取文件信息失败',
            error: err
          })
        }
      })
    })
  }

  /**
   * 压缩图片
   */
  compressImage(filePath, quality = 0.7) {
    return new Promise((resolve) => {
      wx.compressImage({
        src: filePath,
        quality,
        success: (res) => {
          const originalSize = this.getFileSize(filePath)
          const compressedSize = this.getFileSize(res.tempFilePath)
          
          resolve({
            success: true,
            data: {
              compressedPath: res.tempFilePath,
              compressionInfo: {
                originalSize,
                compressedSize,
                compressionRatio: ((originalSize - compressedSize) / originalSize * 100).toFixed(1)
              }
            }
          })
        },
        fail: (err) => {
          console.error('压缩图片失败:', err)
          resolve({
            success: false,
            message: err.errMsg || '压缩失败',
            error: err
          })
        }
      })
    })
  }

  /**
   * 文件转Base64
   */
  fileToBase64(filePath) {
    return new Promise((resolve) => {
      wx.getFileSystemManager().readFile({
        filePath,
        encoding: 'base64',
        success: (res) => {
          // 获取文件类型
          const fileType = this.getFileType(filePath)
          const base64Data = `data:${fileType};base64,${res.data}`
          
          resolve({
            success: true,
            data: base64Data
          })
        },
        fail: (err) => {
          console.error('文件转Base64失败:', err)
          resolve({
            success: false,
            message: err.errMsg || '文件转换失败',
            error: err
          })
        }
      })
    })
  }

  /**
   * 获取文件列表
   */
  async getFileList(params = {}) {
    try {
      console.log('📁 获取文件列表...')
      
      const result = await apiService.getFileList(params)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取文件列表失败')
      }
    } catch (err) {
      console.error('❌ 获取文件列表失败:', err)
      return {
        success: false,
        message: err.message || '获取文件列表失败',
        error: err
      }
    }
  }

  /**
   * 删除文件
   */
  async deleteFile(fileId) {
    try {
      console.log(`🗑️ 删除文件 ${fileId}...`)
      
      const result = await apiService.deleteFile(fileId)
      
      if (result.success) {
        return {
          success: true,
          message: '删除成功'
        }
      } else {
        throw new Error(result.message || '删除失败')
      }
    } catch (err) {
      console.error('❌ 删除文件失败:', err)
      return {
        success: false,
        message: err.message || '删除失败',
        error: err
      }
    }
  }

  /**
   * 获取文件信息
   */
  async getFileInfo(fileId) {
    try {
      console.log(`📄 获取文件信息 ${fileId}...`)
      
      const result = await apiService.getFileInfo(fileId)
      
      if (result.success) {
        return {
          success: true,
          data: result.data
        }
      } else {
        throw new Error(result.message || '获取文件信息失败')
      }
    } catch (err) {
      console.error('❌ 获取文件信息失败:', err)
      return {
        success: false,
        message: err.message || '获取文件信息失败',
        error: err
      }
    }
  }

  /**
   * 预览文件
   */
  previewFile(filePath, fileType) {
    try {
      if (this.supportedImageTypes.includes(fileType.toLowerCase())) {
        // 预览图片
        wx.previewImage({
          urls: [filePath],
          current: filePath
        })
      } else {
        // 其他文件类型，显示提示
        wx.showModal({
          title: '文件预览',
          content: '该文件类型暂不支持预览',
          showCancel: false
        })
      }
    } catch (err) {
      console.error('预览文件失败:', err)
      wx.showToast({
        title: '预览失败',
        icon: 'none'
      })
    }
  }

  /**
   * 保存文件到相册
   */
  saveImageToPhotosAlbum(filePath) {
    return new Promise((resolve) => {
      wx.saveImageToPhotosAlbum({
        filePath,
        success: () => {
          wx.showToast({
            title: '保存成功',
            icon: 'success'
          })
          resolve({
            success: true,
            message: '保存成功'
          })
        },
        fail: (err) => {
          console.error('保存到相册失败:', err)
          wx.showToast({
            title: '保存失败',
            icon: 'none'
          })
          resolve({
            success: false,
            message: err.errMsg || '保存失败',
            error: err
          })
        }
      })
    })
  }

  /**
   * 获取文件名
   */
  getFileName(filePath) {
    const parts = filePath.split('/')
    return parts[parts.length - 1]
  }

  /**
   * 获取文件类型
   */
  getFileType(filePath) {
    const fileName = this.getFileName(filePath)
    const extension = fileName.split('.').pop().toLowerCase()
    
    const typeMap = {
      'jpg': 'image/jpeg',
      'jpeg': 'image/jpeg',
      'png': 'image/png',
      'gif': 'image/gif',
      'webp': 'image/webp',
      'mp3': 'audio/mpeg',
      'wav': 'audio/wav',
      'aac': 'audio/aac',
      'm4a': 'audio/mp4'
    }
    
    return typeMap[extension] || 'application/octet-stream'
  }

  /**
   * 获取文件大小（简化版本）
   */
  getFileSize(filePath) {
    // 这里应该通过wx.getFileInfo获取实际大小
    // 为了简化，返回一个估算值
    return 1024 * 1024 // 1MB
  }

  /**
   * 清理临时文件
   */
  cleanupTempFile(filePath) {
    try {
      wx.getFileSystemManager().unlink({
        filePath,
        success: () => {
          console.log('✅ 临时文件已清理:', filePath)
        },
        fail: (err) => {
          console.warn('清理临时文件失败:', err)
        }
      })
    } catch (err) {
      console.warn('清理临时文件异常:', err)
    }
  }

  /**
   * 格式化文件大小
   */
  formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes'
    
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i]
  }

  /**
   * 检查文件类型是否支持
   */
  isSupportedFileType(fileName) {
    const extension = fileName.split('.').pop().toLowerCase()
    return this.supportedImageTypes.includes(extension) || 
           this.supportedAudioTypes.includes(extension)
  }
}

// 创建单例实例
const fileService = new FileService()

module.exports = fileService

