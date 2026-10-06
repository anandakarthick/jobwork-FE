import { useEffect } from 'react';
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { SettingsProvider } from './context/SettingsContext';
import { useAppDispatch, useAppSelector } from './store/hooks';
import { fetchAppSettings } from './store/appSettingsSlice';
import { applyTheme } from './lib/theme';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import RequirePermission from './components/RequirePermission';
import Dashboard from './pages/Dashboard';
import JobWork from './pages/jobwork/JobWork';
import CategoriesList from './pages/categories/CategoriesList';
import CategoryForm from './pages/categories/CategoryForm';
import CategoryView from './pages/categories/CategoryView';
import CompaniesList from './pages/companies/CompaniesList';
import CompanyForm from './pages/companies/CompanyForm';
import CompanyView from './pages/companies/CompanyView';
import CustomersList from './pages/customers/CustomersList';
import CustomerForm from './pages/customers/CustomerForm';
import CustomerView from './pages/customers/CustomerView';
import RolesList from './pages/roles/RolesList';
import RoleForm from './pages/roles/RoleForm';
import UsersList from './pages/users/UsersList';
import UserForm from './pages/users/UserForm';
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import Settings from './pages/settings/Settings';
import ChangePassword from './pages/ChangePassword';
import DialogHost from './components/ui/Dialog';

export default function App() {
  const dispatch = useAppDispatch();
  const appName = useAppSelector((s) => s.appSettings.appName);
  const themeColor = useAppSelector((s) => s.appSettings.themeColor);

  // Load branding once (public), and keep the browser tab title in sync.
  useEffect(() => {
    void dispatch(fetchAppSettings());
  }, [dispatch]);
  useEffect(() => {
    document.title = appName || 'Jobwork';
  }, [appName]);
  // Apply the accent-color theme app-wide (recolors brand-* utilities).
  useEffect(() => {
    applyTheme(themeColor);
  }, [themeColor]);

  return (
    <BrowserRouter>
      <AuthProvider>
        <SettingsProvider>
          {/* App-wide confirm / alert dialogs (replaces window.confirm / alert). */}
          <DialogHost />
          <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />

          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Dashboard />} />
              <Route path="/jobwork" element={<RequirePermission permission="jobwork.view"><JobWork /></RequirePermission>} />

              <Route path="/categories" element={<RequirePermission permission="categories.view"><CategoriesList /></RequirePermission>} />
              <Route path="/categories/new" element={<RequirePermission permission="categories.create"><CategoryForm /></RequirePermission>} />
              <Route path="/categories/:id" element={<RequirePermission permission="categories.view"><CategoryView /></RequirePermission>} />
              <Route path="/categories/:id/edit" element={<RequirePermission permission="categories.edit"><CategoryForm /></RequirePermission>} />

              <Route path="/companies" element={<RequirePermission permission="companies.view"><CompaniesList /></RequirePermission>} />
              <Route path="/companies/new" element={<RequirePermission permission="companies.create"><CompanyForm /></RequirePermission>} />
              <Route path="/companies/:id" element={<RequirePermission permission="companies.view"><CompanyView /></RequirePermission>} />
              <Route path="/companies/:id/edit" element={<RequirePermission permission="companies.edit"><CompanyForm /></RequirePermission>} />

              <Route path="/customers" element={<RequirePermission permission="customers.view"><CustomersList /></RequirePermission>} />
              <Route path="/customers/new" element={<RequirePermission permission="customers.create"><CustomerForm /></RequirePermission>} />
              <Route path="/customers/:id" element={<RequirePermission permission="customers.view"><CustomerView /></RequirePermission>} />
              <Route path="/customers/:id/edit" element={<RequirePermission permission="customers.edit"><CustomerForm /></RequirePermission>} />

              <Route path="/roles" element={<RequirePermission permission="roles.view"><RolesList /></RequirePermission>} />
              <Route path="/roles/new" element={<RequirePermission permission="roles.create"><RoleForm /></RequirePermission>} />
              <Route path="/roles/:id/edit" element={<RequirePermission permission="roles.edit"><RoleForm /></RequirePermission>} />

              <Route path="/users" element={<RequirePermission permission="users.view"><UsersList /></RequirePermission>} />
              <Route path="/users/new" element={<RequirePermission permission="users.create"><UserForm /></RequirePermission>} />
              <Route path="/users/:id/edit" element={<RequirePermission permission="users.edit"><UserForm /></RequirePermission>} />

              {/* Any signed-in user can open Settings — only their Profile shows unless
                  they have the relevant permissions for the admin sections. */}
              <Route path="/settings" element={<Settings />} />
              <Route path="/change-password" element={<ChangePassword />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </SettingsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
