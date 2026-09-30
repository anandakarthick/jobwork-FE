import type { ReactNode } from 'react';
import { useAuth } from '../context/AuthContext';
import AccessDenied from './AccessDenied';

/** Renders children only if the user has `permission`; otherwise Access Denied. */
export default function RequirePermission({
  permission,
  children,
}: {
  permission: string;
  children: ReactNode;
}) {
  const { can } = useAuth();
  if (!can(permission)) return <AccessDenied />;
  return <>{children}</>;
}
