import { createBrowserRouter, Navigate, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ExchangesPage } from "./pages/ExchangesPage";
import { HomePage } from "./pages/HomePage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { LegalPage } from "./pages/LegalPage";
import { MyItemsPage } from "./pages/MyItemsPage";
import { ProfilePage } from "./pages/ProfilePage";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/auth", element: <AuthPage /> },
  { path: "/auth/:mode", element: <AuthPage /> },
  { path: "/verify-email", element: <Navigate to="/profile" replace /> },
  { path: "/privacy", element: <LegalPage /> },
  { path: "/terms", element: <LegalPage /> },
  { path: "/imprint", element: <LegalPage /> },
  {
    element: <AppShell />,
    children: [{
      path: "/browse",
      element: <BrowsePage />,
    }, {
      path: "/items/:id",
      element: <ItemDetailPage />,
    }, {
      element: <ProtectedRoute />,
      children: [
        { path: "/items/new", element: <Navigate to="/my/items?add=1" replace /> },
        { path: "/my/items", element: <MyItemsPage /> },
        { path: "/my/exchanges", element: <ExchangesPage /> },
        { path: "/profile", element: <ProfilePage /> },
      ],
    }],
  },
  { path: "*", element: <HomePage /> },
]);

export function App() {
  return <RouterProvider router={router} />;
}
