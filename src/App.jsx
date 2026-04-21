import React, { useContext } from 'react'
import { BrowserRouter as Router, Navigate, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import Main from './components/Main/Main'
import Signin from './components/Auth/Signin'
import Signup from './components/Auth/Signup'
import Landing from './components/Landing/Landing'
import Contact from './components/Contact/Contact'
import LearningTips from './components/LearningTips/LearningTips'
import Progress from './components/Progress/Progress'
import { Context } from './context/Context'
import './App.css'

const Home = () => {
  const { themeMode } = useContext(Context)
  const [sidebarOpen, setSidebarOpen] = React.useState(false)

  return (
    <div className={`home-container theme-${themeMode}`}>
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <Main onOpenSidebar={() => setSidebarOpen(true)} />
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
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/signup" element={<PublicRoute><Signup /></PublicRoute>} />
          <Route path="/signin" element={<PublicRoute><Signin /></PublicRoute>} />
          <Route path="/chat" element={<ProtectedRoute><Home /></ProtectedRoute>} />
          <Route path="/learning-tips" element={<ProtectedRoute><LearningTips /></ProtectedRoute>} />
          <Route path="/progress" element={<ProtectedRoute><Progress /></ProtectedRoute>} />
        </Routes>
      </Router>
    </div>
  )
}

export default App