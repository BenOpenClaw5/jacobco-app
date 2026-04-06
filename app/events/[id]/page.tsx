export const dynamic = 'force-dynamic';

import EventBoard from '@/components/EventBoard';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function EventPage({ params }: PageProps) {
  const { id } = await params;
  return <EventBoard eventId={id} />;
}
