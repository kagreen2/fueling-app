import ResourceAssignmentManager from '@/components/ResourceAssignmentManager'

export const dynamic = 'force-dynamic'

export default async function CoachAthleteResourcesPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <ResourceAssignmentManager athleteId={id} />
}
