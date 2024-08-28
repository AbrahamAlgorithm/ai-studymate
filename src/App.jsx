import React from 'react'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Sidebar from './components/Sidebar/Sidebar'
import Main from './components/Main/Main'
import Signin from './components/Auth/Signin'
import Signup from './components/Auth/Signup'

const Home = () => (
  <>
    <Sidebar />
    <Main />
  </>
);

const App = () => {
  return (
    <Router>
      <Routes>
        {/* Set the signup page as the default route */}
        <Route path="/" element={<Signup />} />
        <Route path="/signin" element={<Signin />} />
        <Route path="/chat" element={<Home />} />
      </Routes>
    </Router>
  )
}

export default App
