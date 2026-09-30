import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = '' }: CardProps) {
  return <div className={`card ${className}`}>{children}</div>;
}

interface CardHeaderProps {
  title: ReactNode;
  action?: ReactNode;
}

export function CardHeader({ title, action }: CardHeaderProps) {
  return (
    <div className="card-header">
      <h2 className="card-title">{title}</h2>
      {action}
    </div>
  );
}

export function CardBody({ children, className = '' }: CardProps) {
  return <div className={`card-body ${className}`}>{children}</div>;
}
