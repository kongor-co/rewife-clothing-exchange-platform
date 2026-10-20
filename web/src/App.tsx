import { createBrowserRouter, RouterProvider } from "react-router-dom";
import { AppShell } from "./components/AppShell";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { AuthPage } from "./pages/AuthPage";
import { BrowsePage } from "./pages/BrowsePage";
import { ExchangesPage } from "./pages/ExchangesPage";
import { HomePage } from "./pages/HomePage";
import { ItemDetailPage } from "./pages/ItemDetailPage";
import { ItemFormPage } from "./pages/ItemFormPage";
import { LegalPage } from "./pages/LegalPage";
import { MyItemsPage } from "./pages/MyItemsPage";
import { ProfilePage } from "./pages/ProfilePage";
import { VerifyEmailPage } from "./pages/VerifyEmailPage";

const router = createBrowserRouter([
  { path: "/", element: <HomePage /> },
  { path: "/auth", element: <AuthPage /> },
  { path: "/verify-email", element: <VerifyEmailPage /> },
  { path: "/privacy", element: <LegalPage /> },
  { path: "/terms", element: <LegalPage /> },
  { path: "/imprint", element: <LegalPage /> },
  {
    element: <ProtectedRoute />,
    children: [{
      element: <AppShell />,
      children: [
        { path: "/browse", element: <BrowsePage /> },
        { path: "/items/new", element: <ItemFormPage /> },
        { path: "/items/:id", element: <ItemDetailPage /> },
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
