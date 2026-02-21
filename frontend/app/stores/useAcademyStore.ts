import { defineStore } from 'pinia'
import { useAuthStore } from './useAuthStore'

export interface Video {
  id: number
  moduleId: number
  title: string
  description?: string | null
  videoFile?: string | null
  videoUrl?: string | null
  duration?: number | null
  order: number
  createdAt: string
  updatedAt: string
}

export interface AcademyModule {
  id: number
  courseId: number
  title: string
  description?: string | null
  order: number
  videos: Video[]
  createdAt: string
  updatedAt: string
}

export interface Course {
  id: number
  title: string
  description?: string | null
  thumbnailImage?: string | null
  isPublished: boolean
  order: number
  instructorAvatar?: string | null
  instructorFirstName?: string | null
  instructorLastName?: string | null
  instructorTitle?: string | null
  instructorLink?: string | null
  modules: AcademyModule[]
  progress?: CourseProgress
  createdAt: string
  updatedAt: string
}

export interface CourseProgress {
  id: number
  userId: number
  courseId: number
  completedVideos: number[]
  lastVideoWatchedId?: number | null
  progressPercentage: number
  createdAt: string
  updatedAt: string
}

export const useAcademyStore = defineStore('academy', () => {
  const config = useRuntimeConfig()
  const API_BASE_URL = config.public.apiBaseUrl || 'http://localhost:3001'
  const authStore = useAuthStore()

  // States
  const courses = ref<Course[]>([])
  const currentCourse = ref<Course | null>(null)
  const isLoading = ref(false)
  const error = ref('')

  // Fetch all courses
  const fetchCourses = async () => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<Course[]>(`${API_BASE_URL}/academy`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      courses.value = response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement des cours'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Fetch single course
  const fetchCourse = async (id: number) => {
    isLoading.value = true
    error.value = ''
    try {
      const response = await $fetch<Course>(`${API_BASE_URL}/academy/${id}`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      currentCourse.value = response
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors du chargement du cours'
      error.value = errorMessage
      throw err
    } finally {
      isLoading.value = false
    }
  }

  // Get course progress
  const getCourseProgress = async (courseId: number) => {
    try {
      const response = await $fetch<CourseProgress>(`${API_BASE_URL}/academy/${courseId}/progress`, {
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      return response
    } catch (err: any) {
      // If progress doesn't exist, return null
      if (err.status === 404) {
        return null
      }
      throw err
    }
  }

  // Update progress (mark video as completed)
  const updateProgress = async (courseId: number, videoId: number, lastVideoWatchedId?: number, markAsCompleted: boolean = false) => {
    try {
      const response = await $fetch<CourseProgress>(`${API_BASE_URL}/academy/${courseId}/progress`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: {
          videoId,
          lastVideoWatchedId,
          markAsCompleted,
        },
      })
      
      // Update progress in current course if it's the same course
      if (currentCourse.value && currentCourse.value.id === courseId) {
        currentCourse.value.progress = response
      }
      
      // Update progress in courses list
      const courseIndex = courses.value.findIndex(c => c.id === courseId)
      if (courseIndex !== -1) {
        courses.value[courseIndex].progress = response
      }
      
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la mise à jour de la progression'
      error.value = errorMessage
      throw err
    }
  }

  // Admin methods - Courses
  const createCourse = async (courseData: {
    title: string
    description?: string
    thumbnailImage?: string
    isPublished?: boolean
    order?: number
    instructorAvatar?: string
    instructorFirstName?: string
    instructorLastName?: string
    instructorTitle?: string
    instructorLink?: string
  }) => {
    try {
      const response = await $fetch<Course>(`${API_BASE_URL}/academy`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: courseData,
      })
      await fetchCourses()
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la création du cours'
      error.value = errorMessage
      throw err
    }
  }

  const updateCourse = async (id: number, courseData: {
    title?: string
    description?: string
    thumbnailImage?: string
    isPublished?: boolean
    order?: number
    instructorAvatar?: string
    instructorFirstName?: string
    instructorLastName?: string
    instructorTitle?: string
    instructorLink?: string
  }) => {
    try {
      const response = await $fetch<Course>(`${API_BASE_URL}/academy/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: courseData,
      })
      await fetchCourses()
      if (currentCourse.value?.id === id) {
        await fetchCourse(id)
      }
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la mise à jour du cours'
      error.value = errorMessage
      throw err
    }
  }

  const deleteCourse = async (id: number) => {
    try {
      await $fetch(`${API_BASE_URL}/academy/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      await fetchCourses()
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression du cours'
      error.value = errorMessage
      throw err
    }
  }

  // Admin methods - Modules
  const createModule = async (moduleData: {
    courseId: number
    title: string
    description?: string
    order?: number
  }) => {
    try {
      const response = await $fetch<AcademyModule>(`${API_BASE_URL}/academy/modules`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: moduleData,
      })
      if (currentCourse.value?.id === moduleData.courseId) {
        await fetchCourse(moduleData.courseId)
      }
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la création du module'
      error.value = errorMessage
      throw err
    }
  }

  const updateModule = async (id: number, moduleData: {
    title?: string
    description?: string
    order?: number
  }) => {
    try {
      const response = await $fetch<AcademyModule>(`${API_BASE_URL}/academy/modules/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: moduleData,
      })
      if (currentCourse.value) {
        await fetchCourse(currentCourse.value.id)
      }
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la mise à jour du module'
      error.value = errorMessage
      throw err
    }
  }

  const deleteModule = async (id: number) => {
    try {
      await $fetch(`${API_BASE_URL}/academy/modules/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      if (currentCourse.value) {
        await fetchCourse(currentCourse.value.id)
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression du module'
      error.value = errorMessage
      throw err
    }
  }

  // Admin methods - Videos
  const uploadVideo = async (file: File, onProgress?: (progress: number) => void) => {
    return new Promise<string>((resolve, reject) => {
      const xhr = new XMLHttpRequest()
      const formData = new FormData()
      formData.append('video', file)

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable && onProgress) {
          const percentComplete = (e.loaded / e.total) * 100
          onProgress(percentComplete)
        }
      })

      xhr.addEventListener('load', () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const response = JSON.parse(xhr.responseText)
            resolve(response.videoFile)
          } catch (err) {
            reject(new Error('Erreur lors de la lecture de la réponse'))
          }
        } else {
          try {
            const error = JSON.parse(xhr.responseText)
            reject(new Error(error.message || 'Erreur lors de l\'upload de la vidéo'))
          } catch {
            reject(new Error(`Erreur ${xhr.status}: ${xhr.statusText}`))
          }
        }
      })

      xhr.addEventListener('error', () => {
        reject(new Error('Erreur réseau lors de l\'upload'))
      })

      xhr.addEventListener('abort', () => {
        reject(new Error('Upload annulé'))
      })

      xhr.open('POST', `${API_BASE_URL}/academy/videos/upload`)
      xhr.setRequestHeader('Authorization', `Bearer ${authStore.accessToken}`)
      xhr.send(formData)
    })
  }

  const createVideo = async (videoData: {
    moduleId: number
    title: string
    description?: string
    videoFile?: string
    videoUrl?: string
    duration?: number
    order?: number
  }) => {
    try {
      const response = await $fetch<Video>(`${API_BASE_URL}/academy/videos`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: videoData,
      })
      if (currentCourse.value) {
        await fetchCourse(currentCourse.value.id)
      }
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la création de la vidéo'
      error.value = errorMessage
      throw err
    }
  }

  const updateVideo = async (id: number, videoData: {
    title?: string
    description?: string
    videoFile?: string | null
    videoUrl?: string | null
    duration?: number
    order?: number
  }) => {
    try {
      const response = await $fetch<Video>(`${API_BASE_URL}/academy/videos/${id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
        body: videoData,
      })
      if (currentCourse.value) {
        await fetchCourse(currentCourse.value.id)
      }
      return response
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la mise à jour de la vidéo'
      error.value = errorMessage
      throw err
    }
  }

  const deleteVideo = async (id: number) => {
    try {
      await $fetch(`${API_BASE_URL}/academy/videos/${id}`, {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${authStore.accessToken}`,
        },
      })
      if (currentCourse.value) {
        await fetchCourse(currentCourse.value.id)
      }
    } catch (err: any) {
      const errorMessage = err.data?.message || err.message || 'Erreur lors de la suppression de la vidéo'
      error.value = errorMessage
      throw err
    }
  }

  return {
    // States
    courses: readonly(courses),
    currentCourse: readonly(currentCourse),
    isLoading: readonly(isLoading),
    error: readonly(error),

    // Public methods
    fetchCourses,
    fetchCourse,
    getCourseProgress,
    updateProgress,

    // Admin methods
    createCourse,
    updateCourse,
    deleteCourse,
    createModule,
    updateModule,
    deleteModule,
    uploadVideo,
    createVideo,
    updateVideo,
    deleteVideo,
  }
})
