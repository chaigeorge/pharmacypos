'use client';
import { Inter } from 'next/font/google';
import './globals.css';
import { Toaster } from 'react-hot-toast';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: { queries: { retry: 1, staleTime: 30000 } },
  }));

  return (
    <html lang="en">
      <body className={inter.variable}>
        <QueryClientProvider client={queryClient}>
          {children}
          <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
        </QueryClientProvider>
      </body>
    </html>
  );
}
