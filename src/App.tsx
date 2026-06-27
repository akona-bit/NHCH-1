/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Dashboard } from './pages/Dashboard';
import { SpatialMap } from './pages/SpatialMap';
import { Knowledge } from './pages/Knowledge';
import { Questions } from './pages/Questions';
import { Matrix } from './pages/Matrix';
import { Exams } from './pages/Exams';
import { Analytics } from './pages/Analytics';
import { IRTAnalysis } from './pages/IRTAnalysis';
import { Users } from './pages/Users';
import { Candidates } from './pages/Candidates';
import { Compare } from './pages/Compare';
import { QuestionEdit } from './pages/QuestionEdit';
import { QuestionReview } from './pages/QuestionReview';
import { SignIn } from './pages/SignIn';
import { SignUp } from './pages/SignUp';
import { SystemAlerts } from './pages/SystemAlerts';
import { Settings } from './pages/Settings';
import { Notifications } from './pages/Notifications';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="spatial-map" element={<SpatialMap />} />
          <Route path="knowledge" element={<Knowledge />} />
          <Route path="questions" element={<Questions />} />
          <Route path="questions/new" element={<QuestionEdit />} />
          <Route path="questions/review" element={<QuestionReview />} />
          <Route path="matrix" element={<Matrix />} />
          <Route path="exams" element={<Exams />} />
          <Route path="analytics" element={<Analytics />} />
          <Route path="irt-analysis" element={<IRTAnalysis />} />
          <Route path="users" element={<Users />} />
          <Route path="candidates" element={<Candidates />} />
          <Route path="compare" element={<Compare />} />
          <Route path="alerts" element={<SystemAlerts />} />
          <Route path="notifications" element={<Notifications />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
