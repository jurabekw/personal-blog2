import type { Metadata } from 'next'
import { TermArchive, termMetadata } from '@/components/site/TermArchive'
import type { Script } from '@/lib/alphabet'

type Props = { params: Promise<{ path: string[] }> }

export function categoryStaticParams() {
  return []
}

export async function metadataCategory(script: Script, { params }: Props): Promise<Metadata> {
  return termMetadata('category', (await params).path, script)
}

export async function renderCategory(script: Script, { params }: Props) {
  return <TermArchive taxonomy="category" segments={(await params).path} script={script} />
}
