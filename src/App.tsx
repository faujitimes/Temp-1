/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Layout } from "./components/layout/Layout";
import { Home } from "./pages/Home";
import { Circulars } from "./pages/Circulars";
import { News } from "./pages/News";
import { Welfare } from "./pages/Welfare";
import { About } from "./pages/About";
import { Contact } from "./pages/Contact";
import { Admin } from "./pages/Admin";
import { CategoryPage } from "./pages/CategoryPage";
import { SearchPage } from "./pages/SearchPage";
import { ArticleDetailPage } from "./pages/ArticleDetailPage";
import { ContentProvider } from "./context/ContentContext";
import { ErrorBoundary } from "./components/ErrorBoundary";

export default function App() {
  return (
    <ErrorBoundary>
      <ContentProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Home />} />
              <Route path="category/:slug" element={<CategoryPage />} />
              <Route path="search" element={<SearchPage />} />
              <Route path="article/:slug" element={<ArticleDetailPage />} />
              <Route path="circulars" element={<Circulars />} />
              <Route path="news" element={<News />} />
              <Route path="schemes" element={<Welfare />} />
              <Route path="about" element={<About />} />
              <Route path="contact" element={<Contact />} />
              <Route path="admin" element={<Admin />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </ContentProvider>
    </ErrorBoundary>
  );
}
