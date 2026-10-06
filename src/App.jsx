import { Suspense, lazy, useContext, useState } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import Landing from './components/Landing/Landing'
import { Context } from './context/Context'
import './App.css'

// lazy so the landing page doesn't pull in mui, katex and the chat ui
const Sidebar = lazy(() => import('./components/Sidebar/Sidebar'))
const Main = lazy(() => import('./components/Main/Main'))
const Signin = lazy(() => import('./components/Auth/Signin'))
const Signup = lazy(() => import('./components/Auth/Signup'))
const Contact = lazy(() => import('./components/Contact/Contact'))
const LearningTips = lazy(() => import('./components/LearningTips/LearningTips'))
const Progress = lazy(() => import('./components/Progress/Progress'))

const Home = () => {
  const { themeMode } = useContext(Context)

  // remember the sidebar state across refreshes
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    const saved = localStorage.getItem('sm_sidebar_open')
    if (saved !== null) return saved === 'true'
    return window.innerWidth > 760 // open on desktop, closed on phones
  })

  const toggleSidebar = () => {
    setSidebarOpen(prev => {
      const next = !prev
      localStorage.setItem('sm_sidebar_open', String(next))
      return next
    })
  }

  return (
    <div className={`home-container theme-${themeMode}`}>
      <Sidebar isOpen={sidebarOpen} onClose={toggleSidebar} />
      <Main onOpenSidebar={toggleSidebar} />
    </div>
  )
};

const ProtectedRoute = ({ children }) => {
  const { currentUser, authReady } = useContext(Context)

  if (!authReady) {
    return <div className="auth-loading">Loading your workspace...</div>
  }

  if (!currentUser) {
    return <Navigate to="/signin" replace />
  }

  return children
}

const PublicRoute = ({ children }) => {
  const { currentUser, authReady } = useContext(Context)

  if (!authReady) {
    return <div className="auth-loading">Loading...</div>
  }

  if (currentUser) {
    return <Navigate to="/chat" replace />
  }

  return children
}

const App = () => {
  return (
    <div className="app">
      <Router>
        <Suspense fallback={<div className="auth-loading">Loading...</div>}>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/signin" element={<PublicRoute><Signin /></PublicRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/learning-tips" element={<ProtectedRoute><LearningTips /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        </Routes>
        </Suspense>
      </Router>
    </div>
  )
}

export default App