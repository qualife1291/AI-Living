import type { Metadata } from 'next';
import './globals.css';
export const metadata: Metadata = {title:'Xóm AI · Chuyện nhỏ mỗi ngày',description:'Ba người bạn, một khu trọ nhỏ và những câu chuyện tiếp nối.'};
export default function RootLayout({children}:Readonly<{children:React.ReactNode}>){return <html lang="vi"><body>{children}</body></html>}
