export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #0F172A 0%, #1E3A5F 50%, #0F172A 100%)' }}>
      {children}
    </div>
  )
}
