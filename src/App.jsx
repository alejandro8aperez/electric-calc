import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import ScrollToTop from '@/components/ScrollToTop'
import Layout from '@/components/Layout'
import Home from '@/pages/Home'
import Calculator from '@/pages/Calculator'
import Coordination from '@/pages/Coordination'
import PageNotFound from '@/lib/PageNotFound'

function App() {
  return (
    <Router>
      <Routes>
        <Route element={<Layout />}>
          <Route path="/" element={<Home />} />
          <Route path="/calculator" element={<Calculator />} />
          <Route path="/coordination" element={<Coordination />} />
        </Route>
        <Route path="*" element={<PageNotFound />} />
      </Routes>
    </Router>
  )
}

export default App