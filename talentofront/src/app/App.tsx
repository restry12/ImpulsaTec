import { RouterProvider } from 'react-router';
import { router } from './routes';
import { ProveedorAuth } from './context/AuthContext';
import { Toaster } from 'sonner';

export default function App() {
  return (
    <ProveedorAuth>
      <RouterProvider router={router} />
      <Toaster richColors position="bottom-right" />
    </ProveedorAuth>
  );
}
