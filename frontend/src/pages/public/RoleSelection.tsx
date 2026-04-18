import { useNavigate } from 'react-router-dom'
import { Logo } from '../../components/ui/Logo'
import { Droplets, Hospital } from 'lucide-react'

export function RoleSelection() {
  const navigate = useNavigate()

  return (
    <div className="min-h-screen bg-bg-base flex flex-col items-center justify-center">
      <div className="flex flex-col items-center gap-10">
        <Logo size="lg" />

        <div className="flex gap-3">
          <button
            onClick={() => navigate('/login/donor')}
            className="flex flex-col items-start gap-4 w-[180px] px-5 py-5 rounded-md text-left transition-all duration-150 ease-out"
            style={{
              backgroundColor: '#141414',
              border: '1px solid #333',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#444';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#141414';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#333';
            }}
          >
            <Droplets size={18} className="text-red-accent" />
            <div>
              <p className="font-heading font-semibold text-text-primary text-[14px]">Donor</p>
              <p className="text-text-tertiary text-[12px] mt-0.5">Donate blood</p>
            </div>
          </button>

          <button
            onClick={() => navigate('/login/hospital')}
            className="flex flex-col items-start gap-4 w-[180px] px-5 py-5 rounded-md text-left transition-all duration-150 ease-out"
            style={{
              backgroundColor: '#141414',
              border: '1px solid #333',
            }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#1A1A1A';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#444';
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLButtonElement).style.backgroundColor = '#141414';
              (e.currentTarget as HTMLButtonElement).style.borderColor = '#333';
            }}
          >
            <Hospital size={18} className="text-text-secondary" />
            <div>
              <p className="font-heading font-semibold text-text-primary text-[14px]">Hospital</p>
              <p className="text-text-tertiary text-[12px] mt-0.5">Manage requests</p>
            </div>
          </button>
        </div>
      </div>
    </div>
  )
}
