import React from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Header from "./components/Header";
import Dashboard from "./pages/Dashboard";
import Advertisers from "./pages/Advertisers";
import Publishers from "./pages/Publishers";
import Clicks from "./pages/Clicks";
import Conversions from "./pages/Conversions";
import Postbacks from "./pages/Postbacks";

function App() {
  return (
    <Router>
      <div className="flex min-h-screen bg-gray-100">
        <Sidebar />
        <div className="flex-1 flex flex-col">
          <Header />
          <main className="p-6 flex-1 overflow-y-auto">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/advertisers" element={<Advertisers />} />
              <Route path="/publishers" element={<Publishers />} />
              <Route path="/clicks" element={<Clicks />} />
              <Route path="/conversions" element={<Conversions />} />
              <Route path="/postbacks" element={<Postbacks />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
