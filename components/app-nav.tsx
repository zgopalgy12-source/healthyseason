"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Camera, ChartNoAxesColumnIncreasing, House, ScanLine, UserRound } from "lucide-react";

const links = [
  { label: "Hoje", path: "/hoje", Icon: House },
  { label: "Scanner", Icon: ScanLine },
  { label: "Foto", Icon: Camera },
  { label: "Progresso", Icon: ChartNoAxesColumnIncreasing },
  { label: "Perfil", path: "/perfil", Icon: UserRound },
];

export function AppNav() {
  const pathname = usePathname();
  return <nav className="app-nav" aria-label="Navegação da aplicação">
    <ul className="shell">{links.map(({ label, path, Icon }) => <li key={label}>
      {path ? <Link href={path} aria-current={pathname === path ? "page" : undefined}>
        <Icon size={21} aria-hidden="true" /><span>{label}</span>
      </Link> : <span className="nav-unavailable" aria-disabled="true" title="Disponível numa próxima fase">
        <Icon size={21} aria-hidden="true" /><span>{label}<span className="sr-only"> (em breve)</span></span>
      </span>}
    </li>)}</ul>
  </nav>;
}
