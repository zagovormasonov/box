import type { SupabaseClient } from '@supabase/supabase-js'
import type { TestQuestion, AppState, QuestionResult, TestResult } from './types'
import type { PaymentData, SharedTestResult } from './config'
import { TINKOFF_CONFIG } from './config'

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

    // Обрабатываем возврат от оплаты
    await this.handlePaymentReturn()

    // Обрабатываем URL параметры для просмотра чужих результатов
    await this.handleShareUrl()

    // Затем рендерим интерфейс и настраиваем обработчики
    this.render()
    this.setupEventListeners()

    // Загружаем баланс после рендера, если пользователь авторизован
    if (this.state.currentUser && this.state.currentScreen === 'dashboard') {
      setTimeout(() => {
        console.log('Вызываем updateBalanceDisplay из init()')
        this.updateBalanceDisplay()
      }, 200)
    }
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

        if ((event === 'SIGNED_IN' || event === 'INITIAL_SESSION') && session) {
          this.state.currentScreen = 'dashboard'
          this.render()
          // Загружаем баланс после входа
          setTimeout(() => this.updateBalanceDisplay(), 100)
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
          // Загружаем баланс после обновления сессии
          setTimeout(() => this.updateBalanceDisplay(), 100)
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
          ${this.renderSharedResultsScreen()}
        </main>
      </div>
    `
    this.updateScreenVisibility()
  }

  private renderWelcomeScreen(): string {
    return `
      <div id="welcome-screen" class="screen">
        <div class="welcome-content">
          <!-- Прогресс-бар -->
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
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
    console.log(`renderTestScreen: вопрос ${this.state.currentQuestionIndex}, selectedAnswer: ${selectedAnswer}, isAnswered: ${isAnswered}`)

    const currentStep = this.state.currentQuestionIndex + 1
    const totalSteps = this.questions.length

    return `
      <div id="test-screen" class="screen">
        <div class="test-content">
          <!-- Прогресс-бар -->
          <div class="progress-bar">
            <div class="progress-fill" id="progress-fill"></div>
            </div>
            <div class="step-counter">
              Шаг ${currentStep} из ${totalSteps}
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
            <button id="share-results-btn" class="btn share-btn">📤 Поделиться</button>
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
            ${this.state.currentUser?.user_metadata?.avatar_url ? `
              <div class="user-avatar">
                <img src="${this.state.currentUser.user_metadata.avatar_url}"
                     alt="Аватар пользователя"
                     onerror="this.style.display='none'; this.parentElement.innerHTML='<div class=\\'avatar-placeholder\\'>${(this.state.currentUser.email || '').charAt(0).toUpperCase()}</div>'" />
              </div>
            ` : this.state.currentUser?.email ? `
              <div class="user-avatar">
                <div class="avatar-placeholder">${this.state.currentUser.email.charAt(0).toUpperCase()}</div>
              </div>
            ` : ''}
            <p>Добро пожаловать!</p>
            <p>Email: ${this.state.currentUser?.email || ''}</p>
            <div class="balance-info">
              <span class="balance-label">Баланс:</span>
              <span class="balance-amount" id="user-balance">Загрузка...</span>
            </div>
          </div>
          <div class="dashboard-actions">
            <button id="view-results-btn" class="btn secondary-btn">Посмотреть результаты</button>
            <button id="theme-toggle-btn" class="btn secondary-btn">${this.darkMode ? '☀️ Светлая тема' : '🌙 Темная тема'}</button>
            <button id="subscribe-btn" class="btn primary-btn">💎 Оформить подписку</button>
            <button id="logout-btn" class="btn logout-btn">Выйти</button>
          </div>
        </div>
      </div>
    `
  }

  private renderSharedResultsScreen(): string {
    if (!this.state.sharedResults) {
      return ''
    }

    const sharedResults = this.state.sharedResults
    const results = sharedResults.test_result.map((result: any) => `
      <div class="result-item">
        <h4>${result.question}</h4>
        <p><strong>Ответ:</strong> ${result.answer}</p>
      </div>
    `).join('')

    return `
      <div id="shared-results-screen" class="screen">
        <div class="results-content">
          <button id="back-to-welcome-btn" class="back-btn">← На главную</button>

          <h2>Результаты теста</h2>
          <div class="shared-results-info">
            <p><strong>Тип личности:</strong> ${sharedResults.personality_type}</p>
            <p><strong>Описание:</strong> ${sharedResults.description}</p>
            <p><em>Результаты поделены: ${new Date(sharedResults.created_at).toLocaleDateString('ru-RU')}</em></p>
          </div>

          <div id="shared-results-container">${results}</div>

          <div class="shared-actions">
            <button id="take-test-btn" class="btn primary-btn">Пройти тест самому</button>
            <button id="share-this-result-btn" class="btn share-btn">📤 Поделиться</button>
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

    // После смены темы обновляем баланс, если пользователь авторизован
    if (this.state.currentUser && this.state.currentScreen === 'dashboard') {
      setTimeout(() => this.updateBalanceDisplay(), 100)
    }
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
    this.appElement.addEventListener('click', async (e) => {
      const target = e.target as HTMLElement
      console.log('Клик по элементу:', target.id || target.className || target.tagName)

      if (target.id === 'start-test-btn') {
        this.startTest()
      } else if (target.id === 'next-btn') {
        console.log('Клик по кнопке Далее')
        await this.nextQuestion()
      } else if (target.id === 'prev-btn') {
        this.prevQuestion()
      } else if (target.id === 'login-btn') {
        this.login()
      } else if (target.id === 'register-btn') {
        this.register()
      } else if (target.id === 'share-results-btn') {
        this.showShareModal()
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
      } else if (target.id === 'subscribe-btn') {
        this.showSubscriptionModal()
      } else if (target.id === 'back-to-dashboard-btn') {
        if (this.state.currentUser) {
          // Авторизованный пользователь - в личный кабинет
        this.backToDashboard()
        } else {
          // Неавторизованный пользователь - на начало теста
          this.restartTest()
        }
      } else if (target.id === 'google-login-btn') {
        this.loginWithGoogle()
      } else if (target.id === 'back-to-welcome-btn') {
        this.state.currentScreen = 'welcome'
        this.saveState()
        this.render()
      } else if (target.id === 'take-test-btn') {
        this.state.currentScreen = 'welcome'
        this.saveState()
        this.render()
      } else if (target.id === 'share-this-result-btn') {
        this.showShareModal()
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
    this.updateScreenVisibility()
    this.updateProgress()
  }

  private selectAnswer(answerIndex: number): void {
    this.state.userAnswers[this.state.currentQuestionIndex] = answerIndex
    this.saveState()

    // Обновляем визуальное состояние выбранного ответа
    const answerOptions = this.appElement.querySelectorAll('.answer-option')
    answerOptions.forEach((option, index) => {
      const element = option as HTMLElement
      if (index === answerIndex) {
        element.classList.add('selected')
      } else {
        element.classList.remove('selected')
      }
    })

    // Обновляем состояние кнопки "Далее"
    const nextBtn = this.appElement.querySelector('#next-btn') as HTMLButtonElement
    if (nextBtn) {
      nextBtn.disabled = false
    }
  }

  private async nextQuestion(): Promise<void> {
    const selectedAnswer = this.state.userAnswers[this.state.currentQuestionIndex]

    // Проверяем, что вопрос отвечен
    if (selectedAnswer === undefined) {
      this.showWarning('Пожалуйста, выберите ответ на вопрос перед переходом дальше.')
      return
    }

    if (this.state.currentQuestionIndex < this.questions.length - 1) {
      // Обновляем индекс вопроса
      this.state.currentQuestionIndex++
      this.saveState()

      // Рендерим интерфейс
      this.render()
      this.updateScreenVisibility()
      this.updateProgress()
    } else {
      await this.showResults()
    }
  }

  private prevQuestion(): void {
    if (this.state.currentQuestionIndex > 0) {
      // Обновляем индекс вопроса
      this.state.currentQuestionIndex--
      this.saveState()

      // Рендерим интерфейс
      this.render()
      this.updateProgress()
    }
  }

  private async saveTestResults(): Promise<void> {
    try {
      console.log('saveTestResults: начинаем сохранение результатов')
      const { data: userData, error: userError } = await this.supabase.auth.getUser()

      if (userError) {
        console.error('Ошибка получения пользователя:', userError)
        return
      }

      if (!userData?.user) {
        console.log('Пользователь не авторизован, результаты не будут сохранены')
        return
      }

      console.log('Пользователь авторизован:', userData.user.id)

      // Создаем уникальный share_id (6 символов)
      const shareId = Math.random().toString(36).substring(2, 8).toUpperCase()

      // Собираем результаты теста
      const testResults: QuestionResult[] = this.questions.map((question, index) => {
        const answerIndex = this.state.userAnswers[index]
        return {
          question: question.question,
          answer: question.answers[answerIndex] || 'Не отвечено',
          questionIndex: index
        }
      })

      // Определяем тип личности (простая логика для демонстрации)
      const personalityType = this.determinePersonalityType(testResults)
      const description = this.getPersonalityDescription(personalityType)

      const sharedResult: Omit<SharedTestResult, 'id' | 'created_at'> = {
        user_id: userData.user.id,
        share_id: shareId,
        test_result: testResults,
        personality_type: personalityType,
        description: description
      }

      console.log('Сохраняем результат в базу данных...')
      const { data, error } = await this.supabase
        .from('test_results')
        .insert(sharedResult)
        .select()

      if (error) {
        console.error('Ошибка сохранения результатов:', error)
        console.error('Детали ошибки:', error.message, error.details, error.hint)
      } else {
        console.log('Результаты успешно сохранены:', data)
        console.log('Результаты сохранены с share_id:', shareId)
        // Сохраняем share_id в state для кнопки поделиться
        this.state.shareId = shareId
        this.saveState()
      }
    } catch (error) {
      console.error('Ошибка при сохранении результатов:', error)
    }
  }

  private determinePersonalityType(results: QuestionResult[]): string {
    // Простая логика определения типа личности на основе ответов
    const answerCounts: { [key: string]: number } = {}

    results.forEach(result => {
      const answer = result.answer
      answerCounts[answer] = (answerCounts[answer] || 0) + 1
    })

    // Определяем наиболее частый ответ
    const mostCommonAnswer = Object.keys(answerCounts).reduce((a, b) =>
      answerCounts[a] > answerCounts[b] ? a : b
    )

    // Возвращаем тип личности на основе наиболее частого ответа
    const personalityTypes: { [key: string]: string } = {
      'А': 'Аналитик',
      'Б': 'Коммуникатор',
      'В': 'Лидер',
      'Г': 'Творческая личность'
    }

    return personalityTypes[mostCommonAnswer.charAt(0)] || 'Универсал'
  }

  private getPersonalityDescription(personalityType: string): string {
    const descriptions: { [key: string]: string } = {
      'Аналитик': 'Вы склонны к логическому мышлению и предпочитаете анализировать ситуации перед принятием решений.',
      'Коммуникатор': 'Вы обладаете отличными навыками общения и легко находите общий язык с людьми.',
      'Лидер': 'Вы естественный лидер, который может мотивировать и организовывать других.',
      'Творческая личность': 'Вы креативны и предпочитаете нестандартные подходы к решению проблем.',
      'Универсал': 'Вы обладаете сбалансированными качествами и можете адаптироваться к разным ситуациям.'
    }

    return descriptions[personalityType] || 'Ваш тип личности уникален и сочетает в себе различные качества.'
  }

  private showShareModal(): void {
    console.log('showShareModal вызвана, shareId:', this.state.shareId)

    if (!this.state.shareId) {
      console.log('shareId не найден, пытаемся сохранить результаты...')
      // Попробуем сохранить результаты еще раз
      this.saveTestResults().then(() => {
        if (this.state.shareId) {
          console.log('Результаты сохранены, открываем модальное окно')
          this.showShareModal()
        } else {
          this.showWarning('Не удалось сохранить результаты. Проверьте подключение к интернету.')
        }
      }).catch((error) => {
        console.error('Ошибка при повторном сохранении:', error)
        this.showWarning('Ошибка сохранения результатов. Попробуйте ещё раз.')
      })
      return
    }

    const shareUrl = `${window.location.origin}?share=${this.state.shareId}`

    // Создаем модальное окно
    const modal = document.createElement('div')
    modal.className = 'share-modal-overlay'
    modal.innerHTML = `
      <div class="share-modal">
        <div class="share-modal-header">
          <h3>📤 Поделиться результатами</h3>
          <button class="close-modal-btn">&times;</button>
        </div>
        <div class="share-modal-body">
          <p>Скопируйте эту ссылку и поделитесь с друзьями:</p>
          <div class="share-link-container">
            <input type="text" id="share-link-input" value="${shareUrl}" readonly>
            <button id="copy-link-btn" class="btn copy-btn">📋 Копировать</button>
          </div>
          <div class="share-buttons">
            <button id="share-telegram-btn" class="btn share-platform-btn">
              📱 Telegram
            </button>
            <button id="share-whatsapp-btn" class="btn share-platform-btn">
              💬 WhatsApp
            </button>
            <button id="share-vk-btn" class="btn share-platform-btn">
              📘 VK
            </button>
          </div>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Обработчики событий
    const closeBtn = modal.querySelector('.close-modal-btn') as HTMLElement
    const copyBtn = modal.querySelector('#copy-link-btn') as HTMLElement
    const shareLinkInput = modal.querySelector('#share-link-input') as HTMLInputElement

    closeBtn.addEventListener('click', () => {
      document.body.removeChild(modal)
    })

    copyBtn.addEventListener('click', async () => {
      try {
        await navigator.clipboard.writeText(shareUrl)
        copyBtn.textContent = '✅ Скопировано!'
        copyBtn.classList.add('copied')
        setTimeout(() => {
          copyBtn.textContent = '📋 Копировать'
          copyBtn.classList.remove('copied')
        }, 2000)
      } catch (error) {
        // Fallback для старых браузеров
        shareLinkInput.select()
        document.execCommand('copy')
        copyBtn.textContent = '✅ Скопировано!'
        copyBtn.classList.add('copied')
        setTimeout(() => {
          copyBtn.textContent = '📋 Копировать'
          copyBtn.classList.remove('copied')
        }, 2000)
      }
    })

    // Кнопки для поделиться в соцсетях
    const telegramBtn = modal.querySelector('#share-telegram-btn') as HTMLElement
    const whatsappBtn = modal.querySelector('#share-whatsapp-btn') as HTMLElement
    const vkBtn = modal.querySelector('#share-vk-btn') as HTMLElement

    telegramBtn.addEventListener('click', () => {
      const text = encodeURIComponent('Посмотри мои результаты психологического теста!')
      window.open(`https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${text}`, '_blank')
    })

    whatsappBtn.addEventListener('click', () => {
      const text = encodeURIComponent('Посмотри мои результаты психологического теста! ' + shareUrl)
      window.open(`https://wa.me/?text=${text}`, '_blank')
    })

    vkBtn.addEventListener('click', () => {
      const text = encodeURIComponent('Посмотри мои результаты психологического теста!')
      window.open(`https://vk.com/share.php?url=${encodeURIComponent(shareUrl)}&title=${text}`, '_blank')
    })

    // Закрытие по клику вне модального окна
    modal.addEventListener('click', (e) => {
      if (e.target === modal) {
        document.body.removeChild(modal)
      }
    })
  }

  private async showResults(): Promise<void> {
    this.state.currentScreen = 'results'
    this.saveState()

    // Сохраняем результаты в базу данных для возможности поделиться
    await this.saveTestResults()

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
      // Проверяем текущую сессию перед выходом
      const { data: { session } } = await this.supabase.auth.getSession()

      if (session) {
        // Если сессия существует, выполняем выход
      const { error } = await this.supabase.auth.signOut()
      if (error) throw error
      }

      // В любом случае очищаем локальное состояние
      this.state.currentUser = null
      this.state.currentScreen = 'welcome'
      this.render()
    } catch (error) {
      console.warn('Ошибка при выходе:', error)
      // Даже если вышла ошибка, очищаем локальное состояние
      this.state.currentUser = null
      this.state.currentScreen = 'welcome'
      this.render()
    }
  }

  private viewResults(): void {
    this.state.currentScreen = 'results'
    this.render()
  }

  private async backToDashboard(): Promise<void> {
    // Проверяем и восстанавливаем сессию пользователя
    try {
      const { data: { session } } = await this.supabase.auth.getSession()
      this.state.currentUser = session?.user || null
    } catch (error) {
      console.error('Error getting session in backToDashboard:', error)
      this.state.currentUser = null
    }

    this.state.currentScreen = 'dashboard'
    this.render()

    // Загружаем баланс после рендера
    setTimeout(() => this.updateBalanceDisplay(), 100)
  }

  private async handlePaymentReturn(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search)
    const paymentStatus = urlParams.get('payment')

    if (paymentStatus === 'success' && this.state.currentUser) {
      // Оплата прошла успешно - начисляем баланс
      const amount = parseInt(urlParams.get('amount') || '0') / 100
      const months = parseInt(localStorage.getItem('pending_subscription_months') || '1')

      if (amount > 0) {
        await this.saveUserBalance(this.state.currentUser.id, amount, months)

        // Очищаем pending данные
        localStorage.removeItem('pending_subscription_months')

        // Обновляем баланс в интерфейсе
        await this.updateBalanceDisplay()

        // Показываем уведомление об успешной оплате
        setTimeout(() => {
          alert(`✅ Оплата прошла успешно!\n\nНа ваш счет зачислено: ${amount}₽\nПодписка активна на ${months} месяц${months > 1 ? 'ев' : ''}`)
        }, 1000)
      }
    } else if (paymentStatus === 'fail') {
      alert('❌ Оплата не была завершена')
    }
  }

  private async handleShareUrl(): Promise<void> {
    const urlParams = new URLSearchParams(window.location.search)
    const shareId = urlParams.get('share')

    if (shareId) {
      // Загружаем результаты по share_id
      try {
        const { data, error } = await this.supabase
          .from('test_results')
          .select('*')
          .eq('share_id', shareId)
          .single()

        if (error) {
          console.error('Ошибка загрузки результатов:', error)
          return
        }

        if (data) {
          // Показываем чужие результаты
          this.state.sharedResults = data
          this.state.currentScreen = 'shared-results'
        }
      } catch (error) {
        console.error('Ошибка при обработке share URL:', error)
      }
    }
  }

  private showSubscriptionModal(): void {
    const modal = document.createElement('div')
    modal.className = 'subscription-modal-overlay'
    modal.innerHTML = `
      <div class="subscription-modal">
        <div class="modal-header">
          <h3>💎 Premium подписка</h3>
          <button class="modal-close" id="modal-close">&times;</button>
        </div>
        <div class="modal-body">
          <div class="subscription-info">
            <h4>Выберите период подписки:</h4>
            <div class="subscription-periods">
              <div class="period-option" data-months="1">
                <div class="period-name">1 месяц</div>
                <div class="period-price">200₽</div>
                <div class="period-description">Базовая подписка</div>
              </div>
              <div class="period-option" data-months="2">
                <div class="period-name">2 месяца</div>
                <div class="period-price">
                  <span class="original-price">400₽</span>
                  <span class="discount-price">320₽</span>
                  <span class="discount-badge">Скидка 20%</span>
                </div>
                <div class="period-description">Экономия 80₽</div>
              </div>
            </div>
            <ul class="features-list">
              <li>✅ Детальный анализ результатов теста</li>
              <li>✅ Сохранение истории прохождений</li>
              <li>✅ Персональные рекомендации</li>
              <li>✅ Премиум поддержка</li>
            </ul>
          </div>
          <div class="payment-methods">
            <button class="payment-btn sbp-btn" id="pay-sbp" disabled>
              <div class="payment-icon">📱</div>
              <span>Оплатить через СБП</span>
              <small>QR-код в приложении банка</small>
            </button>
            <button class="payment-btn card-btn" id="pay-card" disabled>
              <div class="payment-icon">💳</div>
              <span>Банковской картой</span>
              <small>Visa, Mastercard, Мир</small>
            </button>
          </div>
          <p class="payment-note">Безопасная оплата через проверенные сервисы</p>
        </div>
      </div>
    `

    document.body.appendChild(modal)

    // Обработчики событий
    const closeBtn = modal.querySelector('#modal-close') as HTMLElement
    const sbpBtn = modal.querySelector('#pay-sbp') as HTMLElement
    const cardBtn = modal.querySelector('#pay-card') as HTMLElement
    const periodOptions = modal.querySelectorAll('.period-option') as NodeListOf<HTMLElement>

    closeBtn.addEventListener('click', () => this.closeSubscriptionModal(modal))
    modal.addEventListener('click', (e) => {
      if (e.target === modal) this.closeSubscriptionModal(modal)
    })

    // Обработчик выбора периода подписки
    let selectedMonths = 1
    periodOptions.forEach(option => {
      option.addEventListener('click', () => {
        // Убираем активный класс у всех опций
        periodOptions.forEach(opt => opt.classList.remove('active'))
        // Добавляем активный класс выбранной опции
        option.classList.add('active')
        selectedMonths = parseInt(option.dataset.months || '1')

        // Включаем кнопки оплаты
        sbpBtn.removeAttribute('disabled')
        cardBtn.removeAttribute('disabled')
        sbpBtn.style.opacity = '1'
        cardBtn.style.opacity = '1'
      })
    })

    sbpBtn.addEventListener('click', () => this.processPayment('sbp', selectedMonths))
    cardBtn.addEventListener('click', () => this.processPayment('card', selectedMonths))
  }

  private closeSubscriptionModal(modal: HTMLElement): void {
    modal.remove()
  }

  private processPayment(method: string, months: number = 1): void {
    // Интеграция с Тинькофф Оплатой
    console.log(`Начинаем оплату через ${method} на ${months} месяц(ев)`)

    // Сохраняем информацию о подписке для обработки после оплаты
    localStorage.setItem('pending_subscription_months', months.toString())

    // Рассчитываем стоимость со скидкой
    const basePrice = 200 // рублей за месяц
    const totalPrice = months === 2 ? basePrice * 2 * 0.8 : basePrice * months // 20% скидка за 2 месяца
    const amount = Math.round(totalPrice * 100) // Конвертируем в копейки

    // Получаем данные для оплаты
    const paymentData: PaymentData = {
      amount: amount,
      description: `Premium подписка на ${months} месяц${months > 1 ? 'ев' : ''} психологического теста`,
      customerKey: this.state.currentUser?.id || 'guest',
      email: this.state.currentUser?.email || '',
      paymentMethod: method as 'sbp' | 'card',
      subscriptionMonths: months
    }

    this.initiateTinkoffPayment(paymentData)
  }


  private async getUserBalance(): Promise<string> {
    if (!this.state.currentUser) {
      console.log('Пользователь не авторизован, баланс = 0')
      return '0'
    }

    try {
      console.log('Запрашиваем баланс для пользователя:', this.state.currentUser.id)
      console.log('Текущая сессия Supabase:', await this.supabase.auth.getSession())

      // Получаем баланс пользователя (может вернуть 0 или 1 запись)
      const { data, error } = await this.supabase
        .from('user_balances')
        .select('balance')
        .eq('user_id', this.state.currentUser.id)

      if (error) {
        console.error('Ошибка Supabase при получении баланса:', error)
        console.error('Код ошибки:', error.code)
        console.error('Сообщение ошибки:', error.message)

        // Для ошибок 406 или отсутствия таблицы просто логируем
        if (error.code === '406' || error.code === '42P01') {
          console.log('Проблема с таблицей или политиками')
        }

        // Другие ошибки - возвращаем 0
        return '0'
      }

      // Проверяем, есть ли данные (для новых пользователей data будет пустым массивом)
      if (!data || data.length === 0) {
        console.log('Запись о балансе не найдена (новый пользователь), возвращаем 0')
        return '0'
      }

      const balance = data[0]?.balance?.toString() || '0'
      console.log('Получен баланс из базы:', balance)
      return balance
    } catch (error) {
      console.error('Исключение при получении баланса:', error)
      return '0'
    }
  }

  private async updateBalanceDisplay(): Promise<void> {
    console.log('updateBalanceDisplay вызвана')
    const balanceElement = document.getElementById('user-balance')
    console.log('Элемент user-balance найден:', !!balanceElement)

    if (balanceElement) {
      // Проверяем, что мы находимся на dashboard экране
      if (this.state.currentScreen !== 'dashboard') {
        console.log('Не на dashboard экране, пропускаем обновление баланса')
        return
      }

      // Проверяем, что пользователь авторизован
      if (!this.state.currentUser) {
        console.log('Пользователь не авторизован, устанавливаем 0₽')
        balanceElement.textContent = '0₽'
        return
      }

      try {
        console.log('Получаем баланс...')
        const balance = await this.getUserBalance()
        console.log('Баланс получен:', balance)
        balanceElement.textContent = `${balance}₽`
        console.log('Баланс обновлен в DOM:', balance)
      } catch (error) {
        console.error('Ошибка обновления баланса:', error)
        balanceElement.textContent = '0₽'
      }
    } else {
      console.error('Элемент user-balance не найден в DOM')
    }
  }

  private async saveUserBalance(userId: string, amount: number, subscriptionMonths: number): Promise<void> {
    try {
      console.log(`Сохраняем баланс для пользователя ${userId}: +${amount}₽ за ${subscriptionMonths} месяц(ев)`)

      // Рассчитываем дату окончания подписки
      const expiresAt = new Date()
      expiresAt.setMonth(expiresAt.getMonth() + subscriptionMonths)

      // Проверяем, существует ли запись о балансе пользователя
      const { data: existingBalance, error: fetchError } = await this.supabase
        .from('user_balances')
        .select('balance, total_spent')
        .eq('user_id', userId)

      if (fetchError) {
        console.error('Ошибка получения существующего баланса:', fetchError)
        return
      }

      const currentBalance = existingBalance && existingBalance.length > 0 ? existingBalance[0].balance : 0
      const totalSpent = (existingBalance && existingBalance.length > 0 ? existingBalance[0].total_spent : 0) + amount

      // Обновляем или создаем запись баланса
      const { error: upsertError } = await this.supabase
        .from('user_balances')
        .upsert({
          user_id: userId,
          balance: currentBalance + amount,
          total_spent: totalSpent,
          subscription_expires_at: expiresAt.toISOString(),
          last_updated: new Date().toISOString()
        }, {
          onConflict: 'user_id'
        })

      if (upsertError) {
        console.error('Ошибка сохранения баланса:', upsertError)
        return
      }

      // Сохраняем запись о платеже
      const { error: paymentError } = await this.supabase
        .from('payment_records')
        .insert({
          user_id: userId,
          amount: amount * 100, // Сохраняем в копейках
          description: `Premium подписка на ${subscriptionMonths} месяц${subscriptionMonths > 1 ? 'ев' : ''}`,
          payment_method: 'tinkoff',
          status: 'completed',
          created_at: new Date().toISOString()
        })

      if (paymentError) {
        console.error('Ошибка сохранения записи платежа:', paymentError)
      }

      console.log('✅ Баланс успешно сохранен в Supabase')
    } catch (error) {
      console.error('Ошибка при сохранении баланса:', error)
    }
  }

  private async generateTinkoffSignature(data: any): Promise<string> {
    // Создаем строку для подписи в алфавитном порядке ключей
    const keys = Object.keys(data).sort()
    let signatureString = ''

    keys.forEach(key => {
      if (data[key] !== null && data[key] !== undefined && data[key] !== '') {
        signatureString += data[key]
      }
    })

    // Добавляем пароль
    signatureString += TINKOFF_CONFIG.password

    // Создаем SHA256 хеш
    const encoder = new TextEncoder()
    const dataBuffer = encoder.encode(signatureString)
    const hash = await crypto.subtle.digest('SHA-256', dataBuffer)
    const hashArray = Array.from(new Uint8Array(hash))
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('')
  }

  private async initiateTinkoffPayment(paymentData: PaymentData): Promise<void> {
    try {
      console.log('Инициируем платёж через Тинькофф:', paymentData)

      // Подготовка данных для Тинькофф API
      // Генерируем короткий OrderId (макс 50 символов)
      const shortOrderId = `ord_${Date.now().toString().slice(-8)}_${Math.random().toString(36).substr(2, 4)}`

      const tinkoffPaymentData: any = {
        TerminalKey: TINKOFF_CONFIG.terminalKey,
        Amount: paymentData.amount,
        OrderId: shortOrderId,
        Description: paymentData.description,
        CustomerKey: paymentData.customerKey,
        Email: paymentData.email,
        SuccessURL: TINKOFF_CONFIG.successUrl,
        FailURL: TINKOFF_CONFIG.failUrl,
        NotificationURL: TINKOFF_CONFIG.notificationUrl
      }

      // Для СБП пробуем только DATA параметры без PaymentMethod
      if (paymentData.paymentMethod === 'sbp') {
        tinkoffPaymentData.DATA = {
          'sbp': 'true',
          'qr': 'true',
          'payment_method': 'sbp'
        }
        console.log('Настройка оплаты через СБП только с DATA параметрами')
      }

      // Генерируем подпись
      const signature = await this.generateTinkoffSignature(tinkoffPaymentData)
      tinkoffPaymentData.Token = signature

      console.log('Отправляем данные в Тинькофф:', tinkoffPaymentData)

      // Отправляем запрос в Тинькофф API
      const response = await fetch('https://securepay.tinkoff.ru/v2/Init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(tinkoffPaymentData)
      })

      const result = await response.json()
      console.log('Ответ от Тинькофф:', result)

      if (result.Success) {
        // Перенаправляем пользователя на страницу оплаты
        console.log('Успешно создана ссылка на оплату:', result.PaymentURL)
        console.log(`Оплата: ${paymentData.paymentMethod === 'sbp' ? 'СБП' : 'Карта'}, Сумма: ${paymentData.amount / 100}₽`)

        window.location.href = result.PaymentURL
      } else {
        console.error('Ошибка Тинькофф:', result.Message)
        const errorMessage = paymentData.paymentMethod === 'sbp'
          ? `Ошибка оплаты через СБП: ${result.Message}

Возможные причины:
• СБП не подключен для этого терминала Тинькофф
• Региональные ограничения СБП
• Технические проблемы с QR-кодом

Что проверить в Личном кабинете Тинькофф:
1. Перейдите в раздел "Терминалы"
2. Выберите ваш терминал ${TINKOFF_CONFIG.terminalKey}
3. Проверьте вкладку "Быстрые платежи" или "СБП"
4. Убедитесь, что СБП активирован

Попробуйте оплатить банковской картой или свяжитесь с поддержкой Тинькофф.`
          : `Ошибка оплаты: ${result.Message}`

        alert(errorMessage)
      }

    } catch (error) {
      console.error('Ошибка при инициации платежа:', error)
      alert('Произошла ошибка при обработке платежа. Попробуйте позже.')
    }
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

  private updateProgress(): void {
    const progressFill = this.appElement.querySelector('#progress-fill') as HTMLElement
    if (progressFill) {
      const currentStep = this.state.currentQuestionIndex + 1
      const totalSteps = this.questions.length
      const progressPercent = (currentStep / totalSteps) * 100
      progressFill.style.width = `${progressPercent}%`
    }
  }

}
