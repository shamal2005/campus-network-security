import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Overview } from './pages/Overview';
import { NetworkMap } from './pages/NetworkMap';
import { ThreatDetection } from './pages/ThreatDetection';
import { IncidentDetails } from './pages/IncidentDetails';
import { MitigationCenter } from './pages/MitigationCenter';
import { IncidentHistory } from './pages/IncidentHistory';
import { Settings } from './pages/Settings';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout geminiActive={false} />}>
          <Route index element={<Overview />} />
          <Route path="network" element={<NetworkMap />} />
          <Route path="detection" element={<ThreatDetection />} />
          <Route path="incidents" element={<IncidentHistory />} />
          <Route path="incidents/:id" element={<IncidentDetails />} />
          <Route path="mitigation" element={<MitigationCenter />} />
          <Route path="history" element={<IncidentHistory />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;
