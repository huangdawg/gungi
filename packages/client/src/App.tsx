import React from 'react'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { CreateRoom } from './components/Room/CreateRoom'
import { GamePage } from './components/Room/GamePage'
import { LocalGame } from './components/Room/LocalGame'
import { RulesPage } from './components/Rules/RulesPage'
import { TutorialPage } from './components/Tutorial/TutorialPage'

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<CreateRoom />} />
        <Route path="/local" element={<LocalGame />} />
        <Route path="/room/:code" element={<GamePage />} />
        <Route path="/rules" element={<RulesPage />} />
        <Route path="/tutorial" element={<TutorialPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
