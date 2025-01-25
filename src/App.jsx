import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom'
import Sidebar from './components/Sidebar/Sidebar'
import Main from './components/Main/Main'
import Signin from './components/Auth/Signin'
import Signup from './components/Auth/Signup'
import Landing from './components/Landing/Landing'
import './App.css'

const Home = () => (
  <div className="home-container">
    <Sidebar />
    <Main />
  </div>
);

const App = () => {
  return (
    <div className="app">
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/signin" element={<Signin />} />
          <Route path="/chat" element={<Home />} />
        </Routes>
      </Router>
    </div>
  )
}

export default App