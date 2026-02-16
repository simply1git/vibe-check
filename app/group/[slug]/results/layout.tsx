import { Metadata } from 'next'

export async function generateMetadata({
  params,
}: {
  params: { slug: string }
}): Promise<Metadata> {
  const groupName = decodeURIComponent(params.slug)
    .replace(/-/g, ' ')
    .replace(/\b\w/g, c => c.toUpperCase())

  const title = `Results: ${groupName}`
  const description = `See the results for ${groupName} on Vibe Check. Who is the most compatible?`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [
        {
          url: `/api/og?title=${encodeURIComponent(title)}`,
          width: 1200,
          height: 630,
          alt: title,
        },
      ],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [`/api/og?title=${encodeURIComponent(title)}`],
    },
  }
}

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return children
}
