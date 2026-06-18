/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { 
  Sparkles, 
  FileText, 
  Presentation, 
  Award, 
  BookOpen, 
  LogOut, 
  Check, 
  ChevronRight, 
  Download, 
  Plus, 
  Trash, 
  ArrowLeft, 
  Send, 
  CheckSquare, 
  RefreshCw, 
  Star, 
  Play, 
  Clock, 
  User, 
  Folder, 
  Info, 
  ExternalLink,
  Book,
  PenTool,
  CheckCircle,
  HelpCircle,
  TrendingUp,
  Sliders,
  ChevronLeft
} from 'lucide-react';
import { 
  User as UserType, 
  GeneratedPresentation, 
  GeneratedTest, 
  GeneratedQuiz, 
  SavedMaterial, 
  MaterialType,
  Slide
} from './types';
import * as api from './services/api';

export default function App() {
  // Authentication states
  const [currentUser, setCurrentUser] = useState<UserType | null>(() => {
    const saved = localStorage.getItem('ustai_user');
    return saved ? JSON.parse(saved) : null;
  });
  
  const [phoneInput, setPhoneInput] = useState('+7 (7');
  const [fullNameInput, setFullNameInput] = useState('');
  const [schoolInput, setSchoolInput] = useState('');
  const [subjectInput, setSubjectInput] = useState('Информатика');
  const [smsCodeInput, setSmsCodeInput] = useState('');
  
  const [isSmsSent, setIsSmsSent] = useState(false);
  const [simulatedSmsCode, setSimulatedSmsCode] = useState<string | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authLoading, setAuthLoading] = useState(false);

  // Active navigation/view states
  const [activeTab, setActiveTab] = useState<'dashboard' | 'presentation' | 'test' | 'quiz' | 'cabinet'>('dashboard');
  
  // Materials list
  const [savedMaterials, setSavedMaterials] = useState<SavedMaterial[]>([]);
  const [loadingMaterials, setLoadingMaterials] = useState(false);
  const [materialActionMessage, setMaterialActionMessage] = useState<string | null>(null);

  // 1. Presentation Generator state
  const [presSubject, setPresSubject] = useState('Информатика');
  const [presTopic, setPresTopic] = useState('');
  const [presGrade, setPresGrade] = useState('9-сынып');
  const [presSlideCount, setPresSlideCount] = useState(6);
  const [generatingPresentation, setGeneratingPresentation] = useState(false);
  const [generatedPresentation, setGeneratedPresentation] = useState<GeneratedPresentation | null>(null);
  const [activeSlideIndex, setActiveSlideIndex] = useState(0);

  // 2. Test Generator state
  const [testSubject, setTestSubject] = useState('Информатика');
  const [testTopic, setTestTopic] = useState('');
  const [testCount, setTestCount] = useState(5);
  const [testDifficulty, setTestDifficulty] = useState<'easy' | 'medium' | 'hard'>('medium');
  const [generatingTest, setGeneratingTest] = useState(false);
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null);
  const [userSelectedTestAnswers, setUserSelectedTestAnswers] = useState<Record<number, number[]>>({}); // questionIndex -> selectedOptionIndexes

  // 3. Quiz Generator state
  const [quizTopic, setQuizTopic] = useState('');
  const [quizCount, setQuizCount] = useState(5);
  const [generatingQuiz, setGeneratingQuiz] = useState(false);
  const [generatedQuiz, setGeneratedQuiz] = useState<GeneratedQuiz | null>(null);
  
  // Interactive Quiz Live Mode states
  const [quizGameActive, setQuizGameActive] = useState(false);
  const [quizCurrentIndex, setQuizCurrentIndex] = useState(0);
  const [quizSelectedOption, setQuizSelectedOption] = useState<number | null>(null);
  const [quizScore, setQuizScore] = useState(0);
  const [quizTimeLeft, setQuizTimeLeft] = useState(20);
  const [quizFinished, setQuizFinished] = useState(false);
  const [quizShowFeedback, setQuizShowFeedback] = useState(false);

  // Editor states
  const [editingMaterialId, setEditingMaterialId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');
  const [editingSubject, setEditingSubject] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Toast / Status state
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  // Loading indicator random quotes to make AI generation feel smooth
  const [generatingQuote, setGeneratingQuote] = useState('Тақырыпты талдап, сабақ жоспарын құрудамыз...');
  const quotes = [
    'Жасанды интеллект сабақ тақырыбын өңдеп жатыр...',
    'Қолайлы мысалдар мен сұрақтар таңдалуда...',
    'Педагогикалық әдістемеге сәйкес мазмұны реттелуде...',
    'Слайд дизайнер бірегей құрылым қалыптастыруда...',
    'Оқушыларға қызықты болатын логикалық тапсырмалар дайындалуда...'
  ];

  useEffect(() => {
    let interval: any;
    if (generatingPresentation || generatingTest || generatingQuiz) {
      interval = setInterval(() => {
        const randomQuote = quotes[Math.floor(Math.random() * quotes.length)];
        setGeneratingQuote(randomQuote);
      }, 3500);
    }
    return () => clearInterval(interval);
  }, [generatingPresentation, generatingTest, generatingQuiz]);

  // Load materials when user logs in
  useEffect(() => {
    if (currentUser) {
      loadUserMaterials();
    }
  }, [currentUser]);

  // Interactive Quiz timer
  useEffect(() => {
    let timer: any;
    if (quizGameActive && !quizFinished && !quizShowFeedback && quizTimeLeft > 0) {
      timer = setTimeout(() => {
        setQuizTimeLeft(prev => prev - 1);
      }, 1000);
    } else if (quizTimeLeft === 0 && quizGameActive && !quizShowFeedback && !quizFinished) {
      // Time-out transition
      handleQuizAnswer(-1); // wrong answer index
    }
    return () => clearTimeout(timer);
  }, [quizGameActive, quizFinished, quizShowFeedback, quizTimeLeft]);

  const loadUserMaterials = async () => {
    if (!currentUser) return;
    setLoadingMaterials(true);
    try {
      const data = await api.getSavedMaterials(currentUser.id);
      setSavedMaterials(data);
    } catch (err) {
      console.error(err);
      showToast('Материалдарды жүктеу кезінде қате орын алды', 'error');
    } finally {
      setLoadingMaterials(false);
    }
  };

  const showToast = (text: string, type: 'success' | 'error' | 'info' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Auth: Submit Phone for Code
  const handleRequestSms = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const data = await api.registerPhone({
        phone: phoneInput,
        fullName: fullNameInput.trim() || 'Ұстаз',
        school: schoolInput.trim() || 'Мектеп',
        subject: subjectInput
      });
      setIsSmsSent(true);
      setSimulatedSmsCode(data.smsCodeSimulated);
      showToast('SMS код сәтті жіберілді!', 'success');
    } catch (err: any) {
      setAuthError(err.message || 'SMS жіберу мүмкін болмады');
    } finally {
      setAuthLoading(false);
    }
  };

  // Auth: Verify SMS Code
  const handleVerifySms = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    setAuthLoading(true);
    try {
      const data = await api.verifyCode(phoneInput, smsCodeInput);
      if (data.success) {
        setCurrentUser(data.user);
        localStorage.setItem('ustai_user', JSON.stringify(data.user));
        showToast(`Қош келдіңіз, ${data.user.fullName}!`, 'success');
        setActiveTab('dashboard');
      }
    } catch (err: any) {
      setAuthError(err.message || 'Растау коды сәйкес келмейді. Терілуін тексеріңіз.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('ustai_user');
    setIsSmsSent(false);
    setSmsCodeInput('');
    setSimulatedSmsCode(null);
    setActiveTab('dashboard');
    showToast('Жүйеден сәтті шықтыңыз!', 'success');
  };

  // Preset quick fill topics based on subject chosen
  const fillPresetTopic = (topic: string, type: 'presentation' | 'test' | 'quiz') => {
    if (type === 'presentation') {
      setPresTopic(topic);
    } else if (type === 'test') {
      setTestTopic(topic);
    } else {
      setQuizTopic(topic);
    }
    showToast(`"${topic}" тақырыбы таңдалды`, 'success');
  };

  const subjectPresets: Record<string, string[]> = {
    'Информатика': ['Ақпараттық қауіпсіздік негіздері', 'Жасанды интеллекттің даму тарихы', 'Python тіліндегі циклдер'],
    'Математика': ['Тригонометриялық теңдеулер жүйесі', 'Туынды және оның қолданылуы', 'Геометриялық прогрессия'],
    'Физика': ['Ньютон заңдары және олардың маңызы', 'Жарықтың дисперсиясы мен интерференциясы', 'Термодинамика негіздері'],
    'Биология': ['Фотосинтездің жарық және қараңғы фазалары', 'ДНҚ мен РНҚ молекулалық құрылымы', 'Адам эволюциясы тұжырымдамасы'],
    'Тарих': ['Алтын Орда мемлекетінің кезеңдері', 'Қазақ хандығының құрылуы мен нығаюы', 'Ұлы Жібек жолының маңызы']
  };

  // AI Actions: Generate Presentation
  const handleGeneratePresentation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!presTopic.trim()) {
      showToast('Тақырыпты енгізіңіз', 'error');
      return;
    }
    setGeneratingPresentation(true);
    setGeneratedPresentation(null);
    try {
      const data = await api.generatePresentation({
        subject: presSubject,
        topic: presTopic.trim(),
        grade: presGrade,
        slideCount: presSlideCount
      });
      setGeneratedPresentation(data);
      setActiveSlideIndex(0);
      showToast('Презентация сәтті дайындалды!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Генерация кезінде ақау шықты', 'error');
    } finally {
      setGeneratingPresentation(false);
    }
  };

  // AI Actions: Generate Test
  const handleGenerateTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testTopic.trim()) {
      showToast('Тест тақырыбын енгізіңіз', 'error');
      return;
    }
    setGeneratingTest(true);
    setGeneratedTest(null);
    setUserSelectedTestAnswers({});
    try {
      const data = await api.generateTest({
        subject: testSubject,
        topic: testTopic.trim(),
        questionCount: testCount,
        difficulty: testDifficulty
      });
      setGeneratedTest(data);
      showToast('Тест сұрақтары сәтті жасалды!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Тест генерациясы сәтсіз аяқталды', 'error');
    } finally {
      setGeneratingTest(false);
    }
  };

  // AI Actions: Generate Quiz
  const handleGenerateQuiz = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quizTopic.trim()) {
      showToast('Викторина тақырыбын енгізіңіз', 'error');
      return;
    }
    setGeneratingQuiz(true);
    setGeneratedQuiz(null);
    setQuizGameActive(false);
    try {
      const data = await api.generateQuiz({
        topic: quizTopic.trim(),
        questionCount: quizCount
      });
      setGeneratedQuiz(data);
      showToast('Викторина сұрақтары дайын!', 'success');
    } catch (err: any) {
      showToast(err.message || 'Викторина генерациясы орындалмады', 'error');
    } finally {
      setGeneratingQuiz(false);
    }
  };

  // Save generated material to Cabinet and database session
  const handleSaveMaterial = async (type: MaterialType, title: string, subject: string, data: any) => {
    if (!currentUser) {
      showToast('Материалды сақтау үшін тіркеліңіз', 'error');
      return;
    }
    setSaveLoading(true);
    try {
      const response = await api.saveMaterial({
        userId: currentUser.id,
        type,
        title,
        subject,
        data
      });
      if (response.success) {
        showToast('Сабақ материалы жеке кабинетіңізге сақталды!', 'success');
        loadUserMaterials();
      }
    } catch (err: any) {
      showToast(err.message || 'Сақтау сәтсіз аяқталды', 'error');
    } finally {
      setSaveLoading(false);
    }
  };

  // Reopen a saved material from Cabinet list
  const handleOpenMaterial = (material: SavedMaterial) => {
    const { type, data } = material;
    if (type === 'presentation') {
      const pres = data as GeneratedPresentation;
      setGeneratedPresentation(pres);
      setPresSubject(material.subject);
      setPresTopic(material.title);
      setPresGrade(pres.grade || '9-сынып');
      setPresSlideCount(pres.slideCount || pres.slides.length);
      setActiveSlideIndex(0);
      setActiveTab('presentation');
    } else if (type === 'test') {
      const test = data as GeneratedTest;
      setGeneratedTest(test);
      setTestSubject(material.subject);
      setTestTopic(material.title);
      setTestCount(test.questionCount);
      setTestDifficulty(test.difficulty || 'medium');
      setUserSelectedTestAnswers({});
      setActiveTab('test');
    } else if (type === 'quiz') {
      const quiz = data as GeneratedQuiz;
      setGeneratedQuiz(quiz);
      setQuizTopic(material.title);
      setQuizCount(quiz.questionCount);
      setQuizGameActive(false);
      setActiveTab('quiz');
    }
    showToast(`"${material.title}" жүктелді`, 'success');
  };

  // Delete saved material
  const handleDeleteMaterial = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Бұл сабақ материалын біржола жойғыңыз келе ме?')) return;
    try {
      const res = await api.deleteMaterial(id);
      if (res.success) {
        showToast('Материал сәтті жойылды', 'success');
        loadUserMaterials();
      }
    } catch (err: any) {
      showToast(err.message || 'Жою кезінде қате кетті', 'error');
    }
  };

  // Local storage cache simulation of PDF/PPTX exporter
  const triggerDownload = (fileName: string, mime: string, content: string) => {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    showToast(`"${fileName}" файлы сәтті жүктелді!`, 'success');
  };

  const handleExportPresentation = (format: 'pptx' | 'pdf') => {
    if (!generatedPresentation) return;
    
    let contentString = `Ustai.kz — Жан-жақты Сабақ Материалы\n`;
    contentString += `Презентация Тақырыбы: ${generatedPresentation.title}\n`;
    contentString += `Пән: ${generatedPresentation.subject} | Сыныбы: ${generatedPresentation.grade || 'Ақпараттық сынып'}\n`;
    contentString += `Жасалған уақыты: ${new Date().toLocaleDateString('kk-KZ')}\n`;
    contentString += `==========================================\n\n`;

    generatedPresentation.slides.forEach((slide, idx) => {
      contentString += `СЛАЙД №${idx + 1}: ${slide.title}\n`;
      contentString += `[Макет: ${slide.layout.toUpperCase()}]\n`;
      contentString += `------------------------------------------\n`;
      slide.content.forEach((point) => {
        contentString += `• ${point}\n`;
      });
      contentString += `\n[Мұғалім сөзі (Спикер жазбалары)]:\n${slide.speakerNotes}\n`;
      contentString += `==========================================\n\n`;
    });

    const extension = format === 'pptx' ? 'txt' : 'pdf.txt';
    const filename = `${generatedPresentation.title.replace(/\s+/g, '_')}_Ustai_kz.${extension}`;
    triggerDownload(filename, 'text/plain;charset=utf-8', contentString);
  };

  const handleExportTest = () => {
    if (!generatedTest) return;
    
    let contentString = `Ustai.kz — Бақылау Тест Тапсырмалары\n`;
    contentString += `Тест атауы: ${generatedTest.title}\n`;
    contentString += `Пән: ${generatedTest.subject} | Деңгейі: ${generatedTest.difficulty === 'easy' ? 'Оңай' : generatedTest.difficulty === 'hard' ? 'Қиын' : 'Орташа'}\n`;
    contentString += `Жасалған уақыты: ${new Date().toLocaleDateString('kk-KZ')}\n`;
    contentString += `==========================================\n\n`;

    generatedTest.questions.forEach((q, idx) => {
      contentString += `Сұрақ №${idx + 1}: ${q.questionText}\n`;
      contentString += `[Түрі: ${q.type === 'multiple' ? 'Бірнеше дұрыс жауап' : 'Бір дұрыс жауап'}]\n`;
      q.options.forEach((opt) => {
        contentString += `  ${opt}\n`;
      });
      const correctText = q.correctAnswers.map(ansIdx => q.options[ansIdx]).join(', ');
      contentString += `Дұрыс жауап(тар): ${correctText}\n`;
      contentString += `Түсіндірме: ${q.explanation}\n`;
      contentString += `------------------------------------------\n\n`;
    });

    const filename = `${generatedTest.title.replace(/\s+/g, '_')}_test_Ustai_kz.txt`;
    triggerDownload(filename, 'text/plain;charset=utf-8', contentString);
  };

  const startInteractiveQuizGame = () => {
    if (!generatedQuiz || !generatedQuiz.questions.length) return;
    setQuizGameActive(true);
    setQuizCurrentIndex(0);
    setQuizSelectedOption(null);
    setQuizScore(0);
    setQuizTimeLeft(20);
    setQuizFinished(false);
    setQuizShowFeedback(false);
  };

  const handleQuizAnswer = (optionIdx: number) => {
    if (quizShowFeedback || quizFinished) return;
    
    setQuizSelectedOption(optionIdx);
    setQuizShowFeedback(true);
    
    const currentQuestion = generatedQuiz!.questions[quizCurrentIndex];
    if (optionIdx === currentQuestion.correctIndex) {
      setQuizScore(prev => prev + currentQuestion.points);
    }
    
    setTimeout(() => {
      if (quizCurrentIndex + 1 < generatedQuiz!.questions.length) {
        setQuizCurrentIndex(prev => prev + 1);
        setQuizSelectedOption(null);
        setQuizShowFeedback(false);
        setQuizTimeLeft(20);
      } else {
        setQuizFinished(true);
      }
    }, 3800);
  };

  // Test Yourself Answer Handler
  const toggleTestAnswerSelection = (questionIdx: number, optionIdx: number, questionType: 'single' | 'multiple') => {
    setUserSelectedTestAnswers(prev => {
      const currentSelections = prev[questionIdx] || [];
      if (questionType === 'single') {
        return { ...prev, [questionIdx]: [optionIdx] };
      } else {
        const index = currentSelections.indexOf(optionIdx);
        let updated = [...currentSelections];
        if (index > -1) {
          updated.splice(index, 1);
        } else {
          updated.push(optionIdx);
        }
        return { ...prev, [questionIdx]: updated };
      }
    });
  };

  return (
    <div className="bg-slate-50 text-slate-900 font-sans min-h-screen flex flex-col antialiased">
      {/* Top Banner with info about Simulated Auth Code */}
      {isSmsSent && !currentUser && simulatedSmsCode && (
        <div id="demo-sms-indicator" className="bg-gradient-to-r from-amber-500 to-orange-600 text-white py-2 px-4 text-center text-xs font-bold tracking-wide shadow-inner flex items-center justify-center gap-2">
          <span>🔔 MVP Платформа: Тіркелуді растауға арналған SMS-код: </span>
          <span className="bg-white text-slate-950 px-2 py-0.5 rounded border border-amber-300 font-mono text-sm tracking-widest animate-pulse">{simulatedSmsCode}</span>
          <span className="hidden sm:inline">(Растау үшін осы кодты енгізіңіз немесе '1111' немесе '7777')</span>
        </div>
      )}

      {/* Navigation Bar */}
      <nav id="navbar" className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-8 flex-shrink-0 sticky top-0 z-50 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white font-extrabold text-xl shadow-md shadow-indigo-200">U</div>
          <div className="flex flex-col">
            <span className="text-xl font-extrabold text-slate-800 tracking-tight flex items-center gap-1">
              Ustai<span className="text-indigo-600">.kz</span>
              <span className="text-[10px] bg-indigo-100 text-indigo-700 px-1.5 py-0.2 rounded font-bold uppercase tracking-tight">MVP</span>
            </span>
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Мұғалімдердің AI көмекшісі</span>
          </div>
        </div>

        <div className="flex items-center gap-3 sm:gap-6">
          <div className="flex gap-2 sm:gap-4 text-sm font-semibold text-slate-500">
            <button 
              onClick={() => { setActiveTab('dashboard'); }} 
              className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'dashboard' ? 'text-indigo-600 bg-indigo-50' : 'hover:text-slate-800'}`}
            >
              Басты бет
            </button>
            {currentUser && (
              <button 
                onClick={() => { setActiveTab('cabinet'); }} 
                className={`px-3 py-1.5 rounded-lg transition-colors ${activeTab === 'cabinet' ? 'text-indigo-600 bg-indigo-50' : 'hover:text-slate-800'}`}
              >
                Материалдарым
              </button>
            )}
          </div>
          
          <div className="h-6 w-[1px] bg-slate-200 mx-1"></div>
          
          {currentUser ? (
            <div className="flex items-center gap-2 sm:gap-3 bg-slate-100 hover:bg-slate-200/80 py-1.5 px-3 rounded-full border border-slate-200 transition-colors">
              <div className="w-7 h-7 bg-indigo-600 rounded-full flex items-center justify-center text-white font-bold text-xs uppercase shadow-sm">
                {currentUser.fullName.slice(0, 2)}
              </div>
              <span className="text-sm font-semibold text-slate-700 hidden md:inline max-w-[120px] truncate">{currentUser.fullName}</span>
              <button onClick={handleLogout} className="text-slate-500 hover:text-red-600 transition-colors p-1" title="Жүйеден шығу">
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <button 
              onClick={() => {
                const element = document.getElementById('login-modal-anchor');
                if (element) {
                  element.scrollIntoView({ behavior: 'smooth' });
                } else {
                  showToast('Төменде орналасқан авторизация жиегін толтырыңыз.', 'info');
                }
              }} 
              className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs sm:text-sm py-2 px-4 rounded-xl shadow-xs transition-transform transform active:scale-95"
            >
              Тіркелу / Кіру
            </button>
          )}
        </div>
      </nav>

      {/* Main Container Wrapper */}
      <div id="main-frame" className="flex-1 flex flex-col md:flex-row overflow-x-hidden">
        
        {/* Sidebar */}
        <aside id="sidebar" className="w-full md:w-64 bg-white border-b md:border-b-0 md:border-r border-slate-200 p-4 sm:p-6 flex flex-col gap-4 flex-shrink-0">
          {currentUser ? (
            <div className="bg-gradient-to-br from-indigo-50 to-indigo-100/50 p-4 rounded-2xl border border-indigo-100 flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <div className="h-2 w-2 bg-emerald-500 rounded-full animate-ping"></div>
                <p className="text-[10px] font-bold text-indigo-800 tracking-wider uppercase">Профиль белсенді</p>
              </div>
              <p className="text-sm font-bold text-slate-800 truncate">{currentUser.fullName}</p>
              <p className="text-[11px] text-slate-500 truncate">{currentUser.school}</p>
              <div className="h-[1px] bg-indigo-200/60 my-1"></div>
              <p className="text-[11px] text-slate-600"><span className="font-bold">Пән:</span> {currentUser.subject}</p>
            </div>
          ) : (
            <div className="bg-slate-100 p-4 rounded-2xl text-center border border-dashed border-slate-300">
              <p className="text-xs text-slate-500 font-semibold mb-2">Сабақтарыңызды кабинетте сақтау үшін тіркеліңіз</p>
              <button 
                onClick={() => {
                  const element = document.getElementById('login-modal-anchor');
                  if (element) element.scrollIntoView({ behavior: 'smooth' });
                }}
                className="w-full py-1.5 px-3 bg-white hover:bg-slate-50 border border-slate-200 text-slate-800 text-xs font-bold rounded-lg shadow-2xs transition-colors"
              >
                Тіркелу терезесі
              </button>
            </div>
          )}

          <div id="sidebar-tools" className="mt-2 flex flex-col gap-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest px-3 mb-2">Жылдам Навигация</p>
            
            <button 
              onClick={() => { setActiveTab('dashboard'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${activeTab === 'dashboard' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-base">📊</span> <span>Басты бет</span>
              </span>
              <ChevronRight className={`w-3.5 h-3.5 transition-transform ${activeTab === 'dashboard' ? 'rotate-90' : ''}`} />
            </button>

            <button 
              onClick={() => { setActiveTab('presentation'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${activeTab === 'presentation' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Presentation className="w-4 h-4 text-amber-500" />
                <span>AI Презентация</span>
              </span>
              {activeTab === 'presentation' && <Check className="w-4 h-4 text-white" />}
            </button>

            <button 
              onClick={() => { setActiveTab('test'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${activeTab === 'test' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <FileText className="w-4 h-4 text-emerald-500" />
                <span>AI Тест жасау</span>
              </span>
              {activeTab === 'test' && <Check className="w-4 h-4 text-white" />}
            </button>

            <button 
              onClick={() => { setActiveTab('quiz'); }}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${activeTab === 'quiz' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
            >
              <span className="flex items-center gap-2.5">
                <Award className="w-4 h-4 text-orange-500" />
                <span>AI Викторина</span>
              </span>
              {activeTab === 'quiz' && <Check className="w-4 h-4 text-white" />}
            </button>

            {currentUser && (
              <button 
                onClick={() => { setActiveTab('cabinet'); }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left text-sm font-medium transition-colors ${activeTab === 'cabinet' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-50'}`}
              >
                <span className="flex items-center gap-2.5">
                  <Folder className="w-4 h-4 text-sky-500" />
                  <span>Материалдар Архиві</span>
                </span>
                <span className="bg-slate-100 text-slate-700 px-1.5 py-0.2 rounded text-[10px] font-bold">{savedMaterials.length}</span>
              </button>
            )}
          </div>

          <div className="mt-auto pt-6 border-t border-slate-100 flex flex-col gap-3">
            <div className="p-4 bg-indigo-50/70 rounded-2xl border border-indigo-100 shadow-3xs">
              <div className="flex justify-between items-center">
                <p className="text-xs font-bold text-indigo-800">AI Күнделікті Лимит</p>
                <span className="text-[10px] bg-indigo-200 text-indigo-900 px-1.5 py-0.2 rounded font-bold">Бейтарап</span>
              </div>
              <div className="w-full bg-indigo-100 h-2 rounded-full mt-2.5 overflow-hidden">
                <div className="bg-indigo-600 h-2 rounded-full" style={{ width: '65%' }}></div>
              </div>
              <p className="text-[10px] text-slate-500 mt-2 font-medium">Осы айда 13 / 20 материал қалды</p>
            </div>

            <div className="text-[10px] text-slate-400 text-center font-medium">
              &copy; 2026 Ustai.kz MVP.<br/>Бүкіл құқықтар қорғалған.
            </div>
          </div>
        </aside>

        {/* Dynamic Screens Viewport Area */}
        <main className="flex-1 p-4 sm:p-8 overflow-y-auto">
          <div className="max-w-5xl mx-auto flex flex-col gap-6">

            {/* Global Toast Alert banner */}
            {toastMessage && (
              <div id="toast-banner" className={`sticky top-2 z-55 flex items-center gap-3 p-4 rounded-xl shadow-md transition-all border ${
                toastMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : 
                toastMessage.type === 'info' ? 'bg-amber-50 text-amber-800 border-amber-200' : 'bg-red-50 text-red-800 border-red-200'
              }`}>
                <div className={`w-6 h-6 rounded-full flex items-center justify-center ${
                  toastMessage.type === 'success' ? 'bg-emerald-100 text-emerald-700' : 
                  toastMessage.type === 'info' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'
                }`}>
                  {toastMessage.type === 'success' ? <Check className="w-3.5 h-3.5 font-bold" /> : <Info className="w-3.5 h-3.5" />}
                </div>
                <p className="text-sm font-semibold">{toastMessage.text}</p>
              </div>
            )}

            {/* SCREEN 1: BENTO GRID DASHBOARD */}
            {activeTab === 'dashboard' && (
              <div id="dashboard-tab" className="space-y-8 animate-fadeIn">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs">
                  <div>
                    <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 leading-tight">Қайырлы күн, {currentUser ? currentUser.fullName : 'Құрметті Ұстаз'}! 👋</h1>
                    <p className="text-slate-500 mt-1 max-w-xl">
                      Ustai.kz — жасанды интеллект көмегімен сабаққа қатысты презентацияларды, тест сұрақтарын және интерактивті викториналарды 1 минутта жасау платформасы.
                    </p>
                  </div>
                  {!currentUser && (
                    <button 
                      onClick={() => {
                        const el = document.getElementById('login-modal-anchor');
                        if (el) el.scrollIntoView({ behavior: 'smooth' });
                      }}
                      className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold text-xs sm:text-sm py-2.5 px-5 rounded-2xl flex items-center gap-2 shadow-sm shrink-0"
                    >
                      <span>Тіркеліп Лимитті сақтаңыз</span>
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  )}
                </header>

                <h2 className="text-lg font-bold text-slate-800 uppercase tracking-wider px-1">AI Сабақ Дайындау Құралдары</h2>

                {/* Bento Grid layout representing 3 core AI modules */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  
                  {/* AI Presentation (Wide Bento Card) */}
                  <div 
                    onClick={() => { setActiveTab('presentation'); }}
                    className="md:col-span-2 bg-gradient-to-br from-white to-slate-50/50 rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between hover:border-indigo-400 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl group-hover:scale-105 transition-transform">
                        <Presentation className="w-8 h-8" />
                      </div>
                      <span className="px-3 py-1 bg-indigo-100 text-indigo-800 text-xs font-bold rounded-full uppercase tracking-tight animate-pulse flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Жаңа мүмкіндік
                      </span>
                    </div>
                    
                    <div className="mt-8">
                      <h3 className="text-xl sm:text-2xl font-black text-slate-900 group-hover:text-indigo-600 transition-colors">
                        AI Презентация Генераторы
                      </h3>
                      <p className="text-slate-500 text-sm mt-2 max-w-lg">
                        Сабақ тақырыбы мен слайд санын енгізсеңіз болғаны. Дайын слайдтар құрылымы, тезистері және мұғалімнің түсіндірме дауыстық сөзі лезде жасалып шығады. PPTX форматында жүктеуге болады.
                      </p>
                      
                      <div className="mt-6 flex flex-wrap gap-2 items-center justify-between pt-4 border-t border-slate-100">
                        <div className="flex gap-1.5">
                          <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">PPTX / PDF</span>
                          <span className="px-3 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-600">Спикерлік макет</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-600 group-hover:translate-x-1 transition-transform">
                          <span>Бастау</span>
                          <ChevronRight className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Test (Standard Bento Card) */}
                  <div 
                    onClick={() => { setActiveTab('test'); }}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between hover:border-emerald-400 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-3.5 bg-emerald-50 text-emerald-600 rounded-2xl group-hover:scale-105 transition-transform">
                        <FileText className="w-8 h-8" />
                      </div>
                      <span className="px-2.5 py-1 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded-full uppercase">Сынақ нұсқа</span>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-950 group-hover:text-emerald-600 transition-colors">
                        AI Тест Жасау
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        Жалғыз және көп жауапты тест сұрақтарын құру құралы. Оқушылар білімін бағалауға арналған дұрыс жауаптарымен автоматты белгіленеді.
                      </p>
                      
                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400">Пән мен қиындығы таңдалады</span>
                        <div className="w-8 h-8 bg-emerald-50 text-emerald-600 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                          <Plus className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* AI Quiz (Standard Bento Card) */}
                  <div 
                    onClick={() => { setActiveTab('quiz'); }}
                    className="bg-white rounded-3xl border border-slate-200/80 p-6 sm:p-8 shadow-xs flex flex-col justify-between hover:border-orange-400 group transition-all duration-300 transform hover:-translate-y-1 cursor-pointer"
                  >
                    <div className="flex justify-between items-start">
                      <div className="p-3.5 bg-orange-50 text-orange-600 rounded-2xl group-hover:scale-105 transition-transform">
                        <Award className="w-8 h-8" />
                      </div>
                      <span className="px-2.5 py-1 bg-orange-50 text-orange-700 text-[10px] font-bold rounded-full uppercase">Интерактивті</span>
                    </div>

                    <div className="mt-8">
                      <h3 className="text-lg sm:text-xl font-bold text-slate-950 group-hover:text-orange-600 transition-colors">
                        AI Викторина
                      </h3>
                      <p className="text-slate-500 text-xs sm:text-sm mt-1">
                        Оқушыларға арналған ойын стиліндегі викторина. Тақырыпты қызықты сұрақтармен ойын түрінде түсіндіріп, бағалаңыз!
                      </p>
                      
                      <div className="mt-6 flex items-center justify-between pt-4 border-t border-slate-100">
                        <span className="text-[11px] font-bold text-slate-400">Сыныптағы Kahoot стилі</span>
                        <div className="w-8 h-8 bg-orange-50 text-orange-600 rounded-full flex items-center justify-center font-bold text-sm group-hover:bg-orange-600 group-hover:text-white transition-colors">
                          <Play className="w-4 h-4" />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Saved Cabinet Table (Integrated in Bento Panel dynamically for current users) */}
                  <div className="md:col-span-3 bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs">
                    <div className="flex items-center justify-between mb-4 pb-2 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <Book className="w-5 h-5 text-indigo-600" />
                        <h3 className="font-extrabold text-slate-900 text-lg">Кабинеттегі соңғы сақталған материалдар</h3>
                      </div>
                      {currentUser ? (
                        <button 
                          onClick={() => { setActiveTab('cabinet'); }} 
                          className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1"
                        >
                          <span>Архивке өту</span>
                          <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                      ) : null}
                    </div>

                    {!currentUser ? (
                      <div className="text-center py-8">
                        <p className="text-sm text-slate-500 max-w-sm mx-auto">
                          Сіз жасаған материалдарды жеке кабинетте сақтау және кейіннен қайта өңдеу/жүктеу үшін телефон арқылы жылдам тіркеліңіз.
                        </p>
                      </div>
                    ) : loadingMaterials ? (
                      <div className="flex items-center justify-center py-8 gap-2 text-slate-500">
                        <RefreshCw className="w-5 h-5 animate-spin text-indigo-600" />
                        <span className="text-sm">Жүктелуде...</span>
                      </div>
                    ) : savedMaterials.length === 0 ? (
                      <div className="text-center py-8 bg-slate-50/50 rounded-2xl border border-dashed border-slate-200">
                        <p className="text-sm text-slate-500 font-medium">Әзірге ешқандай материал сақталмаған.</p>
                        <p className="text-xs text-slate-400 mt-1">Презентация немесе тест құрастырып, "Кабинетке сақтау" түймесін басыңыз.</p>
                      </div>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="text-slate-400 border-b border-slate-100 text-left">
                              <th className="pb-3 text-xs font-extrabold uppercase">Материал Түрі</th>
                              <th className="pb-3 text-xs font-extrabold uppercase">Пән / Тақырып атауы</th>
                              <th className="pb-3 text-xs font-extrabold uppercase">Құрылған мерзімі</th>
                              <th className="pb-3 text-right text-xs font-extrabold uppercase">Әрекеттер</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50">
                            {savedMaterials.slice(0, 4).map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50/60 transition-colors group">
                                <td className="py-3.5">
                                  <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${
                                    m.type === 'presentation' ? 'bg-amber-100 text-amber-800' :
                                    m.type === 'test' ? 'bg-emerald-100 text-emerald-800' : 'bg-orange-100 text-orange-800'
                                  }`}>
                                    {m.type === 'presentation' ? 'Презентация' :
                                     m.type === 'test' ? 'Тест' : 'Викторина'}
                                  </span>
                                </td>
                                <td className="py-3.5">
                                  <div className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors">{m.title}</div>
                                  <div className="text-xs text-slate-400 font-medium">{m.subject}</div>
                                </td>
                                <td className="py-3.5 text-xs text-slate-500 font-medium">
                                  {new Date(m.createdAt).toLocaleDateString('kk-KZ')}
                                </td>
                                <td className="py-3.5 text-right whitespace-nowrap">
                                  <div className="flex justify-end gap-2">
                                    <button 
                                      onClick={() => handleOpenMaterial(m)}
                                      className="py-1 px-3 bg-indigo-50 text-indigo-600 hover:bg-indigo-600 hover:text-white rounded-lg text-xs font-extrabold shadow-3xs transition-all"
                                    >
                                      Ашу
                                    </button>
                                    <button 
                                      onClick={(e) => handleDeleteMaterial(m.id, e)}
                                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors"
                                      title="Жою"
                                    >
                                      <Trash className="w-3.5 h-3.5" />
                                    </button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>

                {/* LOGIN / DISCOVERY FORM ANCHOR BLOCK */}
                {!currentUser && (
                  <div id="login-modal-anchor" className="bg-gradient-to-br from-indigo-700 to-indigo-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 p-8 text-white opacity-10 pointer-events-none">
                      <Sparkles className="w-40 h-40" />
                    </div>
                    
                    <div id="auth-box" className="max-w-xl mx-auto flex flex-col items-center">
                      <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center font-bold text-2xl mb-4 shadow-sm">U</div>
                      <h2 className="text-2xl sm:text-3xl font-extrabold text-center">Телефон нөмірі арқылы тез тіркелу</h2>
                      <p className="text-indigo-200 text-xs sm:text-sm text-center mt-1 max-w-md">
                        Мұғалімдердің аты-жөнін, пәнін таңдап, SMS код арқылы 3 секундта кіріңіз. Бүкіл материалдарыңыз сақталады!
                      </p>

                      {authError && (
                        <div className="w-full bg-red-500/20 border border-red-500/40 p-3 rounded-xl mt-4 text-xs font-semibold text-red-100 flex items-center gap-2">
                          <Info className="w-4 h-4 shrink-0" />
                          <span>{authError}</span>
                        </div>
                      )}

                      {!isSmsSent ? (
                        <form onSubmit={handleRequestSms} className="w-full mt-6 space-y-4">
                          <div>
                            <label className="block text-[11px] font-bold text-indigo-200 uppercase mb-1">Толық Аты-Жөніңіз (Мысалы: Бауыржан А.А.)</label>
                            <input 
                              type="text"
                              required
                              placeholder="Аты-жөнді енгізіңіз"
                              value={fullNameInput}
                              onChange={(e) => setFullNameInput(e.target.value)}
                              className="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-slate-950 placeholder-indigo-200/80 focus:placeholder-slate-400 font-semibold p-3 rounded-xl border border-white/20 outline-none transition-all text-sm rounded-lg"
                            />
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                              <label className="block text-[11px] font-bold text-indigo-200 uppercase mb-1">Ұялы Телефон нөмірі</label>
                              <input 
                                type="tel"
                                required
                                placeholder="+7 (707) 123-4567"
                                value={phoneInput}
                                onChange={(e) => setPhoneInput(e.target.value)}
                                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-slate-950 placeholder-indigo-200/80 focus:placeholder-slate-400 font-semibold p-3 rounded-xl border border-white/20 outline-none transition-all text-sm rounded-lg"
                              />
                            </div>
                            <div>
                              <label className="block text-[11px] font-bold text-indigo-200 uppercase mb-1">Мектеп немесе Оқу орны</label>
                              <input 
                                type="text"
                                required
                                placeholder="Мектеп-лицей №17"
                                value={schoolInput}
                                onChange={(e) => setSchoolInput(e.target.value)}
                                className="w-full bg-white/10 hover:bg-white/15 focus:bg-white text-slate-950 placeholder-indigo-200/80 focus:placeholder-slate-400 font-semibold p-3 rounded-xl border border-white/20 outline-none transition-all text-sm rounded-lg"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-indigo-200 uppercase mb-1">Оқытатын Пәніңіз</label>
                            <select 
                              value={subjectInput}
                              onChange={(e) => setSubjectInput(e.target.value)}
                              className="w-full bg-white/10 text-white font-semibold p-3 rounded-xl border border-white/20 focus:text-slate-950 outline-none transition-all text-sm rounded-lg"
                            >
                              <option value="Информатика">Информатика</option>
                              <option value="Математика">Математика</option>
                              <option value="Физика">Физика</option>
                              <option value="Биология">Биология</option>
                              <option value="Тарих">Тарих</option>
                              <option value="Басқа Пән">Басқа Пән</option>
                            </select>
                          </div>

                          <button 
                            type="submit" 
                            disabled={authLoading}
                            className="w-full py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-500 text-slate-950 font-extrabold text-sm rounded-xl transition-all shadow-md transform hover:scale-[1.01] active:scale-95 flex items-center justify-center gap-2"
                          >
                            {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                            <span>Тіркелу Сұранысын Жіберу (Тегін)</span>
                          </button>
                        </form>
                      ) : (
                        <form onSubmit={handleVerifySms} className="w-full mt-6 space-y-4 max-w-sm">
                          <div className="bg-emerald-500/10 border border-emerald-400/20 p-4 rounded-2xl text-center">
                            <p className="text-xs text-emerald-200">Сіздің телефоныңызға растау коды сәтті жіберілді:</p>
                            <p className="text-sm font-bold text-white mt-1">{phoneInput}</p>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-indigo-200 uppercase mb-1 text-center">Растау Кодын (SMS код) Енгізіңіз</label>
                            <input 
                              type="text"
                              required
                              maxLength={6}
                              placeholder="Кодты теріңіз"
                              value={smsCodeInput}
                              onChange={(e) => setSmsCodeInput(e.target.value)}
                              className="w-full text-center bg-white text-slate-950 font-mono tracking-widest text-lg font-bold p-3 rounded-xl border border-white/20 outline-none"
                            />
                          </div>

                          <div className="flex gap-2">
                            <button 
                              type="button" 
                              onClick={() => { setIsSmsSent(false); }}
                              className="w-2/5 py-3 bg-white/10 hover:bg-white/20 text-white font-bold text-xs rounded-xl"
                            >
                              Қайтадан Өңдеу
                            </button>
                            <button 
                              type="submit" 
                              disabled={authLoading}
                              className="w-3/5 py-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-500 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl flex items-center justify-center gap-2"
                            >
                              {authLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                              <span>Кодты Растау</span>
                            </button>
                          </div>
                        </form>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}


            {/* SCREEN 2: AI PRESENTATION GENERATOR MODULE */}
            {activeTab === 'presentation' && (
              <div id="presentation-tab" className="space-y-6 animate-fadeIn">
                <header className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <button 
                    onClick={() => { setActiveTab('dashboard'); }} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950">AI Презентация Генераторы</h1>
                    <p className="text-slate-500 text-xs">Тақырып бойынша интерактивті слайд және мұғалім тезистерін құрастыру</p>
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Left Parameter Panel Card */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4 self-start">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Параметрлерді Реттеу</h2>
                    
                    <form onSubmit={handleGeneratePresentation} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Пәнді таңдаңыз</label>
                        <select 
                          value={presSubject}
                          onChange={(e) => setPresSubject(e.target.value)}
                          className="w-full text-slate-800 p-2.5 rounded-xl border border-slate-200 bg-white shadow-2xs text-xs font-semibold focus:outline-none focus:border-indigo-500 transition-colors"
                        >
                          <option value="Информатика">Информатика</option>
                          <option value="Математика">Математика</option>
                          <option value="Физика">Физика</option>
                          <option value="Биология">Биология</option>
                          <option value="Тарих">Тарих</option>
                          <option value="Басқа Пән">Басқа Пән</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Сабақ тақырыбы</label>
                        <input 
                          type="text" 
                          required
                          value={presTopic}
                          onChange={(e) => setPresTopic(e.target.value)}
                          placeholder="Мысалы: Жарық жылдамдығы мен оптика заңдары"
                          className="w-full p-2.5 text-slate-800 rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-xs font-medium focus:outline-none focus:border-indigo-500 transition-colors shadow-2xs"
                        />
                      </div>

                      {/* Presets suggestions */}
                      <div className="bg-slate-100 p-3 rounded-2xl">
                        <p className="text-[10px] font-bold text-indigo-700 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Танымал ұсыныстар
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {(subjectPresets[presSubject] || subjectPresets['Информатика']).map((topic, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => fillPresetTopic(topic, 'presentation')}
                              className="text-[11px] text-slate-700 bg-white hover:bg-indigo-50 border border-slate-200 p-1.5 rounded-lg text-left truncate transition-colors font-medium cursor-pointer"
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Сынып / Деңгей</label>
                          <select 
                            value={presGrade}
                            onChange={(e) => setPresGrade(e.target.value)}
                            className="w-full text-slate-800 p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value="5-сынып">5-сынып</option>
                            <option value="7-сынып">7-сынып</option>
                            <option value="9-сынып">9-сынып</option>
                            <option value="11-сынып">11-сынып</option>
                            <option value="Студенттер">Студенттер</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Слайдтар саны</label>
                          <select 
                            value={presSlideCount}
                            onChange={(e) => setPresSlideCount(Number(e.target.value))}
                            className="w-full text-slate-800 p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value={4}>4 слайд</option>
                            <option value={6}>6 слайд</option>
                            <option value={8}>8 слайд</option>
                            <option value={10}>10 слайд</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={generatingPresentation}
                        className="w-full mt-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-300 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-transform transform active:scale-95"
                      >
                        {generatingPresentation ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 text-amber-300 animate-pulse" />}
                        <span>{generatingPresentation ? 'Дайындалуда...' : 'Сабақты Әзірлеу ⚡'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Right Presentation Draft Output Viewport */}
                  <div className="lg:col-span-2 space-y-6">
                    {generatingPresentation && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
                        <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mb-4" />
                        <h3 className="font-extrabold text-slate-900 text-lg">AI Презентация әзірлеуде...</h3>
                        <p className="text-slate-500 text-sm max-w-sm mt-1 mb-4">Жасанды интеллект тақырып негізінде ең озық оқу тезистері мен мұғалім жазбаларын қазақ тілінде құрылымдап жатыр.</p>
                        
                        {/* Interactive dynamic quotation indicators */}
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl max-w-md w-full animate-pulse">
                          <p className="text-xs text-indigo-700 font-bold uppercase tracking-wider">Педагогикалық сүзгіден өтуде:</p>
                          <p className="text-xs text-slate-700 mt-1 italic font-medium">"{generatingQuote}"</p>
                        </div>
                      </div>
                    )}

                    {!generatingPresentation && !generatedPresentation && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                          <Presentation className="w-8 h-8 text-indigo-400" />
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-lg">Презентация макеті бос</h3>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-sm">
                          Сол жақтағы реттеу панелі арқылы тақырыпты енгізіңіз немесе танымал ұсыныстардың бірін басып "Әзірлеу" тетігін басыңыз.
                        </p>
                      </div>
                    )}

                    {/* Rich Interactive Slides Output Panel */}
                    {!generatingPresentation && generatedPresentation && (
                      <div className="space-y-6 animate-fadeIn">
                        
                        {/* Control actions header */}
                        <div className="bg-white p-4 rounded-2.5xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between shadow-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Жасалған Сабақ Презентациясы:</p>
                            <h3 className="text-sm font-bold text-slate-800 truncate max-w-xs">{generatedPresentation.title}</h3>
                          </div>
                          
                          <div className="flex gap-2 flex-wrap">
                            <button 
                              onClick={() => handleExportPresentation('pptx')}
                              className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transform active:scale-95 transition-all shadow-3xs"
                            >
                              <Download className="w-3.5 h-3.5" /> <span>PPTX Экспорт</span>
                            </button>
                            <button 
                              onClick={() => handleExportPresentation('pdf')}
                              className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transform active:scale-95 transition-all shadow-3xs"
                            >
                              <Download className="w-3.5 h-3.5" /> <span>PDF баспа</span>
                            </button>
                            
                            {currentUser && (
                              <button 
                                onClick={() => handleSaveMaterial('presentation', generatedPresentation.title, generatedPresentation.subject, generatedPresentation)}
                                disabled={saveLoading}
                                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow-3xs"
                                title="Жеке кабинетке сақтайды"
                              >
                                {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                                <span>Кабинетке Сақтау</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive Slide Canvas Emulator */}
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden flex flex-col md:flex-row min-h-[380px]">
                          
                          {/* Slides outline sidebar checklist */}
                          <div className="w-full md:w-56 bg-slate-50 p-4 border-b md:border-b-0 md:border-r border-slate-200/80 flex flex-row md:flex-col gap-1.5 overflow-x-auto md:overflow-y-auto">
                            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest hidden md:block px-2 mb-2">Слайдтар жинағы</p>
                            {generatedPresentation.slides.map((slide, idx) => (
                              <button
                                key={idx}
                                onClick={() => setActiveSlideIndex(idx)}
                                className={`flex-shrink-0 flex items-center gap-2.5 px-3 py-2 rounded-xl text-left text-xs font-bold transition-all ${activeSlideIndex === idx ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-600 hover:bg-slate-100'}`}
                              >
                                <span className={`w-5 h-5 rounded-md flex items-center justify-center text-[10px] ${activeSlideIndex === idx ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'}`}>{idx + 1}</span>
                                <span className="truncate max-w-[110px]">{slide.title}</span>
                              </button>
                            ))}
                          </div>

                          {/* Active emulated slide slide preview space */}
                          <div className="flex-1 p-6 sm:p-8 flex flex-col justify-between bg-gradient-to-br from-white to-slate-50 relative">
                            
                            <div className="space-y-4">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] bg-slate-100 border border-slate-200 text-slate-500 font-extrabold px-2.5 py-0.5 rounded-full uppercase">
                                  Макет: {generatedPresentation.slides[activeSlideIndex]?.layout || 'content'}
                                </span>
                                <span className="text-xs text-slate-400 font-bold">Слайд {activeSlideIndex + 1} / {generatedPresentation.slides.length}</span>
                              </div>

                              <div className="space-y-3">
                                <h2 className="text-xl sm:text-2xl font-black text-slate-900 border-l-4 border-indigo-600 pl-3 leading-tight">
                                  {generatedPresentation.slides[activeSlideIndex]?.title}
                                </h2>
                                
                                <ul className="space-y-2 pt-2.5">
                                  {generatedPresentation.slides[activeSlideIndex]?.content.map((bullet, bIdx) => (
                                    <li key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm text-slate-700 font-medium">
                                      <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0 mt-2"></span>
                                      <span>{bullet}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>

                            {/* Speaker notes expander at the bottom footer representing real voice text overview */}
                            <div className="mt-8 bg-amber-50/70 border border-amber-200/60 p-4 rounded-2xl">
                              <p className="text-[10px] font-bold text-amber-800 uppercase tracking-widest flex items-center gap-1.5">
                                <Award className="w-3.5 h-3.5" /> <span>Мұғалімнің түсіндірмелері мен сөйлеу тезисі:</span>
                              </p>
                              <p className="text-xs text-slate-800 mt-1.5 leading-relaxed italic">
                                "{generatedPresentation.slides[activeSlideIndex]?.speakerNotes}"
                              </p>
                            </div>
                          </div>
                        </div>

                        {/* Interactive simulation info panel */}
                        <div className="bg-indigo-50 text-indigo-900 rounded-2xl p-4 border border-indigo-100 flex items-start gap-3">
                          <Info className="w-5 h-5 shrink-0 mt-0.5" />
                          <div className="text-xs">
                            <span className="font-extrabold">Ustai.kz Жүктеу Нұсқаулығы: </span>
                            Презентацияны Сақтап экспорттау арқылы сіз оны PowerPoint және Google Slides сияқты бағдарламаларда тікелей тұтас импорттайға жарамды таза мәтіндік нұсқасын аласыз. Оны өз стиліңізде өңдеп сыныпта жариялаңыз!
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* SCREEN 3: AI TEST GENERATOR MODULE */}
            {activeTab === 'test' && (
              <div id="test-tab" className="space-y-6 animate-fadeIn">
                <header className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <button 
                    onClick={() => { setActiveTab('dashboard'); }} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950">AI Тест Генераторы</h1>
                    <p className="text-slate-500 text-xs">Бақылау жұмысы мен үй тапсырмасына арналған тест жинағын лезде құру</p>
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Test Form options */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4 self-start">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Тест Шарттары</h2>

                    <form onSubmit={handleGenerateTest} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Пәні</label>
                        <select 
                          value={testSubject}
                          onChange={(e) => setTestSubject(e.target.value)}
                          className="w-full text-slate-800 p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                        >
                          <option value="Информатика">Информатика</option>
                          <option value="Математика">Математика</option>
                          <option value="Физика">Физика</option>
                          <option value="Биология">Биология</option>
                          <option value="Тарих">Тарих</option>
                          <option value="Басқа Пән">Басқа Пән</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Тест Тақырыбы</label>
                        <input 
                          type="text" 
                          required
                          value={testTopic}
                          onChange={(e) => setTestTopic(e.target.value)}
                          placeholder="Мысалы: Көне Сақ тайпаларының мәдениеті"
                          className="w-full p-2.5 text-slate-800 rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-xs font-medium"
                        />
                      </div>

                      {/* Presets suggestions */}
                      <div className="bg-slate-100 p-3 rounded-2xl">
                        <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Sparkles className="w-3 h-3" /> Оқу тақырыптары
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {(subjectPresets[testSubject] || subjectPresets['Информатика']).map((topic, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => fillPresetTopic(topic, 'test')}
                              className="text-[11px] text-slate-700 bg-white hover:bg-emerald-50 border border-slate-200 p-1.5 rounded-lg text-left truncate transition-colors font-medium cursor-pointer"
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Сұрақтар саны</label>
                          <select 
                            value={testCount}
                            onChange={(e) => setTestCount(Number(e.target.value))}
                            className="w-full text-slate-800 p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value={3}>3 сұрақ</option>
                            <option value={5}>5 сұрақ</option>
                            <option value={8}>8 сұрақ</option>
                            <option value={12}>12 сұрақ</option>
                          </select>
                        </div>

                        <div>
                          <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Күрделілік деңгейі</label>
                          <select 
                            value={testDifficulty}
                            onChange={(e) => setTestDifficulty(e.target.value as any)}
                            className="w-full text-slate-800 p-2 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                          >
                            <option value="easy">Оңай</option>
                            <option value="medium">Орташа</option>
                            <option value="hard">Қиын (Күрделі)</option>
                          </select>
                        </div>
                      </div>

                      <button
                        type="submit"
                        disabled={generatingTest}
                        className="w-full mt-2 bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-transform transform active:scale-95"
                      >
                        {generatingTest ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4 text-white" />}
                        <span>{generatingTest ? 'Тест дайындалуда...' : 'Тест жасау (AI) ⚡'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Test Viewport Output on Right */}
                  <div className="lg:col-span-2 space-y-6">
                    {generatingTest && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
                        <RefreshCw className="w-12 h-12 text-emerald-600 animate-spin mb-4" />
                        <h3 className="font-extrabold text-slate-900 text-lg">Жасанды интеллект тест құруда...</h3>
                        <p className="text-slate-500 text-sm max-w-sm mt-1 mb-4">Тақырыпқа және оқу стандартына сай кешенді сұрақтар мен толық түсіндірмелері бар дұрыс жауаптар белгіленуде.</p>
                        
                        <div className="bg-slate-50 border border-slate-200 p-3 rounded-2xl max-w-md w-full animate-pulse">
                          <p className="text-xs text-emerald-800 font-bold uppercase tracking-wider">АКТ сәйкестігі:</p>
                          <p className="text-xs text-slate-700 mt-1 italic font-medium">"{generatingQuote}"</p>
                        </div>
                      </div>
                    )}

                    {!generatingTest && !generatedTest && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                          <FileText className="w-8 h-8 text-emerald-400" />
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-lg">Тест сұрақтары бос</h3>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-sm">
                          Сұрақтар жинағын құру үшін шарттарды толтырып, "Тест жасау" батырмасын басыңыз.
                        </p>
                      </div>
                    )}

                    {/* Test interactive questions dashboard */}
                    {!generatingTest && generatedTest && (
                      <div className="space-y-6 animate-fadeIn">
                        
                        {/* Saved action headers */}
                        <div className="bg-white p-4 rounded-2.5xl border border-slate-200 flex flex-wrap gap-3 items-center justify-between shadow-xs">
                          <div>
                            <p className="text-[10px] font-bold text-slate-400 uppercase">Дайын Тест Сұрақтары Жиынтығы:</p>
                            <h3 className="text-sm font-bold text-slate-800 truncate max-w-sm">{generatedTest.title}</h3>
                          </div>

                          <div className="flex gap-2">
                            <button 
                              onClick={handleExportTest}
                              className="py-1.5 px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-xs rounded-xl flex items-center gap-1.5 transform active:scale-95 transition-all shadow-3xs"
                            >
                              <Download className="w-3.5 h-3.5" /> <span>Экспорттау (.txt)</span>
                            </button>
                            
                            {currentUser && (
                              <button 
                                onClick={() => handleSaveMaterial('test', generatedTest.title, generatedTest.subject, generatedTest)}
                                disabled={saveLoading}
                                className="py-1.5 px-3 bg-amber-500 hover:bg-amber-600 disabled:bg-slate-300 text-slate-950 font-bold text-xs rounded-xl flex items-center gap-1 shadow-3xs"
                              >
                                {saveLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <BookOpen className="w-3.5 h-3.5" />}
                                <span>Кабинетке Сақтау</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Interactive testing simulator */}
                        <div className="space-y-4">
                          <div className="flex justify-between items-center bg-emerald-50 text-emerald-900 px-4 py-3 rounded-2xl border border-emerald-100 text-xs">
                            <div className="flex items-center gap-1.5">
                              <Info className="w-4 h-4 text-emerald-700" />
                              <span><strong>Мұғалім тексерісі:</strong> Төмендегі тестті өзіңіз шешіп көріңіз. Опцияны басу арқылы дұрыс/бұрыстығын тексере аласыз.</span>
                            </div>
                          </div>

                          {generatedTest.questions.map((q, idx) => {
                            const userAnswers = userSelectedTestAnswers[idx] || [];
                            const isAnswered = userAnswers.length > 0;
                            
                            return (
                              <div key={idx} className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4 relative overflow-hidden">
                                
                                <div className="flex items-start justify-between gap-3">
                                  <div className="flex items-start gap-2.5">
                                    <span className="w-6 h-6 rounded-lg bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0 mt-0.5">
                                      {idx + 1}
                                    </span>
                                    <div>
                                      <h3 className="font-bold text-slate-950 text-sm sm:text-base leading-snug">{q.questionText}</h3>
                                      <span className={`inline-block mt-1 text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-tight ${
                                        q.type === 'multiple' ? 'bg-indigo-100 text-indigo-800 border border-indigo-200' : 'bg-slate-100 text-slate-600 border border-slate-200'
                                      }`}>
                                        {q.type === 'multiple' ? 'Бірнеше дұрыс жауап' : 'Жалғыз дұрыс жауап'}
                                      </span>
                                    </div>
                                  </div>
                                </div>

                                {/* Option list */}
                                <div className="grid grid-cols-1 gap-2">
                                  {q.options.map((opt, oIdx) => {
                                    const isSelected = userAnswers.includes(oIdx);
                                    const isCorrect = q.correctAnswers.includes(oIdx);
                                    
                                    // Visual color classes for correction mode
                                    let btnStyle = "border-slate-200 text-slate-800 hover:bg-slate-50";
                                    let prefix = "bg-slate-100 text-slate-700";
                                    
                                    if (isAnswered) {
                                      if (isCorrect) {
                                        btnStyle = "bg-emerald-50 border-emerald-300 text-emerald-900";
                                        prefix = "bg-emerald-600 text-white font-bold";
                                      } else if (isSelected && !isCorrect) {
                                        btnStyle = "bg-red-50 border-red-300 text-red-900";
                                        prefix = "bg-red-600 text-white font-bold";
                                      }
                                    } else if (isSelected) {
                                      btnStyle = "bg-indigo-50 border-indigo-300 text-indigo-900";
                                      prefix = "bg-indigo-600 text-white";
                                    }

                                    return (
                                      <button
                                        key={oIdx}
                                        onClick={() => toggleTestAnswerSelection(idx, oIdx, q.type)}
                                        className={`w-full p-3 border rounded-xl text-left text-xs transition-all flex items-center gap-3 relative ${btnStyle}`}
                                      >
                                        <span className={`w-6 h-6 rounded-md flex items-center justify-center font-bold text-xs shrink-0 ${prefix}`}>
                                          {String.fromCharCode(65 + oIdx)}
                                        </span>
                                        <span className="font-semibold">{opt}</span>
                                        
                                        {isAnswered && isCorrect && (
                                          <Check className="w-4.5 h-4.5 text-emerald-600 absolute right-4" />
                                        )}
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Demonstration feedback block detailing the actual answer and scientific reason of selected choice */}
                                {isAnswered && (
                                  <div className="bg-slate-50 border border-slate-200 p-4 rounded-2xl text-xs space-y-1 animate-fadeIn">
                                    <p className="font-extrabold text-slate-800 flex items-center gap-1.5">
                                      <Info className="w-3.5 h-3.5 text-indigo-600 animate-pulse" /> 
                                      <span>Ғылыми тұжырым мен түсіндірме:</span>
                                    </p>
                                    <p className="text-slate-600 leading-relaxed italic">"{q.explanation}"</p>
                                    <div className="pt-2 text-[10px] text-slate-400 font-bold">
                                      Дұрыс жауаптың индекстері: {q.correctAnswers.map(c => String.fromCharCode(65 + c)).join(', ')}
                                    </div>
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* SCREEN 4: AI QUIZ GENERATOR & LIVE KHOOT-STYLE PLAYER GAMEPLAY */}
            {activeTab === 'quiz' && (
              <div id="quiz-tab" className="space-y-6 animate-fadeIn">
                <header className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <button 
                    onClick={() => { setActiveTab('dashboard'); }} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950">AI Викторина Генераторы</h1>
                    <p className="text-slate-500 text-xs">Сынып арасында Kahoot/Quizizz стиліндегі белсенді викторина ойынын ойнату</p>
                  </div>
                </header>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Test Form options */}
                  <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-xs flex flex-col gap-4 self-start">
                    <h2 className="font-bold text-slate-800 text-sm uppercase tracking-wider">Викторина Реттеулері</h2>

                    <form onSubmit={handleGenerateQuiz} className="space-y-4">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Викторина тақырыбы</label>
                        <input 
                          type="text" 
                          required
                          value={quizTopic}
                          onChange={(e) => setQuizTopic(e.target.value)}
                          placeholder="Мысалы: Химиялық элементтер мен заңдылықтар"
                          className="w-full p-2.5 text-slate-800 rounded-xl border border-slate-200 bg-white placeholder-slate-400 text-xs font-medium focus:outline-none"
                        />
                      </div>

                      {/* Presets Suggestions */}
                      <div className="bg-slate-100 p-3 rounded-2xl">
                        <p className="text-[10px] font-bold text-orange-800 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                          <Award className="w-3.5 h-3.5" /> Қызықты тақырыптар
                        </p>
                        <div className="flex flex-col gap-1.5">
                          {['Қазақ хандарының хронологиясы', 'Әлемнің жеті кереметі', 'Күн жүйесі және ғарыш'].map((topic, i) => (
                            <button
                              key={i}
                              type="button"
                              onClick={() => fillPresetTopic(topic, 'quiz')}
                              className="text-[11px] text-slate-700 bg-white hover:bg-orange-50 border border-slate-200 p-1.5 rounded-lg text-left truncate transition-colors font-medium cursor-pointer"
                            >
                              {topic}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase mb-1">Сұрақтар саны</label>
                        <select 
                          value={quizCount}
                          onChange={(e) => setQuizCount(Number(e.target.value))}
                          className="w-full text-slate-800 p-2.5 rounded-xl border border-slate-200 bg-white text-xs font-semibold"
                        >
                          <option value={3}>3 сұрақ</option>
                          <option value={5}>5 сұрақ (Ұсынылады)</option>
                          <option value={8}>8 сұрақ</option>
                        </select>
                      </div>

                      <button
                        type="submit"
                        disabled={generatingQuiz}
                        className="w-full mt-2 bg-orange-600 hover:bg-orange-700 disabled:bg-slate-300 text-white font-extrabold text-xs py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-xs transition-transform transform active:scale-95"
                      >
                        {generatingQuiz ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 text-white" />}
                        <span>{generatingQuiz ? 'Викторина дайындалуда...' : 'Ойынды Әзірлеу ⚡'}</span>
                      </button>
                    </form>
                  </div>

                  {/* Quiz Simulator Panel */}
                  <div className="lg:col-span-2 space-y-6">
                    {generatingQuiz && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
                        <RefreshCw className="w-12 h-12 text-orange-600 animate-spin mb-4" />
                        <h3 className="font-extrabold text-slate-900 text-lg">Ойын сұрақтары әзірленуде...</h3>
                        <p className="text-slate-500 text-sm max-w-sm mt-1 mb-4">Жылдамдыққа негізделген логикалық сұрақтар мен ұпайлық макеттер реттелуде.</p>
                      </div>
                    )}

                    {!generatingQuiz && !generatedQuiz && (
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px]">
                        <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mb-4">
                          <Award className="w-8 h-8 text-orange-400" />
                        </div>
                        <h3 className="font-extrabold text-slate-800 text-lg">Викторина Сұрақтары Дайын Емес</h3>
                        <p className="text-slate-400 text-xs sm:text-sm mt-1 max-w-md">
                          Викторина тақырыбын оң жақтан реттеп бастаңыз және сыныпта тікелей интерактивті ойнатыңыз!
                        </p>
                      </div>
                    )}

                    {/* QUIZ ACTIVE VIEWPORT */}
                    {!generatingQuiz && generatedQuiz && (
                      <div className="space-y-6">
                        {/* Quiz controls status or game trigger */}
                        {!quizGameActive ? (
                          <div className="bg-white rounded-3xl border border-slate-200 p-8 text-center shadow-xs flex flex-col items-center justify-center min-h-[350px] space-y-4">
                            <div className="w-16 h-16 bg-orange-100 text-orange-600 rounded-full flex items-center justify-center">
                              <Award className="w-10 h-10" />
                            </div>
                            
                            <div className="space-y-1">
                              <span className="text-[10px] bg-orange-100 text-orange-850 px-2.5 py-0.5 rounded-full font-bold uppercase tracking-widest border border-orange-200">
                                Ойын дайын
                              </span>
                              <h3 className="font-black text-slate-900 text-xl">{generatedQuiz.title}</h3>
                              <p className="text-slate-500 text-xs sm:text-sm max-w-md mx-auto">
                                Бұл — сыныптағы интерактивті зияткерлік сайыс. Оқушылармен бірінші сабақты бекіту немесе бағалау ретінде ойнатыңыз.
                              </p>
                            </div>

                            <div className="flex gap-3 justify-center">
                              <button
                                onClick={startInteractiveQuizGame}
                                className="py-2.5 px-6 bg-orange-600 hover:bg-orange-700 text-white font-extrabold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 transform hover:scale-105"
                              >
                                <Play className="w-4 h-4 fill-white" />
                                <span>Сыныпта Ойнату 🎮</span>
                              </button>
                              
                              {currentUser && (
                                <button
                                  onClick={() => handleSaveMaterial('quiz', generatedQuiz.title, 'Тәрбие және ойын', generatedQuiz)}
                                  disabled={saveLoading}
                                  className="py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-800 font-extrabold text-sm rounded-xl border border-slate-300 transition-all flex items-center gap-2"
                                >
                                  {saveLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <BookOpen className="w-4 h-4" />}
                                  <span>Кабинетке Сақтау</span>
                                </button>
                              )}
                            </div>
                          </div>
                        ) : (
                          /* THE ACTIVE INTERACTIVE KAHOOT GAME SIMULATOR */
                          <div className="bg-slate-900 text-white rounded-3xl border border-slate-800 overflow-hidden shadow-2xl flex flex-col min-h-[420px] relative">
                            
                            {/* Quiz finished congratulations screen */}
                            {quizFinished ? (
                              <div className="flex-1 p-8 text-center flex flex-col items-center justify-center space-y-4 animate-scaleUp">
                                <span className="text-5xl">🏆</span>
                                <h3 className="text-2xl font-black text-orange-400">Викторина Ойыны Аяқталды!</h3>
                                <p className="text-slate-300 text-sm max-w-md">Оқу процесіндегі үздік нәтижені бекітіңіз. Оқушылар сұрақтар бойынша өте белсенді қатысты!</p>
                                
                                <div className="bg-slate-800/80 px-6 py-4 rounded-2xl border border-slate-700/80 text-center">
                                  <p className="text-xs text-slate-400 uppercase tracking-widest font-bold">Ойыншының Жалпы Ұпайы</p>
                                  <p className="text-3xl font-extrabold text-amber-400 mt-1">{quizScore} / {generatedQuiz.questions.reduce((a, b) => a + b.points, 0)} Ұпай</p>
                                </div>
                                
                                <div className="flex gap-2">
                                  <button
                                    onClick={() => { setQuizGameActive(false); }}
                                    className="py-2 px-4 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-white text-xs font-bold rounded-xl transition-colors"
                                  >
                                    Артқа қайту
                                  </button>
                                  <button
                                    onClick={startInteractiveQuizGame}
                                    className="py-2 px-4 bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold rounded-xl transition-all shadow-md"
                                  >
                                    Қайта ойнау
                                  </button>
                                </div>
                              </div>
                            ) : (
                              /* Live game screen content representing currently ongoing question index */
                              <div className="p-4 sm:p-6 flex-1 flex flex-col justify-between">
                                
                                {/* Game Status Header */}
                                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                                  <div className="flex items-center gap-2">
                                    <span className="bg-orange-600 text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-tight animate-pulse">ОЙЫН LIVE</span>
                                    <span className="text-slate-400 text-xs font-semibold">Сұрақ {quizCurrentIndex + 1} / {generatedQuiz.questions.length}</span>
                                  </div>
                                  
                                  {/* Cumulative score block */}
                                  <div className="text-right">
                                    <span className="text-xs text-slate-400">Ұпай: </span>
                                    <span className="text-sm font-extrabold text-amber-400">{quizScore}</span>
                                  </div>
                                </div>

                                {/* Timer & Countdown progress meter */}
                                <div className="mt-4 flex items-center gap-3">
                                  <div className="w-10 h-10 rounded-full border-2 border-orange-500 flex items-center justify-center text-orange-500 font-extrabold text-xs animate-pulse">
                                    {quizTimeLeft}с
                                  </div>
                                  <div className="flex-1 bg-slate-800 h-2.5 rounded-full overflow-hidden">
                                    <div className="bg-orange-600 h-2.5 rounded-full transition-all duration-1000" style={{ width: `${(quizTimeLeft / 20) * 100}%` }}></div>
                                  </div>
                                </div>

                                {/* Active Question sentence centered with stylized huge letters */}
                                <div className="my-6 text-center space-y-2">
                                  <p className="text-slate-400 font-bold uppercase tracking-wider text-[10px]">Келесі Сұрақ белгіленді:</p>
                                  <h2 className="text-lg sm:text-xl font-black text-slate-100 leading-snug px-2">
                                    {generatedQuiz.questions[quizCurrentIndex]?.question}
                                  </h2>
                                </div>

                                {/* Feedback notification logic depending on choice selected */}
                                {quizShowFeedback ? (
                                  <div className="my-4 p-4 rounded-2xl text-center bg-slate-800 border border-slate-700 animate-fadeIn">
                                    {quizSelectedOption === generatedQuiz.questions[quizCurrentIndex].correctIndex ? (
                                      <div className="space-y-1">
                                        <p className="text-emerald-400 font-black text-lg flex items-center justify-center gap-1">🎉 Өте керемет! Дұрыс жауап</p>
                                        <p className="text-xs text-emerald-200">+10 Ұпай ұтып алдыңыз!</p>
                                      </div>
                                    ) : (
                                      <div className="space-y-1">
                                        <p className="text-red-400 font-black text-lg flex items-center justify-center gap-1">❌ Қате басылды</p>
                                        <p className="text-xs text-slate-300">Дұрыс жауап: {generatedQuiz.questions[quizCurrentIndex].options[generatedQuiz.questions[quizCurrentIndex].correctIndex]}</p>
                                      </div>
                                    )}
                                    <div className="mt-3 text-xs text-slate-400 max-w-md mx-auto italic">
                                      Түсіндірме: "{generatedQuiz.questions[quizCurrentIndex].explanation}"
                                    </div>
                                    <div className="pt-2 text-[10px] text-amber-500 animate-pulse">Келесі сұрақ ашылуда, күтіңіз...</div>
                                  </div>
                                ) : (
                                  /* Colorful Kahoot 4 option buttons block */
                                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                                    {generatedQuiz.questions[quizCurrentIndex]?.options.map((option, oIdx) => {
                                      // Colors representing Kahoot board options (Red, Blue, Orange, Green)
                                      const colors = [
                                        'bg-rose-600 hover:bg-rose-500 border-rose-700 text-rose-50',
                                        'bg-blue-600 hover:bg-blue-500 border-blue-700 text-blue-50',
                                        'bg-amber-600 hover:bg-amber-500 border-amber-700 text-amber-50',
                                        'bg-emerald-600 hover:bg-emerald-500 border-emerald-700 text-emerald-50'
                                      ];
                                      
                                      const icons = ['▲', '◆', '●', '■'];

                                      return (
                                        <button
                                          key={oIdx}
                                          onClick={() => handleQuizAnswer(oIdx)}
                                          className={`py-3 px-4 border rounded-xl font-bold text-xs sm:text-sm text-left transition-all shrink-0 shadow-sm flex items-center gap-3 ${colors[oIdx % 4]}`}
                                        >
                                          <span className="text-base sm:text-lg font-black">{icons[oIdx % 4]}</span>
                                          <span className="truncate max-w-[280px]">{option}</span>
                                        </button>
                                      );
                                    })}
                                  </div>
                                )}

                              </div>
                            )}

                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}


            {/* SCREEN 5: USER CABINET & ARCHIVED MATERIALS DISPLAY & INLINE EDITOR */}
            {activeTab === 'cabinet' && (
              <div id="cabinet-tab" className="space-y-6 animate-fadeIn">
                <header className="flex items-center gap-3 pb-4 border-b border-slate-200">
                  <button 
                    onClick={() => { setActiveTab('dashboard'); }} 
                    className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-600 transition-colors"
                  >
                    <ArrowLeft className="w-5 h-5" />
                  </button>
                  <div>
                    <h1 className="text-xl sm:text-2xl font-black text-slate-950">Мұғалімнің Жеке Кабинеті</h1>
                    <p className="text-slate-500 text-xs">Жасалған барлық сабақ материалдарының ортақ қоры</p>
                  </div>
                </header>

                {/* Edit inline modal card */}
                {editingMaterialId && (
                  <div className="bg-slate-100 p-6 rounded-3xl border border-slate-300 shadow-md space-y-4">
                    <p className="text-xs font-bold text-indigo-700 uppercase">Редактор режимі: Оқу материалын жаңарту</p>
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Материал Атауы (Тақырыбы)</label>
                        <input 
                          type="text"
                          value={editingTitle}
                          onChange={(e) => setEditingTitle(e.target.value)}
                          className="w-full bg-white p-2 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-bold text-slate-600 mb-1">Пән атауы</label>
                        <input 
                          type="text"
                          value={editingSubject}
                          onChange={(e) => setEditingSubject(e.target.value)}
                          className="w-full bg-white p-2 border border-slate-300 rounded-lg text-sm text-slate-800 outline-none"
                        />
                      </div>
                    </div>

                    <div className="flex gap-2 justify-end">
                      <button 
                        onClick={() => { setEditingMaterialId(null); }}
                        className="py-1.5 px-3 bg-white text-slate-700 text-xs font-bold rounded-lg border border-slate-200"
                      >
                        Бас тарту
                      </button>
                      <button 
                        onClick={async () => {
                          if (!editingTitle.trim()) return;
                          try {
                            const res = await api.updateMaterial(editingMaterialId, {
                              title: editingTitle.trim(),
                              subject: editingSubject.trim(),
                              data: {}
                            });
                            if (res.success) {
                              showToast('Сабақ материалы сәтті жаңартылды!', 'success');
                              setEditingMaterialId(null);
                              loadUserMaterials();
                            }
                          } catch (err: any) {
                            showToast(err.message, 'error');
                          }
                        }}
                        className="py-1.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg"
                      >
                        Сақтау
                      </button>
                    </div>
                  </div>
                )}

                {loadingMaterials ? (
                  <div className="text-center py-12">
                    <RefreshCw className="w-12 h-12 text-indigo-600 animate-spin mx-auto mb-4" />
                    <p className="text-sm text-slate-500 font-bold">Архив жүктелуде, күтіңіз...</p>
                  </div>
                ) : savedMaterials.length === 0 ? (
                  <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-xs">
                    <div className="w-16 h-16 bg-slate-100 rounded-full flex items-center justify-center text-slate-400 mx-auto mb-4">
                      <Folder className="w-8 h-8" />
                    </div>
                    <h3 className="font-extrabold text-slate-800 text-lg">Сенің архивің бос</h3>
                    <p className="text-slate-500 text-xs sm:text-sm mt-1 max-w-sm mx-auto">
                      Жасанды интеллект көмегімен презентациялар мен бақылау тесттерін жасап, "Кабинетке сақтау" нұсқасын басыңыз.
                    </p>
                    <button 
                      onClick={() => { setActiveTab('dashboard'); }}
                      className="mt-6 py-2 px-5 bg-indigo-600 text-white font-bold text-xs rounded-xl"
                    >
                      Жаңа Навигация
                    </button>
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {savedMaterials.map((material) => (
                      <div 
                        key={material.id} 
                        className="bg-white rounded-3xl border border-slate-200/80 p-6 shadow-xs flex flex-col justify-between hover:border-indigo-300 transition-all cursor-pointer"
                        onClick={() => handleOpenMaterial(material)}
                      >
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-extrabold uppercase tracking-tight ${
                              material.type === 'presentation' ? 'bg-amber-105 text-amber-800 border border-amber-200' :
                              material.type === 'test' ? 'bg-emerald-105 text-emerald-800 border border-emerald-200' : 'bg-orange-105 text-orange-850 border border-orange-200'
                            }`}>
                              {material.type === 'presentation' ? 'Презентация' :
                               material.type === 'test' ? 'Тест сұрақтары' : 'Викторина'}
                            </span>
                            <span className="text-[10px] text-slate-400 font-bold">{new Date(material.createdAt).toLocaleDateString('kk-KZ')}</span>
                          </div>

                          <h3 className="font-extrabold text-slate-900 text-sm sm:text-base leading-tight pr-4 hover:text-indigo-600 transition-colors">
                            {material.title}
                          </h3>
                          
                          <p className="text-xs text-slate-500 font-semibold flex items-center gap-1.5">
                            <Book className="w-3.5 h-3.5" /> <span>Пән: {material.subject}</span>
                          </p>
                        </div>

                        <div className="mt-6 pt-4 border-t border-slate-100 flex items-center justify-between">
                          <div className="flex gap-2">
                            <button 
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingMaterialId(material.id);
                                setEditingTitle(material.title);
                                setEditingSubject(material.subject);
                                showToast('Редактор ашылды', 'success');
                              }}
                              className="py-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-[11px] font-bold"
                            >
                              Өңдеу
                            </button>
                            <button 
                              onClick={(e) => handleDeleteMaterial(material.id, e)}
                              className="p-1 px-2 text-slate-400 hover:text-red-600 text-[11px] font-bold"
                            >
                              Жою
                            </button>
                          </div>

                          <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                            <span>Ашу</span> <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

          </div>
        </main>
      </div>
    </div>
  );
}
