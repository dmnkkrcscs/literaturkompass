import { redirect } from 'next/navigation'

export default async function GeplantDetailRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/wettbewerb/${id}`)
}
