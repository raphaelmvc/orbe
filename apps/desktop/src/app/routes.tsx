import { Navigate, Route, Routes } from 'react-router-dom';
import {
  ArrowLeftRight,
  BarChart3,
  CreditCard,
  Home,
  PiggyBank,
  Repeat,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

import './App.css';

export type IconComponent = LucideIcon;

export interface NavItemConfig {
  readonly label: string;
  readonly path: string;
  readonly icon: IconComponent;
}

export interface NavGroupConfig {
  readonly label: string;
  readonly items: readonly NavItemConfig[];
}

export const NAV_GROUPS: readonly NavGroupConfig[] = [
  {
    label: 'Principal',
    items: [
      { label: 'Início', path: '/', icon: Home },
      { label: 'Transações', path: '/transacoes', icon: ArrowLeftRight },
      { label: 'Contas', path: '/contas', icon: Wallet },
      { label: 'Cartões', path: '/cartoes', icon: CreditCard },
    ],
  },
  {
    label: 'Planejamento',
    items: [
      { label: 'Recorrências', path: '/recorrencias', icon: Repeat },
      { label: 'Orçamentos', path: '/orcamentos', icon: PiggyBank },
    ],
  },
  {
    label: 'Análise',
    items: [{ label: 'Relatórios', path: '/relatorios', icon: BarChart3 }],
  },
];

function InicioPage() {
  return (
    <div className="empty-state">
      <div className="orbit-illustration" aria-hidden="true">
        <span />
      </div>
      <p className="eyebrow">Seu espaço financeiro</p>
      <h1>Comece no seu ritmo.</h1>
      <p id="empty-state-description" className="empty-state-copy">
        O Orbe está pronto para organizar suas contas quando você estiver.
      </p>
      <button type="button" aria-describedby="empty-state-description">
        Configurar depois
      </button>
    </div>
  );
}

interface UpcomingPageProps {
  readonly title: string;
  readonly description: string;
}

function UpcomingPage({ title, description }: UpcomingPageProps) {
  return (
    <div className="empty-state">
      <p className="eyebrow">Em construção</p>
      <h1>{title}</h1>
      <p className="empty-state-copy">{description}</p>
    </div>
  );
}

export function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<InicioPage />} />
      <Route
        path="/transacoes"
        element={
          <UpcomingPage
            title="Transações"
            description="O histórico de transações chega em uma tarefa futura desta etapa."
          />
        }
      />
      <Route
        path="/contas"
        element={
          <UpcomingPage
            title="Contas"
            description="O cadastro de contas chega em uma tarefa futura desta etapa."
          />
        }
      />
      <Route
        path="/cartoes"
        element={
          <UpcomingPage
            title="Cartões"
            description="Cartões, faturas e parcelas chegam em um milestone futuro."
          />
        }
      />
      <Route
        path="/recorrencias"
        element={
          <UpcomingPage
            title="Recorrências"
            description="Despesas e contas recorrentes chegam em um milestone futuro."
          />
        }
      />
      <Route
        path="/orcamentos"
        element={
          <UpcomingPage
            title="Orçamentos"
            description="Orçamentos por categoria chegam em um milestone futuro."
          />
        }
      />
      <Route
        path="/relatorios"
        element={
          <UpcomingPage
            title="Relatórios"
            description="Relatórios e exportações chegam em um milestone futuro."
          />
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
