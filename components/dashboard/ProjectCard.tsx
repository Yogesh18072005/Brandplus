import Link from 'next/link';

interface ProjectCardProps {
  id: string;
  businessName: string;
  category: string;
  city: string;
  website: string;
}

export function ProjectCard({ id, businessName, category, city, website }: ProjectCardProps) {
  const initial = businessName.trim().charAt(0).toUpperCase() || '·';
  return (
    <Link href={`/dashboard/projects/${id}`} className="zw-business">
      <span className="zw-business-initial" aria-hidden="true">{initial}</span>
      <span className="zw-business-text">
        <strong>{businessName}</strong>
        <span>{[category, city].filter(Boolean).join(' · ')}</span>
        <code>{website.replace(/^https?:\/\//, '')}</code>
      </span>
      <span className="zw-round-link is-light" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="M5 15 15 5M8 5h7v7" /></svg></span>
    </Link>
  );
}
