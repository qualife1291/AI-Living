import type { Metadata } from 'next';
import './globals.css';
import { Diagnostics } from '../components/Diagnostics';

export const metadata: Metadata = {
  title: 'Xóm AI · Thành phố nhỏ, nhiều cuộc đời',
  description:
    'Khám phá thành phố 3D mô phỏng, gặp gỡ cư dân và theo dõi những thói quen được học từ trải nghiệm.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}<Diagnostics /></body>
    </html>
  );
}
