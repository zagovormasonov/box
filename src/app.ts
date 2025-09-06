import type { SupabaseClient } from '@supabase/supabase-js'
import type { TestQuestion, AppState, QuestionResult, TestResult } from './types'

export class TestApp {
  private questions: TestQuestion[]
  private supabase: SupabaseClient
  private state: AppState
  private appElement: HTMLElement
  private darkMode: boolean = false

  constructor(questions: TestQuestion[], supabase: SupabaseClient) {
    this.questions = questions
    this.supabase = supabase
    this.appElement = document.querySelector('#app')!
    this.state = {
      currentScreen: 'welcome',
      currentQuestionIndex: 0,
      userAnswers: [],
      currentUser: null
    }

    // Восстанавливаем сохраненное состояние
    this.loadSavedState()

    // Проверяем сохраненную тему
    const savedTheme = localStorage.getItem('darkMode')
    this.darkMode = savedTheme === 'true'
    this.applyTheme()
  }

  public async init(): Promise<void> {
    // Показываем экран загрузки
    this.showLoadingScreen()

    // Ждем восстановления сессии
    await this.checkAuthState()

    // Затем рендерим интерфейс и настраиваем обработчики
    this.render()
    this.setupEventListeners()
  }

  private async checkAuthState(): Promise<void> {
    try {
      // Получаем текущую сессию
      const { data: { session }, error } = await this.supabase.auth.getSession()

      if (error) {
        console.error('Error getting session:', error)
        return
      }

      // Устанавливаем пользователя из сессии
      this.state.currentUser = session?.user || null

      // Если есть сессия, переходим в личный кабинет
      if (session?.user) {
        this.state.currentScreen = 'dashboard'
      }

      // Слушатель изменений состояния аутентификации
      this.supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('Auth state changed:', event, session?.user?.email)

        this.state.currentUser = session?.user || null

        if (event === 'SIGNED_IN' && session) {
          this.state.currentScreen = 'dashboard'
          this.render()
        } else if (event === 'SIGNED_OUT') {
          this.state.currentScreen = 'welcome'
          this.render()
        } else if (event === 'TOKEN_REFRESHED' && session) {
          // Сессия была обновлена, обновляем интерфейс
          this.state.currentUser = session.user
          if (this.state.currentScreen !== 'dashboard') {
            this.state.currentScreen = 'dashboard'
          }
          this.render()
        }
      })
    } catch (error) {
      console.error('Error in checkAuthState:', error)
    }
  }

  private render(): void {
    this.appElement.innerHTML = `
      <div class="container">
        <header>
          <!-- Заголовок убран, прогресс-бар теперь на каждом экране -->
        </header>
        <main id="main-content">
          ${this.renderWelcomeScreen()}
          ${this.renderTestScreen()}
          ${this.renderAuthScreen()}
          ${this.renderResultsScreen()}
          ${this.renderDashboardScreen()}
        </main>
      </div>
    `
    this.updateScreenVisibility()
  }

  private renderWelcomeScreen(): string {
    return `
      <div id="welcome-screen" class="screen">
        <div class="welcome-content">
          <!-- Шкала прогресса -->
          <div class="progress-section">
            <div class="progress-bar-container">
              <div class="progress-bar"></div>
            </div>
            <div class="step-counter">
              Добро пожаловать!
            </div>
          </div>

          <p>Пройдите наш психологический тест для лучшего понимания себя</p>
          <button id="start-test-btn" class="btn primary-btn">Начать тест</button>
        </div>
      </div>
    `
  }

  private renderTestScreen(): string {
    const question = this.questions[this.state.currentQuestionIndex]
    const selectedAnswer = this.state.userAnswers[this.state.currentQuestionIndex]
    const isAnswered = selectedAnswer !== undefined

    const currentStep = this.state.currentQuestionIndex + 1
    const totalSteps = this.questions.length

    return `
      <div id="test-screen" class="screen">
        <div class="test-content">
          <!-- Шкала прогресса -->
          <div class="progress-section">
            <div class="progress-bar-container">
              <div class="progress-bar"></div>
            </div>
            <div class="step-counter">
              Шаг ${currentStep} из ${totalSteps}
            </div>
          </div>

          <div id="question-container">
            <h3 id="question-text" class="${!isAnswered ? 'unanswered' : ''}">${question?.question || ''}</h3>
            <div id="answers-container">
              ${question?.answers.map((answer, index) => `
                <div class="answer-option ${selectedAnswer === index ? 'selected' : ''}"
                     data-answer-index="${index}">
                  ${answer}
                </div>
              `).join('') || ''}
            </div>
          </div>
          <div class="test-controls">
            <button id="prev-btn" class="btn secondary-btn" ${this.state.currentQuestionIndex === 0 ? 'disabled' : ''}>
              Назад
            </button>
            <button id="next-btn" class="btn primary-btn" ${!isAnswered ? 'disabled' : ''}>
              ${this.state.currentQuestionIndex === this.questions.length - 1 ? 'Завершить' : 'Далее'}
            </button>
          </div>
        </div>
      </div>
    `
  }

  private renderAuthScreen(): string {
    return `
      <div id="auth-screen" class="screen">
        <div class="auth-content">
          <h2>Авторизация</h2>
          <p>Для сохранения результатов психологического теста необходимо авторизоваться</p>
          <div class="auth-form">
            <input type="email" id="email-input" placeholder="Email" required>
            <input type="password" id="password-input" placeholder="Пароль" required>
            <button id="login-btn" class="btn primary-btn">Войти</button>
            <button id="register-btn" class="btn secondary-btn">Регистрация</button>
          </div>

          <!-- Разделитель -->
          <div class="auth-divider">
            <span>или</span>
          </div>

          <!-- Вход через Google -->
          <div class="google-auth">
            <button id="google-login-btn" class="btn google-btn">
              <svg width="18" height="18" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Выбрать аккаунт Google
            </button>
            <p class="google-hint">Вы сможете выбрать нужный аккаунт Google</p>
          </div>
        </div>
      </div>
    `
  }

  private renderResultsScreen(): string {
    const results = this.questions.map((question, index) => {
      const answerIndex = this.state.userAnswers[index]
      return `
        <div class="result-item">
          <h4>${question.question}</h4>
          <p>Ваш ответ: ${question.answers[answerIndex] || 'Не отвечено'}</p>
        </div>
      `
    }).join('')

    const totalQuestions = this.questions.length
    const answeredQuestions = this.state.userAnswers.filter(answer => answer !== undefined).length

    return `
      <div id="results-screen" class="screen">
        <div class="results-content">
          <button id="back-to-dashboard-btn" class="back-btn">← Назад</button>

          <!-- Шкала прогресса -->
          <div class="progress-section">
            <div class="progress-bar-container">
              <div class="progress-bar"></div>
            </div>
            <div class="step-counter">
              Шаг ${answeredQuestions} из ${totalQuestions}
            </div>
          </div>

          <div id="results-container">${results}</div>

          <!-- Кнопки навигации -->
          <div class="navigation-buttons">
            <button id="save-results-btn" class="btn primary-btn">Сохранить результаты</button>
            <button id="restart-btn" class="btn secondary-btn">Пройти заново</button>
          </div>
        </div>
      </div>
    `
  }

  private renderDashboardScreen(): string {
    return `
      <div id="dashboard-screen" class="screen">
        <div class="dashboard-content">
          <h2>Личный кабинет</h2>
          <div class="user-info">
            <p>Добро пожаловать!</p>
            <p>Email: ${this.state.currentUser?.email || ''}</p>
          </div>
          <div class="dashboard-actions">
            <button id="view-results-btn" class="btn secondary-btn">Посмотреть результаты</button>
            <button id="theme-toggle-btn" class="btn secondary-btn">${this.darkMode ? '☀️ Светлая тема' : '🌙 Темная тема'}</button>
            <button id="logout-btn" class="btn logout-btn">Выйти</button>
          </div>
        </div>
      </div>
    `
  }

  private applyTheme(): void {
    if (this.darkMode) {
      document.body.classList.add('dark-mode')
    } else {
      document.body.classList.remove('dark-mode')
    }
  }

  private toggleTheme(): void {
    this.darkMode = !this.darkMode
    localStorage.setItem('darkMode', this.darkMode.toString())
    this.applyTheme()
    this.render() // Перерисовываем интерфейс с новой темой
  }

  private loadSavedState(): void {
    try {
      const savedState = localStorage.getItem('testAppState')
      if (savedState) {
        const parsedState = JSON.parse(savedState)
        this.state.currentScreen = parsedState.currentScreen || 'welcome'
        this.state.currentQuestionIndex = parsedState.currentQuestionIndex || 0
        this.state.userAnswers = parsedState.userAnswers || []
      }
    } catch (error) {
      console.error('Error loading saved state:', error)
    }
  }

  private saveState(): void {
    try {
      const stateToSave = {
        currentScreen: this.state.currentScreen,
        currentQuestionIndex: this.state.currentQuestionIndex,
        userAnswers: this.state.userAnswers
      }
      localStorage.setItem('testAppState', JSON.stringify(stateToSave))
    } catch (error) {
      console.error('Error saving state:', error)
    }
  }

  private showLoadingScreen(): void {
    this.appElement.innerHTML = `
      <div class="container">
        <div class="loading-screen">
          <div class="loading-spinner"></div>
          <p>Загрузка...</p>
        </div>
      </div>
    `
  }

  private updateScreenVisibility(): void {
    const screens = this.appElement.querySelectorAll('.screen')
    screens.forEach(screen => {
      const screenElement = screen as HTMLElement
      screenElement.style.display = screenElement.id === `${this.state.currentScreen}-screen` ? 'block' : 'none'
    })
  }

  private setupEventListeners(): void {
    this.appElement.addEventListener('click', (e) => {
      const target = e.target as HTMLElement
      console.log('Клик по элементу:', target.id || target.className || target.tagName)

      if (target.id === 'start-test-btn') {
        this.startTest()
      } else if (target.id === 'next-btn') {
        this.nextQuestion()
      } else if (target.id === 'prev-btn') {
        this.prevQuestion()
      } else if (target.id === 'login-btn') {
        this.login()
      } else if (target.id === 'register-btn') {
        this.register()
      } else       if (target.id === 'save-results-btn') {
        this.saveResults()
      } else if (target.id === 'restart-btn') {
        this.restartTest()
      } else if (target.id === 'logout-btn') {
        this.logout()
      } else if (target.id === 'view-results-btn') {
        this.viewResults()
      } else if (target.id === 'theme-toggle-btn') {
        this.toggleTheme()
      } else if (target.id === 'back-to-dashboard-btn') {
        console.log('Нажата кнопка назад из результатов, target:', target)
        console.log('Текущий экран:', this.state.currentScreen)
        this.restartTest()
      } else if (target.id === 'google-login-btn') {
        this.loginWithGoogle()
      } else if (target.classList.contains('answer-option')) {
        const answerIndex = parseInt(target.dataset.answerIndex || '0')
        this.selectAnswer(answerIndex)
      }
    })
  }

  private startTest(): void {
    this.state.currentQuestionIndex = 0
    this.state.userAnswers = []
    this.state.currentScreen = 'test'
    this.saveState()
    this.render()
    // Небольшая задержка для правильной инициализации прогресс-бара
    setTimeout(() => this.updateProgressBar(), 100)
  }

  private selectAnswer(answerIndex: number): void {
    this.state.userAnswers[this.state.currentQuestionIndex] = answerIndex
    this.saveState()
    this.render()
  }

  private nextQuestion(): void {
    console.log('Вызван nextQuestion, текущий индекс:', this.state.currentQuestionIndex)
    const selectedAnswer = this.state.userAnswers[this.state.currentQuestionIndex]

    // Проверяем, что вопрос отвечен
    if (selectedAnswer === undefined) {
      this.showWarning('Пожалуйста, выберите ответ на вопрос перед переходом дальше.')
      return
    }

    if (this.state.currentQuestionIndex < this.questions.length - 1) {
      this.state.currentQuestionIndex++
      console.log('Переход к следующему вопросу, новый индекс:', this.state.currentQuestionIndex)
      this.saveState()
      this.render()
      // Обновляем прогресс-бар после рендера с небольшой задержкой
      setTimeout(() => this.updateProgressBar(), 100)
    } else {
      console.log('Показываем результаты')
      this.showResults()
    }
  }

  private prevQuestion(): void {
    if (this.state.currentQuestionIndex > 0) {
      this.state.currentQuestionIndex--
      this.saveState()
      this.render()
      // Обновляем прогресс-бар после рендера с небольшой задержкой
      setTimeout(() => this.updateProgressBar(), 100)
    }
  }

  private showResults(): void {
    this.state.currentScreen = 'results'
    this.saveState()
    this.render()
  }

  private async login(): Promise<void> {
    const emailInput = this.appElement.querySelector('#email-input') as HTMLInputElement
    const passwordInput = this.appElement.querySelector('#password-input') as HTMLInputElement

    const email = emailInput.value
    const password = passwordInput.value

    try {
      const { data, error } = await this.supabase.auth.signInWithPassword({
        email,
        password
      })

      if (error) throw error

      this.state.currentUser = data.user
      this.state.currentScreen = 'dashboard'
      this.render()
    } catch (error) {
      alert('Ошибка входа: ' + (error as Error).message)
    }
  }

  private async register(): Promise<void> {
    const emailInput = this.appElement.querySelector('#email-input') as HTMLInputElement
    const passwordInput = this.appElement.querySelector('#password-input') as HTMLInputElement

    const email = emailInput.value
    const password = passwordInput.value

    try {
      const { error } = await this.supabase.auth.signUp({
        email,
        password
      })

      if (error) throw error

      alert('Регистрация успешна! Проверьте вашу почту для подтверждения.')
    } catch (error) {
      alert('Ошибка регистрации: ' + (error as Error).message)
    }
  }

  private async logout(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signOut()
      if (error) throw error

      this.state.currentUser = null
      this.state.currentScreen = 'welcome'
      this.render()
    } catch (error) {
      alert('Ошибка выхода: ' + (error as Error).message)
    }
  }

  private viewResults(): void {
    this.state.currentScreen = 'results'
    this.render()
  }


  private async loginWithGoogle(): Promise<void> {
    try {
      const { error } = await this.supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
          queryParams: {
            prompt: 'select_account',
            access_type: 'offline'
          }
        }
      })

      if (error) throw error

      // Обработка успешной авторизации будет в onAuthStateChange
    } catch (error) {
      alert('Ошибка входа через Google: ' + (error as Error).message)
    }
  }

  private async saveResults(): Promise<void> {
    if (!this.state.currentUser) {
      this.state.currentScreen = 'auth'
      this.render()
      return
    }

    try {
      const results: QuestionResult[] = this.questions.map((question, index) => ({
        question: question.question,
        answer: question.answers[this.state.userAnswers[index]] || 'Не отвечено',
        questionIndex: index
      }))

      const testResult: Omit<TestResult, 'id'> = {
        user_id: this.state.currentUser.id,
        results,
        completed_at: new Date().toISOString()
      }

      const { error } = await this.supabase
        .from('test_results')
        .insert(testResult)

      if (error) throw error

      alert('Результаты сохранены успешно!')
    } catch (error) {
      alert('Ошибка сохранения: ' + (error as Error).message)
    }
  }

  private restartTest(): void {
    console.log('Вызван restartTest - возвращаемся в welcome экран')
    this.state.currentQuestionIndex = 0
    this.state.userAnswers = []
    this.state.currentScreen = 'welcome'
    this.render()
  }

  private showWarning(message: string): void {
    // Удаляем предыдущее предупреждение, если оно есть
    const existingWarning = this.appElement.querySelector('.warning-toast')
    if (existingWarning) {
      existingWarning.remove()
    }

    // Создаем новое предупреждение
    const warningElement = document.createElement('div')
    warningElement.className = 'warning-toast'
    warningElement.innerHTML = `
      <div class="warning-content">
        <div class="warning-icon">⚠️</div>
        <div class="warning-text">${message}</div>
        <button class="warning-close" aria-label="Закрыть">&times;</button>
      </div>
    `

    // Добавляем в DOM
    this.appElement.appendChild(warningElement)

    // Показываем с анимацией
    setTimeout(() => {
      warningElement.classList.add('show')
    }, 10)

    // Автоматически скрываем через 4 секунды
    const hideTimeout = setTimeout(() => {
      this.hideWarning(warningElement)
    }, 4000)

    // Обработчик закрытия по клику
    const closeBtn = warningElement.querySelector('.warning-close') as HTMLElement
    closeBtn.addEventListener('click', () => {
      clearTimeout(hideTimeout)
      this.hideWarning(warningElement)
    })

    // Закрытие по клику вне предупреждения
    warningElement.addEventListener('click', (e) => {
      if (e.target === warningElement) {
        clearTimeout(hideTimeout)
        this.hideWarning(warningElement)
      }
    })
  }

  private hideWarning(warningElement: HTMLElement): void {
    warningElement.classList.remove('show')
    setTimeout(() => {
      if (warningElement.parentNode) {
        warningElement.parentNode.removeChild(warningElement)
      }
    }, 300)
  }

  private updateProgressBar(): void {
    const progressBar = this.appElement.querySelector('.progress-bar') as HTMLElement
    if (progressBar) {
      const currentStep = this.state.currentQuestionIndex + 1
      const totalSteps = this.questions.length
      const progressPercent = (currentStep / totalSteps) * 100

      console.log('Обновление прогресс-бара:', progressPercent + '%')
      console.log('Элемент найден:', progressBar)
      // Устанавливаем ширину
      progressBar.style.width = `${progressPercent}%`
      console.log('Ширина установлена:', progressBar.style.width)
    } else {
      console.log('Прогресс-бар не найден!')
      console.log('Все элементы с классом progress-bar:', document.querySelectorAll('.progress-bar'))
    }
  }
}
