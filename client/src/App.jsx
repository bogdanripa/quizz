import { NavLink, Route, Routes, useLocation } from "react-router-dom";
import Home from "./routes/Home.jsx";
import Start from "./routes/Start.jsx";
import Join from "./routes/Join.jsx";

export default function App() {
  const { pathname } = useLocation();
  const hideHeader = pathname.startsWith("/go/");

  return (
    <div className="app">
      {!hideHeader && (
        <header className="header">
          <h1 className="title">
            <NavLink to="/" end>
              Quizz
            </NavLink>
          </h1>
        </header>
      )}

      <main className="main">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/start" element={<Start />} />
          <Route path="/start/:quizzId" element={<Start />} />
          <Route path="/start/:quizzId/:phase" element={<Start />} />
          <Route path="/go/:quizzId" element={<Join />} />
        </Routes>
      </main>
    </div>
  );
}
