import axios from 'axios'
import type {
  Action, Application, Control, Evidence, Kca, LegalRequirement, Owner, Options,
  QuestionnaireQuestion, QuestionnaireResponse, QuestionnaireProgressRow,
  Suggestion, ApplySuggestionResult, NewsFeed, CurrentUser,
} from './types'

export const api = axios.create({ baseURL: '/api', withCredentials: true })

// Any 401 (no session / expired session) sends the user back to the login
// page - except a failed /auth/me check itself, which the auth context
// already treats as "not logged in" without needing a redirect loop.
api.interceptors.response.use(
  r => r,
  error => {
    if (error.response?.status === 401 && !error.config?.url?.includes('/auth/me') && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return Promise.reject(error)
  },
)

// Generic CRUD factory to avoid repeating the same 4 calls per entity.
function crud<T>(path: string) {
  return {
    list: (params?: Record<string, unknown>) => api.get<T[]>(path, { params }).then(r => r.data),
    get: (id: number) => api.get<T>(`${path}/${id}`).then(r => r.data),
    create: (payload: Partial<T>) => api.post<T>(path, payload).then(r => r.data),
    update: (id: number, payload: Partial<T>) => api.put<T>(`${path}/${id}`, payload).then(r => r.data),
    remove: (id: number) => api.delete(`${path}/${id}`).then(r => r.data),
  }
}

export const kcasApi = crud<Kca>('/kcas')
export const ownersApi = crud<Owner>('/owners')
export const applicationsApi = crud<Application>('/applications')
export const requirementsApi = crud<LegalRequirement>('/requirements')
export const controlsApi = crud<Control>('/controls')
export const actionsApi = crud<Action>('/actions')
export const evidenceApi = crud<Evidence>('/evidence')
export const questionnaireResponsesApi = crud<QuestionnaireResponse>('/questionnaire/responses')

export const getQuestionnaireQuestions = (params?: Record<string, unknown>) =>
  api.get<QuestionnaireQuestion[]>('/questionnaire/questions', { params }).then(r => r.data)
export const getQuestionnaireProgress = () =>
  api.get<QuestionnaireProgressRow[]>('/questionnaire/progress').then(r => r.data)

export const getSuggestions = (responseId: number) =>
  api.get<Suggestion[]>(`/questionnaire/responses/${responseId}/suggestions`).then(r => r.data)

export interface ApplySuggestionItem {
  target_key: string
  entity_type: string
  entity_code: string | null
  field_name: string
  proposed_value: string
  owner_id?: number
  target_date?: string
}

export const applySuggestions = (responseId: number, items: ApplySuggestionItem[]) =>
  api.post<{ results: ApplySuggestionResult[] }>(`/questionnaire/responses/${responseId}/suggestions/apply`, { items }).then(r => r.data)

export const getNews = (forceRefresh = false) =>
  api.get<NewsFeed>('/news', { params: forceRefresh ? { force_refresh: true } : undefined }).then(r => r.data)

export const getOptions = () => api.get<Options>('/settings/options').then(r => r.data)
export const resetDemoData = () => api.post('/settings/reset-demo-data', null, { params: { confirm: true } }).then(r => r.data)

export const getDashboard = () => api.get('/dashboard').then(r => r.data)
export const getNovemberReadiness = () => api.get('/november-2026').then(r => r.data)
export const getMay2027Readiness = () => api.get('/may-2027').then(r => r.data)
export const getGaps = () => api.get('/gaps').then(r => r.data)
export const getRequirementDetail = (id: number) => api.get(`/requirements/${id}`).then(r => r.data)
export const getApplicationDetail = (id: number) => api.get(`/applications/${id}`).then(r => r.data)
export const getManagementReport = () => api.get('/reports/management').then(r => r.data)
export const getEvidenceCoverage = () => api.get('/evidence/coverage').then(r => r.data)

export const uploadEvidenceFile = (file: File) => {
  const formData = new FormData()
  formData.append('file', file)
  return api
    .post<{ file_url: string; original_name: string }>('/evidence/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then(r => r.data)
}

export function exportUrl(entity: 'requirements' | 'controls' | 'actions' | 'evidence' | 'gaps') {
  return `/api/reports/export/${entity}.csv`
}

export const login = (username: string, password: string) =>
  api.post<CurrentUser>('/auth/login', { username, password }).then(r => r.data)

export const logout = () => api.post('/auth/logout').then(r => r.data)

export const getCurrentUser = () => api.get<CurrentUser>('/auth/me').then(r => r.data)
