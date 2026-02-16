import type { Metadata } from 'next'

type Props = {
  params: { slug: string }
}

export async function generateMetadata(
  { params }: Props
): Promise<Metadata> {
  // Decode the slug to handle spaces/special chars properly
  const groupName = decodeURIComponent(params.slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase()) // Capitalize Words

  const title = `${groupName}'s Vibe Check`
  const description = `Join ${groupName} on Vibe Check. Find out who really knows the group best.`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(groupName)}`,
          width: 1200,
          height: 630,
          alt: `${groupName}'s Vibe Check`,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og?title=${encodeURIComponent(groupName)}`],
    },
  }
}

export default function GroupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
