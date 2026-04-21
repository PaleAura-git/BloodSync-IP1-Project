interface IconProps {
  size?: number
  className?: string
  stroke?: number
  fill?: string
}

function Icon({ path, size = 16, className = '', stroke = 1.5, fill = 'none' }: IconProps & { path: React.ReactNode }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill={fill} stroke="currentColor"
      strokeWidth={stroke} strokeLinecap="round" strokeLinejoin="round" className={className}>
      {path}
    </svg>
  )
}

export const Icons = {
  Droplet: (p: IconProps) => <Icon {...p} fill="currentColor" stroke={0} path={<path d="M12 2s7 8 7 13a7 7 0 1 1-14 0c0-5 7-13 7-13z"/>}/>,
  Home: (p: IconProps) => <Icon {...p} path={<><path d="M3 11.5 12 4l9 7.5"/><path d="M5 10v10h14V10"/></>}/>,
  User: (p: IconProps) => <Icon {...p} path={<><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></>}/>,
  Calendar: (p: IconProps) => <Icon {...p} path={<><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/></>}/>,
  Bell: (p: IconProps) => <Icon {...p} path={<><path d="M6 16V11a6 6 0 1 1 12 0v5l2 3H4l2-3z"/><path d="M10 20a2 2 0 0 0 4 0"/></>}/>,
  Search: (p: IconProps) => <Icon {...p} path={<><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></>}/>,
  Shield: (p: IconProps) => <Icon {...p} path={<path d="M12 3 4 6v6c0 4 3.4 8 8 9 4.6-1 8-5 8-9V6l-8-3z"/>}/>,
  Hospital: (p: IconProps) => <Icon {...p} path={<><path d="M4 21V7l8-4 8 4v14"/><path d="M9 21v-6h6v6M12 9v4M10 11h4"/></>}/>,
  Zap: (p: IconProps) => <Icon {...p} path={<path d="M13 2 3 14h7l-1 8 10-12h-7l1-8z"/>}/>,
  Check: (p: IconProps) => <Icon {...p} path={<path d="m5 12 5 5L20 7"/>}/>,
  X: (p: IconProps) => <Icon {...p} path={<><path d="M6 6l12 12"/><path d="M18 6 6 18"/></>}/>,
  Plus: (p: IconProps) => <Icon {...p} path={<><path d="M12 5v14"/><path d="M5 12h14"/></>}/>,
  Menu: (p: IconProps) => <Icon {...p} path={<><path d="M4 7h16"/><path d="M4 12h16"/><path d="M4 17h16"/></>}/>,
  Pin: (p: IconProps) => <Icon {...p} path={<><path d="M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13s-7-8-7-13a7 7 0 0 1 7-7z"/><circle cx="12" cy="9" r="2.5"/></>}/>,
  Clock: (p: IconProps) => <Icon {...p} path={<><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>}/>,
  Arrow: (p: IconProps) => <Icon {...p} path={<path d="M5 12h14m-5-5 5 5-5 5"/>}/>,
  ArrowLeft: (p: IconProps) => <Icon {...p} path={<path d="M19 12H5m5 5-5-5 5-5"/>}/>,
  Chev: (p: IconProps) => <Icon {...p} path={<path d="m9 6 6 6-6 6"/>}/>,
  Filter: (p: IconProps) => <Icon {...p} path={<path d="M3 5h18l-7 9v5l-4 2v-7L3 5z"/>}/>,
  Phone: (p: IconProps) => <Icon {...p} path={<path d="M5 4h3l2 5-2 1a11 11 0 0 0 6 6l1-2 5 2v3a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2z"/>}/>,
  Mail: (p: IconProps) => <Icon {...p} path={<><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 7 9-7"/></>}/>,
  Sparkle: (p: IconProps) => <Icon {...p} path={<path d="M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2 2M16 16l2 2M6 18l2-2M16 8l2-2"/>}/>,
  Heart: (p: IconProps) => <Icon {...p} path={<path d="M12 20s-7-4.5-7-11a4 4 0 0 1 7-2.6A4 4 0 0 1 19 9c0 6.5-7 11-7 11z"/>}/>,
  Logout: (p: IconProps) => <Icon {...p} path={<><path d="M10 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5"/><path d="m16 17 5-5-5-5M21 12H10"/></>}/>,
  Dot: (p: IconProps) => <Icon {...p} fill="currentColor" stroke={0} path={<circle cx="12" cy="12" r="5"/>}/>,
  Eye: (p: IconProps) => <Icon {...p} path={<><path d="M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z"/><circle cx="12" cy="12" r="3"/></>}/>,
  Camera: (p: IconProps) => <Icon {...p} path={<><path d="M4 7h3l2-3h6l2 3h3a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1z"/><circle cx="12" cy="13" r="4"/></>}/>,
  Download: (p: IconProps) => <Icon {...p} path={<><path d="M12 3v13m0 0-5-5m5 5 5-5"/><path d="M4 21h16"/></>}/>,
}
