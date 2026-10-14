import React from 'react'
import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import ScrollToTop from '@/components/ScrollToTop'
import Layout from '@/components/Layout'
import { I18nProvider } from '@/lib/i18n'
import Home from '@/pages/Home'
import Calculator from '@/pages/Calculator'
import Panel from '@/pages/Panel'
import Coordination from '@/pages/Coordination'
import Transformer from '@/pages/Transformer'
import Motors from '@/pages/Motors'
import PowerBalance from '@/pages/PowerBalance'
import Catalog from '@/pages/Catalog'
import Bom from '@/pages/Bom'
import Report from '@/pages/Report'
import PageNotFound from '@/lib/PageNotFound'

function App() {
  return (
    <I18nProvider>
      <Router>
        <Routes>
          <Route element={<Layout />}>
            <Route path="/" element={<Home />} />
            <Route path="/panel" element={<Panel />} />
            <Route path="/calculator" element={<Calculator />} />
            <Route path="/coordination" element={<Coordination />} />
            <Route path="/transformer" element={<Transformer />} />
            <Route path="/motors" element={<Motors />} />
            <Route path="/balance" element={<PowerBalance />} />
            <Route path="/catalog" element={<Catalog />} />
            <Route path="/bom" element={<Bom />} />
            <Route path="/report" element={<Report />} />
          </Route>
          <Route path="*" element={<PageNotFound />} />
        </Routes>
      </Router>
    </I18nProvider>
  )
}

export default App
