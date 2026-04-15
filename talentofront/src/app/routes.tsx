import { createBrowserRouter } from "react-router";
import { RootLayout } from "./components/RootLayout";
import { StudentDashboard } from "./components/StudentDashboard";
import { CompanyDashboard } from "./components/CompanyDashboard";
import { SchoolAdminPanel } from "./components/SchoolAdminPanel";
import { PublicDirectory } from "./components/PublicDirectory";
import { LoginPage } from "./components/LoginPage";
import { RegisterPage } from "./components/RegisterPage";
import { RutaProtegida } from "./components/RutaProtegida";
import { CompanyPublicPage } from "./components/CompanyPublicPage";

export const router = createBrowserRouter([
  {
    path: "/",
    Component: RootLayout,
    children: [
      { index: true, Component: PublicDirectory },
      { path: "login", Component: LoginPage },
      { path: "registro", Component: RegisterPage },
      { path: "empresas/:id", Component: CompanyPublicPage },
      {
        path: "estudiante",
        element: (
          <RutaProtegida rolesPermitidos={["ESTUDIANTE"]}>
            <StudentDashboard />
          </RutaProtegida>
        ),
      },
      {
        path: "empresa",
        element: (
          <RutaProtegida rolesPermitidos={["EMPRESA"]}>
            <CompanyDashboard />
          </RutaProtegida>
        ),
      },
      {
        path: "colegio",
        element: (
          <RutaProtegida rolesPermitidos={["ADMINISTRADOR"]}>
            <SchoolAdminPanel />
          </RutaProtegida>
        ),
      },
    ],
  },
]);
