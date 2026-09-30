import { useNavigate } from 'react-router-dom';
import { LockIcon } from './icons';

/** Shown in the content area when the user lacks permission for a page. */
export default function AccessDenied() {
  const navigate = useNavigate();
  return (
    <div className="card mx-auto mt-8 max-w-lg">
      <div className="flex flex-col items-center px-6 py-14 text-center">
        <span className="mb-4 grid h-14 w-14 place-items-center rounded-full bg-red-50 text-red-500">
          <LockIcon className="h-6 w-6" />
        </span>
        <h1 className="text-lg font-semibold text-slate-900">Access denied</h1>
        <p className="mt-1 max-w-sm text-sm text-slate-500">
          You don't have permission to view this page. If you think this is a mistake, contact an
          administrator.
        </p>
        <button type="button" className="btn-primary mt-6" onClick={() => navigate('/')}>
          Back to dashboard
        </button>
      </div>
    </div>
  );
}
